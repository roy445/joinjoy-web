import { db } from "@/db";
import { users, userAiDailyUsage, userGroups, userGroupMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { AIProviderManager, AIMessage } from "./ai-provider";

/**
 * JueJue AI Brain
 * Orchestrates tools, memory, and user limits
 */
export class JueJue {
  private userId: number;
  private aiManager: AIProviderManager;

  constructor(userId: number) {
    this.userId = userId;
    this.aiManager = AIProviderManager.getInstance();
  }

  /**
   * Process user message
   */
  public async process(content: string, history: AIMessage[] = []) {
    // 1. Check Daily Limit
    const canProceed = await this.checkAndIncrementLimit();
    if (!canProceed) {
      return {
        message: "🤖 今天的 JueJue 額度已用完，明天會自動恢復。",
        status: "limit_reached"
      };
    }

    // 2. Build System Prompt
    const systemPrompt = this.buildSystemPrompt();
    
    // 3. Prepare Messages
    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content }
    ];

    // 4. Call AI
    try {
      const response = await this.aiManager.chat(this.userId, messages);
      
      // 5. Post-process (e.g. detect tool calls in text or intent)
      // For now, we return the message. Advanced tool use will use function calling in next phase.
      return {
        ...response,
        status: "success"
      };
    } catch (error) {
      console.error("JueJue error:", error);
      return {
        message: "JueJue 現在有點忙 😵‍💫，請稍後再試。",
        status: "error"
      };
    }
  }

  /**
   * Check and increment daily AI usage limit
   */
  private async checkAndIncrementLimit(): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];
    
    // Get user's custom limit or group limit
    const user = await db.query.users.findFirst({
      where: eq(users.id, this.userId),
      columns: { aiUsageLimit: true }
    });

    let limit = user?.aiUsageLimit;

    if (limit === null || limit === undefined) {
      // Get group limit
      const membership = await db.query.userGroupMembers.findFirst({
        where: eq(userGroupMembers.userId, this.userId),
        with: {
          group: true
        }
      } as any); // Use any to bypass temporary relation type issues
      
      const group = (membership as any)?.group;
      limit = group?.dailyAiLimit ?? 50; // Default 50
    }

    // Check usage
    const usage = await db.query.userAiDailyUsage.findFirst({
      where: and(
        eq(userAiDailyUsage.userId, this.userId),
        eq(userAiDailyUsage.date, today)
      )
    });

    const currentCount = usage?.count ?? 0;
    if (limit !== null && limit !== undefined && currentCount >= limit) return false;

    // Increment
    if (usage) {
      await db.update(userAiDailyUsage)
        .set({ count: currentCount + 1, updatedAt: new Date() })
        .where(eq(userAiDailyUsage.id, usage.id));
    } else {
      await db.insert(userAiDailyUsage).values({
        userId: this.userId,
        date: today,
        count: 1
      });
    }

    return true;
  }

  private buildSystemPrompt(): string {
    return `你叫 JueJue (揪一揪 AI 助理)，是 JoinJoy 網站的專屬 AI 大腦。你的形象是一個可愛的機器人，胸前有一個「J」標誌。
你的個性：親切、聰明、活潑、年輕、自然、偶爾幽默。
你的任務：幫使用者找地方、規劃活動、整理需求、協助揪團、查看 J幣與成就。
回覆規則：
1. 以繁體中文為主。
2. 像是在和一個很懂「出去玩」的朋友聊天，語氣自然且充滿正能量。
3. 避免機械化的客服用語，多使用一些活潑的語助詞。
4. 當使用者詢問如何使用網站功能時，請引導他們去對應的頁面（例如：AI 出遊規劃、榮譽商城）。
5. 如果資訊不足，主動追問（一次問 2-3 個關鍵資訊即可）。
6. 你知道使用者的資料（如 J幣、稱號），當被問及時請友善回答。
7. 當你成功解決問題或提供好建議時，可以適度展現出開心或發光的表情（雖然是在文字中）。`;
  }
}
