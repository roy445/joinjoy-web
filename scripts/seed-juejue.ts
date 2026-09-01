import { db } from "../src/db";
import { aiProviders, userGroups } from "../src/db/schema";

async function main() {
  console.log("🌱 Seeding JueJue system...");

  // 1. Seed AI Providers
  const providers = [
    {
      name: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY || "placeholder",
      priority: 10,
      isActive: true,
    },
  ];

  for (const p of providers) {
    await db.insert(aiProviders).values(p).onConflictDoUpdate({
      target: aiProviders.name,
      set: { model: p.model, priority: p.priority, isActive: p.isActive }
    });
  }
  console.log("✅ AI Providers seeded.");

  // 2. Seed User Groups
  const groups = [
    {
      name: "一般旅伴",
      icon: "User",
      color: "gray",
      dailyAiLimit: 20,
      jCoinBonus: 0,
    },
    {
      name: "活躍旅伴",
      icon: "Zap",
      color: "blue",
      dailyAiLimit: 50,
      jCoinBonus: 10,
    },
    {
      name: "社群菁英",
      icon: "Star",
      color: "amber",
      dailyAiLimit: 100,
      jCoinBonus: 25,
    },
    {
      name: "JoinJoy 傳奇",
      icon: "Crown",
      color: "purple",
      dailyAiLimit: 999,
      jCoinBonus: 50,
    },
  ];

  for (const g of groups) {
    await db.insert(userGroups).values(g).onConflictDoUpdate({
      target: userGroups.name,
      set: { dailyAiLimit: g.dailyAiLimit, jCoinBonus: g.jCoinBonus }
    });
  }
  console.log("✅ User Groups seeded.");

  console.log("✨ Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
