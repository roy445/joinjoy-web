import { db } from "@/db";
import { aiProviders, aiUsageLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

type ProviderConfig = {
  name: string;
  model: string;
  priority?: number;
  apiKey?: string;
};

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

function normalizeGeminiModel(model: string | undefined): string {
  const normalized = (model || DEFAULT_GEMINI_MODEL).trim().replace(/^models\//, "");

  // Gemini 1.5/2.0 已停止或即將停止服務；保留舊資料庫設定的相容轉換，
  // 避免既有設定讓整個 JueJue 請求直接收到 404。
  if (normalized === "gemini-1.5-flash" || normalized.startsWith("gemini-1.5-flash-")) {
    return DEFAULT_GEMINI_MODEL;
  }
  if (normalized === "gemini-2.0-flash" || normalized.startsWith("gemini-2.0-flash-")) {
    return DEFAULT_GEMINI_MODEL;
  }
  if (normalized === "gemini-2.5-flash-lite") {
    return DEFAULT_GEMINI_MODEL;
  }

  return normalized;
}

function envKeyForProvider(name: string): string | undefined {
  return name === "gemini" ? process.env.GEMINI_API_KEY : undefined;
}

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
  private async getActiveProviders(): Promise<ProviderConfig[]> {
    const configured = await db
      .select({
        name: aiProviders.name,
        model: aiProviders.model,
        priority: aiProviders.priority,
        isActive: aiProviders.isActive,
      })
      .from(aiProviders)
      .where(eq(aiProviders.isActive, true))
      .orderBy(desc(aiProviders.priority));

    // API keys are deliberately never read from or written to the database.
    // The database stores routing metadata only; secrets remain Vercel server env vars.
    return configured
      .map((provider) => ({
        name: provider.name.toLowerCase(),
        model: normalizeGeminiModel(provider.model),
        priority: provider.priority,
        apiKey: envKeyForProvider(provider.name.toLowerCase()),
      }))
      .filter((provider) => provider.name === "gemini" && Boolean(provider.apiKey));
  }

  /**
   * Generate completion with fallback support
   */
  public async chat(
    userId: number,
    messages: AIMessage[],
    taskType: string = "chat"
  ): Promise<AIResponse> {
    let providers: ProviderConfig[] = [];
    try {
      providers = await this.getActiveProviders();
    } catch (error) {
      // A partially migrated database must not take JueJue offline.
      console.warn("[AI] Provider metadata unavailable; using environment fallback.", error);
    }

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
  private async callProvider(provider: ProviderConfig, messages: AIMessage[]): Promise<AIResponse> {
    const { name, apiKey, model } = provider;

    if (!apiKey) {
      throw new Error(`Missing server configuration for ${name}`);
    }

    if (name === "gemini") {
      // Gemini REST path requires models/{model}; normalize old settings first.
      const geminiModel = normalizeGeminiModel(model);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
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
        model: geminiModel,
        };
    }

    throw new Error(`Unsupported AI provider: ${name}`);
  }

  /**
   * Environment fallback using Gemini only.
   */
  private async chatWithEnv(userId: number, messages: AIMessage[]): Promise<AIResponse> {
    const providers = [
      { name: "gemini", apiKey: process.env.GEMINI_API_KEY, model: normalizeGeminiModel(process.env.GEMINI_MODEL) }
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
