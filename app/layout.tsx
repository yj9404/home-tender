import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HomeTender 🍹",
  description: "홈파티 칵테일 주문 및 관리 서비스",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased text-foreground bg-background min-h-screen relative overflow-x-hidden selection:bg-primary/30`}>
        <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vh] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vh] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
