import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AetherSight Beta",
  description: "FFXIV 装备识别系统 - 通过图片识别游戏装备",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
