import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { adminLogs, userGroupMembers, userGroups } from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { clientKey, isSameOrigin, rateLimit, sanitize } from "@/lib/security";

const MAX_DAILY_AI_LIMIT = 1000;
const MAX_BONUS_PERCENT = 100;

class InputError extends Error {}

function isMissingSchemaError(error: unknown) {
  const messages: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current && depth < 4) {
    if (current instanceof Error) messages.push(current.message);
    else if (typeof current === "string") messages.push(current);
    if (typeof current === "object" && current !== null) {
      const record = current as { code?: unknown; cause?: unknown; originalError?: unknown };
      if (record.code === "42P01" || record.code === "42703") return true;
      current = record.cause ?? record.originalError;
    } else {
      break;
    }
    depth += 1;
  }
  return /relation .* does not exist|column .* does not exist|table .* does not exist|undefined table|undefined column/i.test(messages.join(" "));
}

function schemaUnavailableResponse() {
  return NextResponse.json(
    { error: "身份組資料表尚未建立，請先套用 drizzle/0002_admin_identity_jcoins.sql。", setupRequired: true },
    { status: 503 }
  );
}

function safeAdminError(error: unknown) {
  if (error instanceof AuthError) return errorResponse(error);
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (isMissingSchemaError(error)) return schemaUnavailableResponse();
  console.error("[AdminGroups] request failed", error);
  return NextResponse.json({ error: "身份組操作目前無法完成，請稍後再試。" }, { status: 500 });
}

function integerField(value: unknown, label: string, min: number, max: number, fallback: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new InputError(`${label}必須是 ${min} 至 ${max} 的整數`);
  }
  return parsed;
}

function parseGroupPayload(body: Record<string, unknown>, existing?: typeof userGroups.$inferSelect) {
  const rawName = body.name === undefined ? existing?.name : String(body.name);
  const name = sanitize(rawName ?? "", 100);
  if (name.length < 2) throw new InputError("身份組名稱至少需要 2 個字");

  const iconValue = body.icon === undefined ? existing?.icon : body.icon;
  const colorValue = body.color === undefined ? existing?.color : body.color;
  const effectValue = body.effect === undefined ? existing?.effect : body.effect;
  const descriptionValue = body.description === undefined ? existing?.description : body.description;

  const icon = iconValue === null || iconValue === undefined ? null : sanitize(String(iconValue), 20) || null;
  const color = colorValue === null || colorValue === undefined ? null : sanitize(String(colorValue), 20) || null;
  const effect = effectValue === null || effectValue === undefined ? null : sanitize(String(effectValue), 50) || null;
  const description = descriptionValue === null || descriptionValue === undefined ? null : sanitize(String(descriptionValue), 1000) || null;

  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new InputError("顏色請使用六碼色碼，例如 #247A57");
  }

  const dailyAiLimit = integerField(body.dailyAiLimit, "每日 AI 額度", 0, MAX_DAILY_AI_LIMIT, existing?.dailyAiLimit ?? 50);
  const jCoinBonus = integerField(body.jCoinBonus, "J 幣加成", 0, MAX_BONUS_PERCENT, existing?.jCoinBonus ?? 0);
  const maxBonusCap = integerField(body.maxBonusCap, "最高加成上限", 0, MAX_BONUS_PERCENT, existing?.maxBonusCap ?? 30);
  const isActive = body.isActive === undefined
    ? (existing?.isActive ?? true)
    : body.isActive === true || body.isActive === "true";

  return { name, icon, color, effect, description, dailyAiLimit, jCoinBonus, maxBonusCap, isActive };
}

function parseId(value: unknown) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new InputError("身份組 ID 不正確");
  return id;
}

export async function GET() {
  try {
    await requireAdmin();
    const groups = await db.select().from(userGroups).orderBy(desc(userGroups.createdAt));
    return NextResponse.json(groups);
  } catch (error) {
    return safeAdminError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-groups:${admin.id}`), 30, 60_000)) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) throw new InputError("請提供身份組資料");

    if (body.action === "seed_defaults") {
      const defaults = [
        { name: "新朋友", icon: "🌱", color: "#247A57", effect: "soft-glow", description: "JoinJoy 的基本社群身份，累積參與經驗即可解鎖更多稱號。", dailyAiLimit: 50, jCoinBonus: 0, maxBonusCap: 30, isActive: true },
        { name: "熱心揪主", icon: "⭐", color: "#E8794F", effect: "sparkle", description: "鼓勵願意發起活動、照顧團隊與分享行程的社群夥伴。", dailyAiLimit: 75, jCoinBonus: 10, maxBonusCap: 30, isActive: true },
        { name: "城市探索家", icon: "🧭", color: "#C58A19", effect: "gold-shimmer", description: "喜歡探索新地點、參加不同主題活動的活躍成員。", dailyAiLimit: 100, jCoinBonus: 15, maxBonusCap: 30, isActive: true },
      ];
      const seeded = await db.transaction(async (tx) => {
        const results = [];
        for (const payload of defaults) {
          const [existing] = await tx.select({ id: userGroups.id }).from(userGroups).where(eq(userGroups.name, payload.name)).limit(1);
          const [group] = existing
            ? await tx.update(userGroups).set({ ...payload, isActive: true }).where(eq(userGroups.id, existing.id)).returning()
            : await tx.insert(userGroups).values(payload).returning();
          if (group) results.push(group);
        }
        await tx.insert(adminLogs).values({
          adminId: admin.id,
          action: "建立預設身份組",
          targetType: "user_group",
          detail: JSON.stringify({ names: defaults.map((group) => group.name) }),
        });
        return results;
      });
      return NextResponse.json({ ok: true, groups: seeded });
    }

    const payload = parseGroupPayload(body);
    const created = await db.transaction(async (tx) => {
      const [group] = await tx.insert(userGroups).values(payload).returning();
      if (!group) throw new Error("身份組建立失敗");
      await tx.insert(adminLogs).values({
        adminId: admin.id,
        action: "建立身份組",
        targetType: "user_group",
        targetId: group.id,
        detail: JSON.stringify({ name: group.name, settings: payload }),
      });
      return group;
    });

    return NextResponse.json({ ok: true, group: created }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && String((error as { code?: unknown }).code) === "23505") {
      return NextResponse.json({ error: "身份組名稱已存在，請換一個名稱" }, { status: 409 });
    }
    return safeAdminError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-groups:${admin.id}`), 30, 60_000)) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) throw new InputError("請提供身份組資料");
    const id = parseId(body.id);
    const [existing] = await db.select().from(userGroups).where(eq(userGroups.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "找不到身份組" }, { status: 404 });
    const payload = parseGroupPayload(body, existing);

    const updated = await db.transaction(async (tx) => {
      const [group] = await tx.update(userGroups).set(payload).where(eq(userGroups.id, id)).returning();
      if (!group) throw new Error("身份組更新失敗");
      await tx.insert(adminLogs).values({
        adminId: admin.id,
        action: group.isActive ? "修改身份組" : "停用身份組",
        targetType: "user_group",
        targetId: id,
        detail: JSON.stringify({ before: existing, after: group }),
      });
      return group;
    });

    return NextResponse.json({ ok: true, group: updated });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && String((error as { code?: unknown }).code) === "23505") {
      return NextResponse.json({ error: "身份組名稱已存在，請換一個名稱" }, { status: 409 });
    }
    return safeAdminError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-groups:${admin.id}`), 30, 60_000)) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const id = parseId(body?.id ?? new URL(req.url).searchParams.get("id"));
    const [existing] = await db.select().from(userGroups).where(eq(userGroups.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "找不到身份組" }, { status: 404 });

    await db.transaction(async (tx) => {
      await tx.update(userGroups).set({ isActive: false }).where(eq(userGroups.id, id));
      await tx.update(userGroupMembers)
        .set({ revokedAt: new Date(), revokedBy: admin.id, revocationReason: "身份組已由管理員停用" })
        .where(and(eq(userGroupMembers.groupId, id), isNull(userGroupMembers.revokedAt)));
      await tx.insert(adminLogs).values({
        adminId: admin.id,
        action: "停用身份組",
        targetType: "user_group",
        targetId: id,
        detail: JSON.stringify({ name: existing.name }),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeAdminError(error);
  }
}
