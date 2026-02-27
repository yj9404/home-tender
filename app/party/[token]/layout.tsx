"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { GlassWater, ListOrdered, BotMessageSquare, AlertCircle } from "lucide-react";
import NicknameModal from "@/components/guest/NicknameModal";

export default function GuestLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ token: string }>;
}) {
    const pathname = usePathname();
    const [token, setToken] = useState<string>("");
    const [sessionInfo, setSessionInfo] = useState<{ isOrderPaused: boolean; expiresAt: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsNickname, setNeedsNickname] = useState(false);

    useEffect(() => {
        async function load() {
            const p = await params;
            setToken(p.token);

            // 세션 유효성 검사
            try {
                const res = await fetch(`/api/session?token=${p.token}`, { cache: "no-store" });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "세션을 찾을 수 없습니다.");
                }
                const data = await res.json();
                setSessionInfo(data);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        }
        load();

        // 닉네임 체크
        if (!localStorage.getItem("ht_guestName")) {
            setNeedsNickname(true);
        }
    }, [params]);

    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !sessionInfo) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center">
                <div className="glass p-8 max-w-sm w-full flex flex-col gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold">
                        {error === "Session expired" ? "세션 만료" : "오류가 발생했습니다"}
                    </h2>
                    <p className="text-sm text-gray-400">
                        {error === "Session expired" ? (
                            <>
                                세션이 만료되었습니다.<br />
                                호스트에게 새로운 링크를 받아주세요.
                            </>
                        ) : (
                            error
                        )}
                    </p>
                    {error !== "Session expired" && (
                        <p className="text-xs text-primary/80 mt-4 font-bold">
                            초대 링크가 만료되었거나 올바르지 않습니다.<br />
                            주최자(Host)에게 새 링크를 요청해주세요.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    const navItems = [
        { name: "메뉴판", path: `/party/${token}`, icon: GlassWater, exact: true },
        { name: "내 주문", path: `/party/${token}/my-orders`, icon: ListOrdered },
        { name: "AI 추천", path: `/party/${token}/ai`, icon: BotMessageSquare },
    ];

    if (needsNickname) {
        return <NicknameModal onComplete={(name) => setNeedsNickname(false)} />;
    }

    return (
        <div className="max-w-md mx-auto min-h-screen border-x border-white/5 relative bg-background/50 flex flex-col pt-4 pb-24">
            {/* 주문 일시정지 알림바 */}
            {sessionInfo.isOrderPaused && (
                <div className="bg-red-500/20 text-red-500 text-center py-2 px-4 rounded-xl text-sm font-bold sticky top-0 z-50 backdrop-blur-md mx-2 mb-2 border border-red-500/20">
                    ⚠️ 현재 주문이 밀려 잠시 주문 접수를 중단했습니다.
                </div>
            )}

            {/* Header */}
            <header className="glass-panel p-4 flex items-center justify-between sticky top-0 z-50 rounded-b-2xl mx-2 mb-6 shadow-lg">
                <div className="flex items-center gap-2">
                    <Link href={`/party/${token}`} className="flex items-center gap-2 text-white">
                        <GlassWater className="w-5 h-5" />
                        <span className="font-bold tracking-tight">HomeTender</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary">
                        Guest
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-4">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass-panel border-t border-white/10 flex justify-around items-center p-4 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);

                    let nameEn = "Menu";
                    if (item.name === "내 주문") nameEn = "Status";
                    if (item.name === "AI 추천") nameEn = "AI Chat";

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex flex-col items-center gap-1.5 transition-colors relative ${isActive ? "text-primary hover:text-primary-hover" : "text-gray-400 hover:text-white"}`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>{nameEn}</span>
                            {nameEn === "Status" && (
                                <>
                                    <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75"></span>
                                    <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--color-surface)]"></span>
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
