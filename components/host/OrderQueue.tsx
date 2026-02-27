"use client";

import { useEffect, useState } from "react";
import { Order, Cocktail } from "@/types";
import { subscribeOrders } from "@/lib/firebase/orders";
import { auth } from "@/lib/firebase/config";
import { getCocktail } from "@/lib/firebase/cocktails";
import { Clock, CheckCircle2, ChefHat, Info, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface OrderProps {
    sessionId: string;
}

export default function OrderQueue({ sessionId }: OrderProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const unsub = subscribeOrders(sessionId, (data) => {
            setOrders(data);
        });
        return () => unsub();
    }, [sessionId]);

    const handleStatusChange = async (orderId: string, status: Order["status"]) => {
        try {
            const user = auth.currentUser;
            if (!user) return alert("로그인이 필요합니다.");
            const token = await user.getIdToken();

            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionId, status }),
            });

            if (!res.ok) throw new Error("업데이트 실패");
        } catch (err) {
            console.error(err);
            alert("상태 변경에 실패했습니다.");
        }
    };

    const openRecipeModal = async (cocktailId: string) => {
        const c = await getCocktail(cocktailId);
        if (c) {
            setSelectedCocktail(c);
            setModalOpen(true);
        }
    };

    const pending = orders.filter((o) => o.status === "pending");
    const making = orders.filter((o) => o.status === "making");
    const done = orders.filter((o) => o.status === "done").slice(-5); // 최근 5건만 표시

    return (
        <div className="flex flex-col gap-10 mt-2">
            {/* 제조 중 */}
            <section>
                <h3 className="flex items-center gap-2 text-lg font-bold text-primary mb-4">
                    <ChefHat className="w-5 h-5" /> 제조 중 ({making.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {making.length === 0 && <p className="text-gray-500 text-sm">현재 제조 중인 주문이 없습니다.</p>}
                    {making.map((o) => (
                        <OrderCard key={o.id} order={o} onStatus={handleStatusChange} onViewRecipe={openRecipeModal} />
                    ))}
                </div>
            </section>

            {/* 대기 중 */}
            <section>
                <h3 className="flex items-center gap-2 text-lg font-bold text-indigo-400 mb-4">
                    <Clock className="w-5 h-5" /> 대기 중 ({pending.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pending.length === 0 && <p className="text-gray-500 text-sm">대기 중인 주문이 없습니다.</p>}
                    {pending.map((o) => (
                        <OrderCard key={o.id} order={o} onStatus={handleStatusChange} onViewRecipe={openRecipeModal} />
                    ))}
                </div>
            </section>

            {/* 완료됨 */}
            <section>
                <h3 className="flex items-center gap-2 text-lg font-bold text-green-400 mb-4 opacity-70">
                    <CheckCircle2 className="w-5 h-5" /> 최근 완료 ({done.length})
                </h3>
                <div className="opacity-70 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {done.map((o) => (
                        <OrderCard key={o.id} order={o} onStatus={handleStatusChange} onViewRecipe={openRecipeModal} isPast />
                    ))}
                </div>
            </section>

            {/* Recipe Modal */}
            {modalOpen && selectedCocktail && (
                <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
                    <div className="modal-content relative p-6 glass-panel border-primary/20 shadow-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-black/50 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl font-bold mb-1 text-primary">{selectedCocktail.name}</h2>
                        <p className="text-sm text-gray-400 mb-6 flex gap-2 font-medium">단수: {selectedCocktail.abv}</p>

                        <div className="flex flex-col gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-1">기주</h4>
                                <p className="text-sm">{selectedCocktail.baseSpirits.join(", ") || "없음"}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-1">부재료</h4>
                                <p className="text-sm">
                                    {[
                                        ...selectedCocktail.ingredients.fruits,
                                        ...selectedCocktail.ingredients.beverages,
                                        ...selectedCocktail.ingredients.herbs,
                                        ...selectedCocktail.ingredients.others,
                                    ].join(", ") || "없음"}
                                </p>
                            </div>
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mt-4">
                                <h4 className="text-sm font-semibold text-primary/80 mb-2 flex items-center gap-2">
                                    <ChefHat className="w-4 h-4" /> 제조 레시피
                                </h4>
                                <pre className="text-sm whitespace-pre-wrap font-sans text-gray-200">
                                    {selectedCocktail.recipe}
                                </pre>
                            </div>
                            {selectedCocktail.note && (
                                <p className="text-xs text-primary/60 italic">💡 {selectedCocktail.note}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrderCard({
    order,
    onStatus,
    onViewRecipe,
    isPast = false,
}: {
    order: Order;
    onStatus: (id: string, st: Order["status"]) => void;
    onViewRecipe: (id: string) => void;
    isPast?: boolean;
}) {
    const timeStr = order.createdAt
        ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true, locale: ko })
        : "";

    return (
        <div className={`glass-panel p-6 flex flex-col gap-4 relative overflow-hidden rounded-2xl border border-white/10 ${isPast ? "bg-black/40 opacity-70" : "bg-surface/40 shadow-lg"} group hover:bg-white/10 transition-colors`}>
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg leading-tight text-white">{order.cocktailName}</h4>
                    <p className="text-xs text-gray-400 mt-1">{order.guestName}님 • {timeStr}</p>
                </div>
                <button
                    onClick={() => onViewRecipe(order.cocktailId)}
                    className="p-2 text-primary bg-primary/10 rounded-full hover:bg-primary-hover hover:text-white flex-shrink-0 transition-colors shadow-sm"
                    title="레시피 보기"
                >
                    <Info className="w-5 h-5" />
                </button>
            </div>

            {/* Customizations */}
            {(order.customizations.lessIce || order.customizations.lessSugar || order.customizations.memo || order.customizations.excludeIngredients.length > 0) && (
                <div className="bg-primary/5 rounded-xl p-3 text-xs border border-primary/20 text-gray-300">
                    <ul className="list-disc list-inside flex flex-col gap-1">
                        {order.customizations.lessIce && <li>얼음 적게</li>}
                        {order.customizations.lessSugar && <li>덜 달게</li>}
                        {order.customizations.excludeIngredients.map(i => <li key={i}>{i} 제외</li>)}
                        {order.customizations.memo && <li>메모: {order.customizations.memo}</li>}
                    </ul>
                </div>
            )}

            {/* Action Buttons */}
            {!isPast && (
                <div className="flex gap-2 mt-auto pt-2">
                    {order.status === "pending" && (
                        <button
                            onClick={() => onStatus(order.id, "making")}
                            className="flex-1 py-3 bg-primary/20 text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors text-sm shadow-sm"
                        >
                            제조 시작
                        </button>
                    )}
                    {order.status === "making" && (
                        <button
                            onClick={() => onStatus(order.id, "done")}
                            className="flex-1 py-3 bg-green-500/20 text-green-400 font-semibold rounded-xl hover:bg-green-500 hover:text-black transition-colors text-sm shadow-sm"
                        >
                            서빙 완료
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
