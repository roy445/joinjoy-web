import { eq } from "drizzle-orm";
import { db } from "@/db";
import { serviceControls } from "@/db/schema";

export async function getServiceControl(service: string) {
  const [control] = await db.select().from(serviceControls).where(eq(serviceControls.service, service)).limit(1);
  return control ?? null;
}

export async function serviceError(service: string) {
  const control = await getServiceControl(service);
  if (control && !control.isEnabled) return { code: control.activeErrorCode || "SYS-001", message: control.publicMessage || "此服務目前暫停使用，請稍後再試。" };
  return null;
}
