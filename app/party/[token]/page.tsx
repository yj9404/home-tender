"use client";

import { useEffect, useState } from "react";
import { Cocktail } from "@/types";
import { subscribeCocktails } from "@/lib/firebase/cocktails";
import CocktailCard from "@/components/guest/CocktailCard";
import OrderModal from "@/components/guest/OrderModal";
import { GlassWater, Search } from "lucide-react";

export default function GuestMenuPage({ params }: { params: Promise<{ token: string }> }) {
    const [cocktails, setCocktails] = useState<Cocktail[]>([]);
    const [token, setToken] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"available" | "all">("available");

    const [selected, setSelected] = useState<Cocktail | null>(null);

    useEffect(() => {
        params.then((p) => setToken(p.token));

        // 전체 칵테일 구독 (isAvailable 판단 로컬에서)
        const unsub = subscribeCocktails(false, (data) => {
            setCocktails(data);
        });
        return () => unsub();
    }, [params]);

    const filtered = cocktails.filter((c) => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || c.isActive;
        return matchSearch && matchFilter;
    });

    return (
        <>
            <div className="text-center space-y-2 mb-8 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-3xl font-bold tracking-tight">Party Menu</h1>
                <p className="text-gray-400 text-sm">주문 가능한 칵테일을 확인하세요.</p>
            </div>

            {/* Tab Selectors */}
            <div className="flex bg-surface/50 p-1 rounded-xl mb-6 glass-panel">
                <button
                    onClick={() => setFilter("available")}
                    className={`flex-1 py-2 text-sm rounded-lg transition-all ${filter === "available" ? "font-bold bg-primary text-white shadow-md" : "font-medium text-gray-400 hover:text-gray-200 hover:bg-surfaceHover"}`}
                >
                    주문 가능
                </button>
                <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 py-2 text-sm rounded-lg transition-all ${filter === "all" ? "font-bold bg-primary text-white shadow-md" : "font-medium text-gray-400 hover:text-gray-200 hover:bg-surfaceHover"}`}
                >
                    전체 메뉴
                </button>
            </div>

            {/* Cocktail List */}
            <div className="grid gap-4">
                {filtered.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        주문 가능한 칵테일이 없습니다.
                    </div>
                ) : (
                    filtered.map((c) => (
                        <CocktailCard
                            key={c.id}
                            cocktail={c}
                            onClick={() => {
                                if (c.isActive) setSelected(c);
                            }}
                        />
                    ))
                )}
            </div>

            {/* 주문 모달 */}
            <OrderModal
                cocktail={selected}
                sessionToken={token}
                onClose={() => setSelected(null)}
            />
        </>
    );
}
