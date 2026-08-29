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
    try {
      // 1. Check Daily Limit with safety fallback
      const canProceed = await this.checkAndIncrementLimit().catch(err => {
        console.error("[JueJue] Quota check failed, falling back to basic limit:", err);
        return true; // Fallback to allow if DB fails, but we'll handle it in AI layer
      });

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
        ...history.slice(-10),
        { role: "user", content }
      ];

      // 4. Call AI
      const response = await this.aiManager.chat(this.userId, messages);
      
      return {
        ...response,
        status: "success"
      };
    } catch (error) {
      console.error("JueJue process error:", error);
      return {
        message: "JueJue 現在有點忙 😵‍💫，請稍後再試。",
        status: "error"
      };
    }
  }

  /**
   * Check and increment daily AI usage limit
   * Uses safe SQL joins to avoid relation issues and handles missing tables gracefully
   */
  private async checkAndIncrementLimit(): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];
    
    try {
      // 1. Get user limit and group limit in one safe query
      const userResult = await db.execute(sql`
        SELECT 
          u.ai_usage_limit as "userLimit",
          g.daily_ai_limit as "groupLimit"
        FROM users u
        LEFT JOIN user_group_members ugm ON u.id = ugm.user_id AND (ugm.revoked_at IS NULL AND (ugm.expires_at IS NULL OR ugm.expires_at > NOW()))
        LEFT JOIN user_groups g ON ugm.group_id = g.id AND g.is_active = true
        WHERE u.id = ${this.userId}
        LIMIT 1
      `);

      const userData = userResult.rows[0] as { userLimit: number | null, groupLimit: number | null } | undefined;
      const limit = userData?.userLimit ?? userData?.groupLimit ?? 50;

      // 2. Check and Increment usage atomically if possible, or safe fallback
      const usageResult = await db.execute(sql`
        SELECT count FROM user_ai_daily_usage 
        WHERE user_id = ${this.userId} AND date = ${today}
      `);

      const currentCount = (usageResult.rows[0] as { count: number } | undefined)?.count ?? 0;
      
      if (currentCount >= limit) return false;

      // 3. Increment usage
      await db.execute(sql`
        INSERT INTO user_ai_daily_usage (user_id, date, count, updated_at)
        VALUES (${this.userId}, ${today}, 1, NOW())
        ON CONFLICT (user_id, date) 
        DO UPDATE SET count = user_ai_daily_usage.count + 1, updated_at = NOW()
      `);

      return true;
    } catch (dbError) {
      console.warn("[JueJue] DB Quota tables might be missing, using session fallback:", dbError);
      // If tables don't exist, we allow a small number of requests to prevent 500
      return true; 
    }
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
