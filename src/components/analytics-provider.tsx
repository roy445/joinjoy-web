"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { flush, trackPageView } from "@/lib/analytics-client";
export function AnalyticsProvider() {
  const pathname = usePathname();
  useEffect(() => { trackPageView(pathname); return () => { void flush(); }; }, [pathname]);
  useEffect(() => { const onVisibility = () => { if (document.visibilityState === "hidden") void flush(); }; window.addEventListener("visibilitychange", onVisibility); return () => window.removeEventListener("visibilitychange", onVisibility); }, []);
  return null;
}
