"use client";

import { useEffect, useState } from "react";
import { Order, OrderRating } from "@/types";
import { subscribeGuestOrders } from "@/lib/firebase/orders";
import { ListOrdered, Clock, ChefHat, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function MyOrdersPage({ params }: { params: Promise<{ token: string }> }) {
    // const [token, setToken] = useState(""); // Unused
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // 세션 ID 추출 (토큰 기반)
    const [sessionId, setSessionId] = useState<string>("");

    useEffect(() => {
        params.then((p) => {
            // setToken(p.token); // Unused
            // 토큰으로 세션 ID 가져오기
            fetch(`/api/session?token=${p.token}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.sessionId) setSessionId(data.sessionId);
                });
        });
    }, [params]);

    useEffect(() => {
        if (!sessionId) return;
        const guestId = localStorage.getItem("ht_guestId");
        if (!guestId) {
            setLoading(false);
            return;
        }

        const unsub = subscribeGuestOrders(sessionId, guestId, (data) => {
            // 최신 주문이 위로 오도록 정렬 (원래 asc였으니 여기서 reverse)
            setOrders([...data].reverse());
            setLoading(false);
        });
        return () => unsub();
    }, [sessionId]);

    const handleRate = async (orderId: string, rating: OrderRating) => {
        try {
            await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, rating }),
            });
        } catch (err) {
            console.error(err);
            alert("평가 반영에 실패했습니다.");
        }
    };

    if (loading) {
        return <div className="animate-pulse text-gray-500">주문 내역 불러오는 중...</div>;
    }

    return (
        <div className="flex flex-col gap-6 pb-20">
            <div className="text-center space-y-2 mb-8 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-3xl font-bold tracking-tight">Status</h1>
                <p className="text-gray-400 text-sm">
                    주문하신 칵테일의 진행 상태를 확인할 수 있습니다.
                </p>
            </div>

            {orders.length === 0 ? (
                <div className="glass p-12 text-center text-gray-500 flex flex-col gap-4">
                    <Clock className="w-12 h-12 mx-auto opacity-20" />
                    <p>아직 주문한 칵테일이 없습니다.<br />메뉴판에서 첫 주문을 넣어보세요!</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {orders.map((o) => (
                        <div key={o.id} className="glass-panel p-6 pb-5 flex flex-col gap-5 bg-surface/40 border-white/10 relative overflow-hidden rounded-2xl group">
                            {/* 상태 뱃지 */}
                            <div className="absolute top-0 right-0 p-3 flex gap-2">
                                {o.status === "pending" && (
                                    <span className="badge badge-pending"><Clock className="w-3 h-3" /> 대기 중</span>
                                )}
                                {o.status === "making" && (
                                    <span className="badge badge-making"><ChefHat className="w-3 h-3" /> 제조 중</span>
                                )}
                                {o.status === "done" && (
                                    <span className="badge badge-done"><CheckCircle2 className="w-3 h-3" /> 완료</span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-xl font-bold mb-1 text-white">{o.cocktailName}</h3>
                                <p className="text-xs text-gray-400">
                                    {o.createdAt ? formatDistanceToNow(o.createdAt.toDate(), { addSuffix: true, locale: ko }) : ""}
                                </p>
                            </div>

                            {/* 커스텀 내역 */}
                            {(o.customizations.lessIce || o.customizations.lessSugar || o.customizations.memo || o.customizations.excludeIngredients.length > 0) && (
                                <div className="bg-black/20 p-3 rounded-lg text-xs text-gray-300">
                                    <span className="font-semibold text-primary/80 mb-1 block">요청사항</span>
                                    <ul className="list-disc list-inside flex flex-col gap-.5">
                                        {o.customizations.lessIce && <li>얼음 적게</li>}
                                        {o.customizations.lessSugar && <li>덜 달게</li>}
                                        {o.customizations.excludeIngredients.map(i => <li key={i}>{i} 제외</li>)}
                                        {o.customizations.memo && <li>메모: {o.customizations.memo}</li>}
                                    </ul>
                                </div>
                            )}

                            {/* 평가 (상태가 done일 때만 표시) */}
                            {o.status === "done" && (
                                <div className="mt-2 pt-4 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-400">맛은 어떠셨나요?</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRate(o.id, "like")}
                                            className={`p-2 rounded-full transition-all ${o.rating === "like"
                                                ? "bg-primary/20 text-primary border border-primary/30"
                                                : "bg-white/5 text-gray-500 border border-transparent hover:text-primary"
                                                }`}
                                        >
                                            <ThumbsUp className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleRate(o.id, "dislike")}
                                            className={`p-2 rounded-full transition-all ${o.rating === "dislike"
                                                ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                : "bg-white/5 text-gray-500 border border-transparent hover:text-gray-400"
                                                }`}
                                        >
                                            <ThumbsDown className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
