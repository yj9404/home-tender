"use client";

import { useEffect, useState, useMemo } from "react";
import { Ingredient, Cocktail } from "@/types";
import { subscribeIngredients } from "@/lib/firebase/ingredients";
import { getAllCocktails } from "@/lib/firebase/cocktails";
import { db } from "@/lib/firebase/config";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { Settings2, Search, AlertCircle, RefreshCcw } from "lucide-react";

const CATEGORY_MAP: Record<string, string> = {
    base: "기주",
    fruit: "과일",
    beverage: "음료/주스",
    herb: "허브류",
    other: "기타 재료",
};

export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [cocktails, setCocktails] = useState<Cocktail[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState<string | null>(null); // 아이템 ID

    useEffect(() => {
        // 재료 구독
        const unsub = subscribeIngredients((data) => {
            setIngredients(data);
        });

        // 칵테일 전체 로드 (로컬에서 연산용)
        getAllCocktails().then((c) => {
            setCocktails(c);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // 검색 및 그룹핑
    const grouped = useMemo(() => {
        const valid = ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

        return valid.reduce((acc, curr) => {
            if (!acc[curr.category]) acc[curr.category] = [];
            acc[curr.category].push(curr);
            return acc;
        }, {} as Record<string, Ingredient[]>);
    }, [ingredients, search]);

    /** 
     * 품절 토글 로직.
     * 1. 해당 재료의 isSoldOut을 뒤집음.
     * 2. 전체 칵테일을 순회하며 isActive(주문 가능) 여부를 재계산함.
     * 3. 변경된 내역을 Batch Write로 한 번에 반영함. (무료 티어 절약 및 속도 향상)
     */
    const handleToggle = async (ingredient: Ingredient) => {
        if (updating) return; // 중복 클릭 방지
        try {
            setUpdating(ingredient.id);

            const nextSoldOut = !ingredient.isSoldOut;
            const batch = writeBatch(db);

            // 재료 업데이트
            batch.update(doc(db, "ingredients", ingredient.id), {
                isSoldOut: nextSoldOut,
                updatedAt: serverTimestamp(),
            });

            // 재계산을 위한 임시 재료 맵 (품절된 재료 이름들의 Set)
            const currentSoldOutNames = new Set(
                ingredients.filter(i => i.isSoldOut).map(i => i.name)
            );
            if (nextSoldOut) currentSoldOutNames.add(ingredient.name);
            else currentSoldOutNames.delete(ingredient.name);

            // 연관 칵테일 업데이트
            for (const c of cocktails) {
                // 이 칵테일의 필요 재료 파악
                const required = [
                    ...c.baseSpirits,
                    ...c.ingredients.fruits,
                    ...c.ingredients.beverages,
                    ...c.ingredients.herbs,
                    ...c.ingredients.others,
                ];

                // 칵테일의 새로운 활성화 상태 계산: 품절된 재료를 하나라도 쓰고 있으면 비활성화
                const isNowActive = !required.some((reqName) => currentSoldOutNames.has(reqName));

                // 기존 DB 상태와 다를 때만 업데이트 배포 (쓰기 비용 최소화)
                if (c.isActive !== isNowActive) {
                    batch.update(doc(db, "cocktails", c.id), {
                        isActive: isNowActive,
                    });
                    // 로컬 상태도 업데이트
                    c.isActive = isNowActive;
                }
            }

            await batch.commit();

        } catch (err) {
            console.error(err);
            alert("업데이트에 실패했습니다.");
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="text-gray-400 animate-pulse">Loading ingredients...</div>;

    return (
        <div className="flex flex-col gap-6 mt-2">
            <div className="text-center space-y-2 mb-4 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-3xl font-bold tracking-tight text-white">Stock</h1>
                <p className="text-gray-400 text-sm px-4">
                    품절 처리 시 해당 재료가 들어가는 모든 칵테일이 자동으로 손님 메뉴판에서 사라집니다.
                </p>
            </div>

            {/* 검색 바 */}
            <div className="relative mb-6 mx-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-500" />
                </div>
                <input
                    type="text"
                    className="input pl-10 bg-surface/50 border-white/10 w-full"
                    placeholder="재료 이름 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-10">
                {Object.keys(CATEGORY_MAP).map((catKey) => {
                    const items = grouped[catKey] || [];
                    if (items.length === 0) return null;

                    return (
                        <section key={catKey} className="mx-2">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white border-b border-white/10 pb-2">
                                {CATEGORY_MAP[catKey]} <span className="text-sm text-primary font-bold">({items.length})</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleToggle(item)}
                                        disabled={updating === item.id}
                                        className={`relative overflow-hidden p-4 rounded-xl text-left border transition-all glass-panel shadow-lg ${item.isSoldOut
                                            ? "bg-red-500/10 border-red-500/30 text-gray-400 grayscale"
                                            : "hover:border-primary/50 text-white"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`font-semibold text-sm ${item.isSoldOut ? "line-through text-red-500" : ""}`}>
                                                {item.name}
                                            </span>
                                            {updating === item.id ? (
                                                <RefreshCcw className="w-4 h-4 animate-spin text-primary" />
                                            ) : (
                                                item.isSoldOut && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            )}
                                        </div>

                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${item.isSoldOut
                                            ? "bg-red-500/20 text-red-400"
                                            : "bg-primary/20 text-primary border border-primary/20"
                                            }`}>
                                            {item.isSoldOut ? "Sold Out" : "Active"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
