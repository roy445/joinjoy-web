import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Baloo_2, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { IntroSplash } from "@/components/intro-splash";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { PwaRegister } from "@/components/pwa-register";

const baloo = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", weight: ["500", "600", "700", "800"] });
const notoSansTC = Noto_Sans_TC({ subsets: ["latin"], variable: "--font-noto", weight: ["400", "500", "700", "900"] });

export const metadata: Metadata = {
  title: "揪好咖 JoinJoy｜把喜歡的事變成一起的事",
  description: "現代化揪團活動平台，探索熱門活動、建立你的專屬聚會，認識志同道合的好夥伴。",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#339990",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-Hant" suppressHydrationWarning className={`${baloo.variable} ${notoSansTC.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <IntroSplash />
          <PwaRegister />
          <AppShell user={user}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
