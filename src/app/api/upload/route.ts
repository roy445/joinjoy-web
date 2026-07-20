import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";

const ALLOWED_TYPES: Record<string, { ext: string; magic: number[][] }> = {
  "image/jpeg": { ext: "jpg", magic: [[0xff, 0xd8, 0xff]] },
  "image/png": { ext: "png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  "image/webp": { ext: "webp", magic: [[0x52, 0x49, 0x46, 0x46]] },
  "image/gif": { ext: "gif", magic: [[0x47, 0x49, 0x46, 0x38]] },
};

const MAX_SIZE = 6 * 1024 * 1024; // 6MB

function checkMagicBytes(buffer: Buffer, type: string) {
  const config = ALLOWED_TYPES[type];
  if (!config) return false;
  return config.magic.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (!rateLimit(clientKey(req, `upload-${user.id}`), 20, 10 * 60 * 1000)) {
      throw new Error("上傳太頻繁，請稍後再試");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("請選擇檔案");
    if (file.size === 0) throw new Error("檔案是空的");
    if (file.size > MAX_SIZE) throw new Error("圖片檔案不可超過 6MB");
    if (!ALLOWED_TYPES[file.type]) throw new Error("僅支援 JPG、PNG、WEBP、GIF 圖片格式");

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!checkMagicBytes(buffer, file.type)) {
      throw new Error("圖片內容驗證失敗，檔案可能已損毀或偽裝格式，已封鎖上傳");
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ALLOWED_TYPES[file.type].ext}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
  } catch (err) {
    return errorResponse(err);
  }
}
