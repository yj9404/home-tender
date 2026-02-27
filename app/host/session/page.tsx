"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { auth, db } from "@/lib/firebase/config";
import { Share2, Link as LinkIcon, RefreshCcw, Hand, Handshake, CheckCircle2, PowerOff } from "lucide-react";
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from "firebase/firestore";
import { Session } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function HostSessionPage() {
    const { user } = useAuth();
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

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
                console.error("Fetch session err:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, [user]);

    const createSession = async () => {
        try {
            setLoading(true);
            if (!auth.currentUser) return;
            const idToken = await auth.currentUser.getIdToken();

            const res = await fetch("/api/session", {
                method: "POST",
                headers: { Authorization: `Bearer ${idToken}` },
            });

            if (!res.ok) throw new Error("세션 생성 실패");

            const data = await res.json();

            // Update local state directly after creation
            setActiveSession({
                id: data.sessionId,
                hostUid: auth.currentUser.uid,
                token: data.token,
                isOrderPaused: false,
                expiresAt: data.expiresAt,
                createdAt: new Date() as any,
            });

        } catch (err) {
            console.error(err);
            alert("세션을 생성하지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const shareUrl = activeSession
        ? typeof window !== "undefined" ? `${window.location.origin}/party/${activeSession.token}` : ""
        : "";

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const endSession = async () => {
        if (!activeSession) return;
        if (!confirm("정말 현재 파티를 종료하시겠습니까? (이 작업은 되돌릴 수 없습니다.)")) return;
        try {
            setLoading(true);
            const sessionRef = doc(db, "sessions", activeSession.id);
            await updateDoc(sessionRef, {
                expiresAt: new Date(Date.now() - 1000) // 과거 시간으로 덮어씌워 강제 만료
            });
            setActiveSession(null);
            alert("파티가 종료되었습니다.");
        } catch (err) {
            console.error(err);
            alert("파티 종료에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-gray-500 animate-pulse">Loading...</div>;

    return (
        <div className="flex flex-col gap-8 mt-2">
            <div className="text-center space-y-2 mb-4 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-3xl font-bold tracking-tight text-white">Invite</h1>
                <p className="text-gray-400 text-sm px-4">
                    손님들에게 공유할 칵테일 메뉴판 링크를 생성합니다. 한 번 생성된 링크는 12시간 동안 유지됩니다.
                </p>
            </div>

            {!activeSession ? (
                <div className="glass-panel p-8 text-center flex flex-col items-center bg-surface/40 rounded-2xl border-white/10 mx-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_var(--color-accent-glow)]">
                        <Handshake className="w-8 h-8 text-primary shadow-primary/20" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">손님들을 초대하세요</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        링크를 생성하면 손님들이 메뉴를 고르고 커스텀 주문을 할 수 있습니다.
                    </p>
                    <button onClick={createSession} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50" disabled={loading}>
                        <Share2 className="w-4 h-4 text-white" /> 새로운 파티 시작
                    </button>
                </div>
            ) : (
                <div className="glass-panel p-6 text-center flex flex-col gap-6 bg-surface/40 border-primary/30 shadow-[0_0_30px_rgba(244,63,94,0.05)] rounded-2xl mx-2">
                    <div className="flex justify-center mb-2 text-primary">
                        <CheckCircle2 className="w-12 h-12 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">세션이 활성화되었습니다!</h3>
                        <p className="text-sm text-gray-400">
                            만료: {activeSession.expiresAt ? format(
                                typeof (activeSession.expiresAt as any).toDate === 'function'
                                    ? (activeSession.expiresAt as any).toDate()
                                    : new Date(activeSession.expiresAt as unknown as string),
                                "M월 d일 a h:mm", { locale: ko }
                            ) : "로딩중..."}
                        </p>
                    </div>

                    <div className="bg-black/50 p-4 rounded-xl border border-white/10 break-all text-left relative flex items-center shadow-inner">
                        <LinkIcon className="w-5 h-5 text-gray-500 shrink-0 mr-3" />
                        <span className="text-sm text-gray-300 font-mono flex-1">{shareUrl}</span>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleCopy}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] ${copied
                                ? "bg-green-500/20 text-green-400 border border-green-500/30 shadow-none"
                                : "bg-primary text-white"
                                }`}
                        >
                            {copied ? "복사됨! ✅" : "링크 복사하기"}
                        </button>
                    </div>

                    <button
                        onClick={endSession}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-surface/50 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-gray-400 hover:text-red-400 py-3 rounded-xl font-bold transition-all disabled:opacity-50 mt-[-8px]"
                    >
                        <PowerOff className="w-4 h-4" /> 파티 종료하기
                    </button>

                    <div className="flex flex-col items-center gap-2 pt-6 border-t border-white/10">
                        <p className="text-xs text-gray-400 text-left w-full flex items-start gap-2 leading-relaxed">
                            <span className="font-bold text-primary flex-shrink-0 mt-0.5">TIP</span>
                            <span>카카오톡이나 문자로 링크를 공유하세요. 손님은 앱 설치 없이 브라우저에서 바로 주문이 가능합니다.</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
