import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { EventDetailClient } from "@/components/event-detail-client";
import { db } from "@/db";
import { events } from "@/db/schema";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await db.select({ title: events.title, description: events.description, coverImageUrl: events.coverImageUrl }).from(events).where(eq(events.id, Number(id))).limit(1);
  const item = event[0];
  if (!item) return { title: "找不到活動｜JoinJoy" };
  return {
    title: `${item.title}｜JoinJoy`,
    description: item.description.slice(0, 160),
    openGraph: {
      title: item.title,
      description: item.description.slice(0, 160),
      type: "website",
      images: item.coverImageUrl ? [{ url: item.coverImageUrl, alt: item.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.description.slice(0, 160),
      images: item.coverImageUrl ? [item.coverImageUrl] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailClient id={id} />;
}
