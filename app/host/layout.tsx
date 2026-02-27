"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Martini, Settings2, Share2, LogOut } from "lucide-react";
import Link from "next/link";
import { signOutUser } from "@/lib/firebase/auth";

export default function HostLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleLogout = async () => {
        await signOutUser();
        router.replace("/");
    };

    const navItems = [
        { name: "주문 큐", path: "/host", icon: Martini },
        { name: "재료 관리", path: "/host/ingredients", icon: Settings2 },
        { name: "초대 링크", path: "/host/session", icon: Share2 },
    ];

    return (
        <div className="max-w-md mx-auto min-h-screen border-x border-white/5 relative bg-background/50 flex flex-col pt-4 pb-24">

            {/* Header */}
            <header className="glass-panel p-4 flex items-center justify-between sticky top-0 z-50 rounded-b-2xl mx-2 mb-6 shadow-lg">
                <div className="flex items-center gap-2">
                    <Link href={`/host`} className="flex items-center gap-2 text-white">
                        <Martini className="w-5 h-5 flex-shrink-0" />
                        <span className="font-bold tracking-tight">H.Tender</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary">
                        Host
                    </span>
                    <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 px-4 overflow-x-hidden">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass-panel border-t border-white/10 flex justify-around items-center p-4 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    let nameEn = "Queue";
                    if (item.name === "재료 관리") nameEn = "Stock";
                    if (item.name === "초대 링크") nameEn = "Invite";

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex flex-col items-center gap-1.5 transition-colors relative ${isActive ? "text-primary hover:text-primary-hover" : "text-gray-400 hover:text-white"}`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>{nameEn}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
