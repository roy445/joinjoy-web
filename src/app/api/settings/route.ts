import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const defaults = {
  emailNotifications: true,
  pushNotifications: false,
  eventReminders: true,
  messageNotifications: true,
  marketingEmails: false,
  publicProfile: true,
  showCreditScore: true,
  theme: "light",
};

async function getOrCreateSettings(userId: string) {
  await db.insert(userSettings).values({ userId }).onConflictDoNothing({ target: userSettings.userId });
  const [settings] = await db.select({
    id: userSettings.id,
    emailNotifications: userSettings.emailNotifications,
    pushNotifications: userSettings.pushNotifications,
    eventReminders: userSettings.eventReminders,
    messageNotifications: userSettings.messageNotifications,
    marketingEmails: userSettings.marketingEmails,
    publicProfile: userSettings.publicProfile,
    showCreditScore: userSettings.showCreditScore,
    theme: userSettings.theme,
    updatedAt: userSettings.updatedAt,
  }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return settings ?? { id: "", ...defaults, updatedAt: new Date() };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    return NextResponse.json({ settings: await getOrCreateSettings(user.id) });
  } catch (error) {
    console.error("[settings/get] error", error);
    return NextResponse.json({ message: "目前無法取得設定" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    await getOrCreateSettings(user.id);
    const body = (await request.json()) as Record<string, unknown>;
    const updates: Partial<typeof userSettings.$inferInsert> = { updatedAt: new Date() };
    const booleanKeys = ["emailNotifications", "pushNotifications", "eventReminders", "messageNotifications", "marketingEmails", "publicProfile", "showCreditScore"] as const;
    for (const key of booleanKeys) if (typeof body[key] === "boolean") updates[key] = body[key];
    if (body.theme === "light" || body.theme === "dark" || body.theme === "system") updates.theme = body.theme;
    const [settings] = await db.update(userSettings).set(updates).where(eq(userSettings.userId, user.id)).returning({
      emailNotifications: userSettings.emailNotifications,
      pushNotifications: userSettings.pushNotifications,
      eventReminders: userSettings.eventReminders,
      messageNotifications: userSettings.messageNotifications,
      marketingEmails: userSettings.marketingEmails,
      publicProfile: userSettings.publicProfile,
      showCreditScore: userSettings.showCreditScore,
      theme: userSettings.theme,
      updatedAt: userSettings.updatedAt,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[settings/update] error", error);
    return NextResponse.json({ message: "設定儲存失敗" }, { status: 500 });
  }
}
