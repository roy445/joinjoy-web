import { db } from "@/db";
import { notifications } from "@/db/schema";

type NotifyInput = {
  userId: number;
  type: string;
  title: string;
  content?: string;
  link?: string;
};

export async function notify(input: NotifyInput) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    content: input.content ?? "",
    link: input.link ?? null,
  });
}

export async function notifyMany(userIds: number[], input: Omit<NotifyInput, "userId">) {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      content: input.content ?? "",
      link: input.link ?? null,
    }))
  );
}
