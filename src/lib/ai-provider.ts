import { db } from "@/db";
import { aiProviders, aiUsageLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { OpenAI } from "openai";

export type AIResponse = {
  message: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
};

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * AI Provider Manager
 * Handles multi-provider support with fallback and usage logging
 */
export class AIProviderManager {
  private static instance: AIProviderManager;
  
  private constructor() {}

  public static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }
    return AIProviderManager.instance;
  }

  /**
   * Get active providers from database, ordered by priority
   */
  private async getActiveProviders() {
    return await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.isActive, true))
      .orderBy(desc(aiProviders.priority));
  }

  /**
   * Generate completion with fallback support
   */
  public async chat(
    userId: number,
    messages: AIMessage[],
    taskType: string = "chat"
  ): Promise<AIResponse> {
    const providers = await this.getActiveProviders();
    
    if (providers.length === 0) {
      // Fallback to environment variables if no DB config
      return this.chatWithEnv(userId, messages);
    }

    let lastError: any = null;
    for (const provider of providers) {
      const startTime = Date.now();
      try {
        console.log(`[AI] Attempting ${provider.name} (${provider.model})...`);
        const response = await this.callProvider(provider, messages);
        this.logUsage(userId, provider.name, provider.model, Date.now() - startTime, "success", response.usage);
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`[AI] ${provider.name} failed:`, error.message || error);
        this.logUsage(userId, provider.name, provider.model, Date.now() - startTime, "error", undefined, error.message);
        continue;
      }
    }

    throw lastError || new Error("All AI providers failed");
  }

  /**
   * Call specific provider API
   */
  private async callProvider(provider: any, messages: AIMessage[]): Promise<AIResponse> {
    const { name, apiKey, model } = provider;

    if (name === "openai" || name === "openrouter") {
      const baseURL = name === "openrouter" ? "https://openrouter.ai/api/v1" : undefined;
      const client = new OpenAI({ apiKey, baseURL });
      
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });

      const choice = completion.choices[0];
      return {
        message: choice.message.content || "",
        provider: name,
        model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
        } : undefined,
      };
    }

    if (name === "gemini") {
      // Simple fetch implementation for Gemini to avoid extra heavy dependencies
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: messages.map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            })),
            generationConfig: { temperature: 0.7 }
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Gemini API error");
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      return {
        message: text,
        provider: "gemini",
        model,
      };
    }

    throw new Error(`Unsupported AI provider: ${name}`);
  }

  /**
   * Fallback to environment variables with full support for OpenAI, Gemini, and OpenRouter
   */
  private async chatWithEnv(userId: number, messages: AIMessage[]): Promise<AIResponse> {
    const providers = [
      { name: "openrouter", apiKey: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5" },
      { name: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4o-mini" },
      { name: "gemini", apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-1.5-flash" }
    ].filter(p => !!p.apiKey);

    if (providers.length === 0) {
      throw new Error("No AI provider configured in environment variables");
    }

    let lastError: any = null;
    for (const provider of providers) {
      const startTime = Date.now();
      try {
        const response = await this.callProvider(provider, messages);
        
        // Log usage (fire and forget)
        this.logUsage(userId, provider.name, provider.model, Date.now() - startTime, "success", response.usage);
        
        return response;
      } catch (error: any) {
        lastError = error;
        this.logUsage(userId, provider.name, provider.model, Date.now() - startTime, "error", undefined, error.message);
        continue;
      }
    }

    throw lastError || new Error("All environment AI providers failed");
  }

  /**
   * Safe usage logging that doesn't break the main flow
   */
  private logUsage(userId: number, provider: string, model: string, latency: number, status: string, usage?: any, error?: string) {
    db.insert(aiUsageLogs).values({
      userId,
      provider,
      model,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      latencyMs: latency,
      status,
      error
    }).catch(e => console.warn("[AI] Usage log failed (silent):", e.message));
  }
}
