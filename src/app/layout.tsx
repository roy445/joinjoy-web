import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "揪好咖 JOINJOY｜和剛剛好的人一起出發",
  description: "探索活動、遇見好咖，把喜歡的事變成一起的事。",
  applicationName: "揪好咖 JOINJOY",
  keywords: ["揪團", "活動", "社群", "戶外", "台灣活動"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
