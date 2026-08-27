"use client";

import React, { useEffect, useState } from "react";
import { HonorToast, HonorType } from "./honor-toast";

interface Notification {
  id: number;
  type: HonorType;
  title: string;
  content: string;
}

export function HonorNotificationListener({ userId }: { userId?: number }) {
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [queue, setQueue] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const checkNotifications = async () => {
      try {
        const res = await fetch("/api/notifications/honor");
        if (!res.ok) return;
        
        const data = await res.json();
        if (data.notifications && data.notifications.length > 0) {
          setQueue(prev => [...prev, ...data.notifications]);
        }
      } catch (error) {
        console.error("Failed to fetch honor notifications:", error);
      }
    };

    // Initial check
    checkNotifications();

    // Check every 30 seconds
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (!activeNotification && queue.length > 0) {
      const next = queue[0];
      setActiveNotification(next);
      setQueue(prev => prev.slice(1));
    }
  }, [queue, activeNotification]);

  if (!activeNotification) return null;

  return (
    <HonorToast
      type={activeNotification.type}
      title={activeNotification.title}
      content={activeNotification.content}
      onClose={() => setActiveNotification(null)}
    />
  );
}
