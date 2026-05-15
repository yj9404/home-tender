"use client";

import { Order, OrderRating, OrderStatus } from "@/types";
import { CheckCircle2, Clock, ChefHat, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface OrderBoardProps {
    orders: Order[];
    mode: "host" | "guest";
    onStatusChange?: (orderId: string, status: OrderStatus) => void;
    onRate?: (orderId: string, rating: OrderRating) => void;
}

export default function OrderBoard({ orders, mode, onStatusChange, onRate }: OrderBoardProps) {
    const done = orders.filter((o) => o.status === "done");
    const pending = orders.filter((o) => o.status === "pending" || o.status === "making");

    return (
        <div className="flex flex-col [@media(orientation:landscape)]:flex-row gap-4 [@media(orientation:landscape)]:h-[calc(100dvh-13rem)]">
            {/* 제조완료 */}
            <div className="flex-1 flex flex-col min-w-0 glass-panel rounded-2xl overflow-hidden border border-white/10">
                <div className="flex items-center gap-2 text-green-400 p-4 pb-3 border-b border-white/10 flex-shrink-0 bg-green-500/5">
                    <CheckCircle2 className="w-5 h-5" />
                    <h2 className="font-bold text-base">제조완료</h2>
                    <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-bold tabular-nums">
                        {done.length}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">
                    {done.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                            <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm">완료된 주문이 없습니다.</p>
                        </div>
                    ) : (
                        done.map((o) => (
                            <BoardCard
                                key={o.id}
                                order={o}
                                mode={mode}
                                onStatusChange={onStatusChange}
                                onRate={onRate}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* 제조대기 */}
            <div className="flex-1 flex flex-col min-w-0 glass-panel rounded-2xl overflow-hidden border border-white/10">
                <div className="flex items-center gap-2 text-amber-400 p-4 pb-3 border-b border-white/10 flex-shrink-0 bg-amber-500/5">
                    <Clock className="w-5 h-5" />
                    <h2 className="font-bold text-base">제조대기</h2>
                    <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-bold tabular-nums">
                        {pending.length}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">
                    {pending.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                            <Clock className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm">대기 중인 주문이 없습니다.</p>
                        </div>
                    ) : (
                        pending.map((o) => (
                            <BoardCard
                                key={o.id}
                                order={o}
                                mode={mode}
                                onStatusChange={onStatusChange}
                                onRate={onRate}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function BoardCard({
    order,
    mode,
    onStatusChange,
    onRate,
}: {
    order: Order;
    mode: "host" | "guest";
    onStatusChange?: (id: string, status: OrderStatus) => void;
    onRate?: (id: string, rating: OrderRating) => void;
}) {
    const timeStr = order.createdAt
        ? formatDistanceToNow(Math.min(Date.now(), order.createdAt.toDate().getTime()), {
              addSuffix: true,
              locale: ko,
          })
        : "";

    const isMaking = order.status === "making";
    const isDone = order.status === "done";

    return (
        <div
            className={`rounded-xl p-4 flex flex-col gap-3 border transition-colors ${
                isDone
                    ? "bg-green-500/5 border-green-500/10"
                    : isMaking
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-surface/50 border-white/10 hover:bg-white/5"
            }`}
        >
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <h4 className="font-bold text-white leading-tight truncate">{order.cocktailName}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {order.guestName} · {timeStr}
                    </p>
                </div>
                {isMaking && (
                    <span className="flex-shrink-0 flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-full">
                        <ChefHat className="w-3 h-3" /> 제조중
                    </span>
                )}
                {isDone && (
                    <span className="flex-shrink-0 flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> 완료
                    </span>
                )}
            </div>

            {/* 커스텀 요청 */}
            {(order.customizations.lessIce ||
                order.customizations.lessSugar ||
                order.customizations.memo ||
                order.customizations.excludeIngredients.length > 0) && (
                <div className="bg-black/20 rounded-lg p-2.5 text-xs text-gray-300 border border-white/5">
                    <ul className="flex flex-col gap-0.5">
                        {order.customizations.lessIce && <li>· 얼음 적게</li>}
                        {order.customizations.lessSugar && <li>· 덜 달게</li>}
                        {order.customizations.excludeIngredients.map((i) => (
                            <li key={i}>· {i} 제외</li>
                        ))}
                        {order.customizations.memo && <li>· {order.customizations.memo}</li>}
                    </ul>
                </div>
            )}

            {/* 호스트 액션 버튼 */}
            {mode === "host" && !isDone && onStatusChange && (
                <div className="flex gap-2 pt-0.5">
                    {order.status === "pending" && (
                        <button
                            onClick={() => onStatusChange(order.id, "making")}
                            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black transition-colors"
                        >
                            제조 시작
                        </button>
                    )}
                    {order.status === "making" && (
                        <button
                            onClick={() => onStatusChange(order.id, "done")}
                            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-colors"
                        >
                            제조 완료
                        </button>
                    )}
                </div>
            )}

            {/* 게스트 평가 버튼 */}
            {mode === "guest" && isDone && onRate && (
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-gray-500">맛은 어떠셨나요?</span>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => onRate(order.id, "like")}
                            className={`p-1.5 rounded-full transition-all ${
                                order.rating === "like"
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "text-gray-500 hover:text-primary"
                            }`}
                        >
                            <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onRate(order.id, "dislike")}
                            className={`p-1.5 rounded-full transition-all ${
                                order.rating === "dislike"
                                    ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                    : "text-gray-500 hover:text-gray-400"
                            }`}
                        >
                            <ThumbsDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
