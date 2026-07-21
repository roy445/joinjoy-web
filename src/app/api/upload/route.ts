import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";

const ALLOWED_TYPES: Record<string, { ext: string; magic: number[][] }> = {
  "image/jpeg": { ext: "jpg", magic: [[0xff, 0xd8, 0xff]] },
  "image/png": { ext: "png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  "image/webp": { ext: "webp", magic: [[0x52, 0x49, 0x46, 0x46]] },
  "image/gif": { ext: "gif", magic: [[0x47, 0x49, 0x46, 0x38]] },
};

// Kept comfortably under Vercel's ~4.5MB serverless request body limit.
const MAX_SIZE = 4 * 1024 * 1024; // 4MB

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
    if (file.size > MAX_SIZE) throw new Error("圖片檔案不可超過 4MB");
    if (!ALLOWED_TYPES[file.type]) throw new Error("僅支援 JPG、PNG、WEBP、GIF 圖片格式");

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!checkMagicBytes(buffer, file.type)) {
      throw new Error("圖片內容驗證失敗，檔案可能已損毀或偽裝格式，已封鎖上傳");
    }

    // Store the image directly as a base64 data URI in the database instead of
    // writing to the local filesystem. Serverless platforms like Vercel run
    // functions on a read-only, ephemeral filesystem, so writing files to
    // `public/uploads` works locally but silently fails (or disappears) in
    // production. Embedding the image as a data URI works identically in
    // both environments and persists permanently in the database.
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ ok: true, url: dataUrl });
  } catch (err) {
    return errorResponse(err);
  }
}