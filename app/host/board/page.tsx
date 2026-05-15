"use client";

import { useEffect, useRef, useState } from "react";
import { Order } from "@/types";
import { subscribeOrders } from "@/lib/firebase/orders";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/lib/context/AuthContext";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Session } from "@/types";
import OrderBoard from "@/components/shared/OrderBoard";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

function playOrderAlert() {
    try {
        const ctx = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const notes = [880, 1108.73, 1318.51];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.12 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.4);
        });
    } catch {
        // ignore
    }
}

export default function HostBoardPage() {
    const { user } = useAuth();
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const knownOrderIds = useRef<Set<string>>(new Set());
    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (!user) return;
        const fetchSession = async () => {
            try {
                const now = new Date();
                const q = query(
                    collection(db, "sessions"),
                    where("hostUid", "==", user.uid),
                    where("expiresAt", ">", now),
                    orderBy("expiresAt", "desc"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const d = snap.docs[0];
                    setActiveSession({ id: d.id, ...d.data() } as Session);
                }
            } catch (err) {
                console.error("Failed to fetch session:", err);
            } finally {
                setSessionLoading(false);
            }
        };
        fetchSession();
    }, [user]);

    useEffect(() => {
        if (!activeSession) return;
        const unsub = subscribeOrders(activeSession.id, (data) => {
            if (!isInitialLoad.current) {
                const hasNewPending = data.some(
                    (o) => o.status === "pending" && !knownOrderIds.current.has(o.id)
                );
                if (hasNewPending) playOrderAlert();
            }
            knownOrderIds.current = new Set(data.map((o) => o.id));
            isInitialLoad.current = false;
            setOrders(data);
        });
        return () => unsub();
    }, [activeSession]);

    const handleStatusChange = async (orderId: string, status: Order["status"]) => {
        if (!activeSession) return;
        try {
            const u = auth.currentUser;
            if (!u) return alert("로그인이 필요합니다.");
            const token = await u.getIdToken();
            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionId: activeSession.id, status }),
            });
            if (!res.ok) throw new Error("업데이트 실패");
        } catch (err) {
            console.error(err);
            alert("상태 변경에 실패했습니다.");
        }
    };

    if (sessionLoading) {
        return <div className="animate-pulse text-gray-500 text-center mt-10">세션 정보를 불러오는 중...</div>;
    }

    if (!activeSession) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center glass-panel mt-10 rounded-2xl mx-2 bg-surface/40">
                <h2 className="text-xl font-bold mb-3 text-gray-200">활성 세션 없음</h2>
                <p className="text-gray-400 text-sm mb-6">손님들을 초대하고 주문을 받으려면 세션을 먼저 생성해주세요.</p>
                <Link
                    href="/host/session"
                    className="btn-primary flex items-center gap-2 justify-center px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20"
                >
                    <PlusCircle className="w-5 h-5" /> 새 파티 시작하기
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="text-center space-y-1 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-2xl font-bold tracking-tight">Board</h1>
                <p className="text-gray-400 text-sm">제조완료 · 제조대기 현황을 한눈에 확인하세요.</p>
            </div>
            <OrderBoard
                orders={orders}
                mode="host"
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
