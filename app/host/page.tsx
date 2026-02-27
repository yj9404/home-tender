"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/context/AuthContext";
import { Session } from "@/types";
import OrderQueue from "@/components/host/OrderQueue";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

export default function HostDashboardPage() {
    const { user } = useAuth();
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

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
                    const doc = snap.docs[0];
                    setActiveSession({ id: doc.id, ...doc.data() } as Session);
                }
            } catch (err) {
                console.error("Failed to fetch session:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [user]);

    if (loading) {
        return <div className="animate-pulse flex space-x-4">Loading session...</div>;
    }

    if (!activeSession) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center glass-panel mt-10 rounded-2xl mx-2 bg-surface/40">
                <h2 className="text-xl font-bold mb-3 text-gray-200">Session Note Found</h2>
                <p className="text-gray-400 text-sm mb-6">손님들을 초대하고 주문을 받으려면 세션을 먼저 생성해주세요.</p>
                <Link href="/host/session" className="btn-primary flex items-center gap-2 justify-center px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                    <PlusCircle className="w-5 h-5" /> 새 파티 시작하기
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="text-center space-y-2 mb-4 mt-2 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-3xl font-bold tracking-tight">Queue</h1>
                <p className="text-gray-400 text-sm">현재 요청된 칵테일 주문 목록입니다.</p>
            </div>

            <OrderQueue sessionId={activeSession.id} />
        </div>
    );
}
