"use client";

import { useState, useEffect } from "react";
import { Cocktail, OrderCustomization } from "@/types";
import { X, Send, GlassWater } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

export default function OrderModal({
    cocktail,
    sessionToken,
    onClose,
}: {
    cocktail: Cocktail | null;
    sessionToken: string;
    onClose: () => void;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [customs, setCustoms] = useState<OrderCustomization>({
        lessSugar: false,
        lessIce: false,
        excludeIngredients: [],
        memo: "",
    });

    useEffect(() => {
        // 로컬스토리지에서 기존 닉네임 불러오기
        const savedName = localStorage.getItem("ht_guestName");
        if (savedName) setGuestName(savedName);
    }, []);

    if (!cocktail) return null;

    const handleSubmit = async () => {
        try {
            setLoading(true);
            // 브라우저마다 고유 ID 부여 (탭 닫아도 내 주문 확인 가능하게)
            let guestId = localStorage.getItem("ht_guestId");
            if (!guestId) {
                guestId = uuidv4();
                localStorage.setItem("ht_guestId", guestId);
            }

            if (guestName.trim()) {
                localStorage.setItem("ht_guestName", guestName.trim());
            }

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionToken,
                    guestId,
                    guestName: guestName.trim() || "익명",
                    cocktailId: cocktail.id,
                    cocktailName: cocktail.name,
                    customizations: customs,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "주문 실패");
            }

            onClose();
            // 주문 완료 후 내 주문 현황 페이지로 이동
            router.push(`/party/${sessionToken}/my-orders`);
        } catch (err: any) {
            if (err.message === "Session expired") {
                alert("세션이 만료되었습니다. 호스트에게 새로운 링크를 받아주세요.");
                window.location.reload();
            } else {
                alert(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleExclude = (ingName: string) => {
        setCustoms((prev) => {
            const isExt = prev.excludeIngredients.includes(ingName);
            if (isExt) {
                return { ...prev, excludeIngredients: prev.excludeIngredients.filter((i) => i !== ingName) };
            } else {
                return { ...prev, excludeIngredients: [...prev.excludeIngredients, ingName] };
            }
        });
    };

    // 빼기 가능한 재료(과일, 허브, 기타)
    const excludeOptions = [
        ...cocktail.ingredients.fruits,
        ...cocktail.ingredients.herbs,
        ...cocktail.ingredients.others,
    ].filter(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-[fadeIn_0.3s_ease-out]">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            <div
                className="relative w-full max-w-md bg-[#1e293b] border border-white/10 rounded-t-3xl p-6 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto animate-[slideUp_0.4s_cubic-bezier(0.32,0.72,0,1)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    {cocktail.name}
                </h2>
                <p className="text-sm text-gray-400 mb-6 flex gap-2 font-medium">
                    <span>{cocktail.abv}% ABV</span> • <span>{cocktail.flavorTags.join(", ")}</span>
                </p>

                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                            <GlassWater className="w-4 h-4 text-primary" />
                            Recipe Preview
                        </h4>
                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2">
                            <p className="text-sm text-gray-400 text-pre-wrap">{cocktail.note || "새콤 달콤 칵테일"}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                            <Send className="w-4 h-4 text-primary" />
                            Custom Request
                        </h4>
                        <textarea
                            placeholder="예: 얼음 1개만 넣어주세요, 덜 달게 해주세요..."
                            className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none h-24"
                            value={customs.memo}
                            onChange={(e) => setCustoms({ ...customs, memo: e.target.value })}
                            maxLength={100}
                        ></textarea>

                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-none">
                            <button
                                onClick={() => setCustoms({ ...customs, lessSugar: !customs.lessSugar })}
                                className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-full border transition-colors shadow-sm ${customs.lessSugar ? "border-primary text-primary bg-primary/10" : "border-white/10 text-gray-300 hover:text-primary hover:border-primary/30 hover:bg-primary/10"}`}
                            >
                                + 덜 달게
                            </button>
                            <button
                                onClick={() => setCustoms({ ...customs, lessIce: !customs.lessIce })}
                                className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-full border transition-colors shadow-sm ${customs.lessIce ? "border-primary text-primary bg-primary/10" : "border-white/10 text-gray-300 hover:text-primary hover:border-primary/30 hover:bg-primary/10"}`}
                            >
                                + 얼음 적게
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="animate-pulse">주문 전송 중...</span>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                주문하기
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
