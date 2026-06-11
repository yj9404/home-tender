"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, BookHeart } from "lucide-react";
import { GuestbookEntry } from "@/types";

export default function GuestbookPage({ params }: { params: Promise<{ token: string }> }) {
    const [token, setToken] = useState("");
    const [entries, setEntries] = useState<GuestbookEntry[]>([]);
    const [authorName, setAuthorName] = useState("");
    const [message, setMessage] = useState("");
    const [fetching, setFetching] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [justPosted, setJustPosted] = useState(false);

    const fetchEntries = useCallback(async (tok: string) => {
        try {
            const res = await fetch(`/api/guestbook?token=${tok}`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            setEntries(data.entries ?? []);
        } catch {
            // silent fail
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        params.then((p) => {
            setToken(p.token);
            fetchEntries(p.token);
        });
        const savedName = localStorage.getItem("ht_guestName");
        if (savedName) setAuthorName(savedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async () => {
        if (!authorName.trim() || !message.trim() || !token || submitting) return;
        setSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch("/api/guestbook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionToken: token, authorName, message }),
            });

            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "오류가 발생했습니다");
            }

            setMessage("");
            setJustPosted(true);
            setTimeout(() => setJustPosted(false), 2500);
            await fetchEntries(token);
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : "오류가 발생했습니다");
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.metaKey) {
            handleSubmit();
        }
    };

    const formatDate = (isoString: string | null) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return d.toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getInitial = (name: string) => name.trim()[0]?.toUpperCase() ?? "?";

    // 이름 기반 색상 팔레트 (일관성 있는 아바타 색상)
    const avatarColors = [
        "bg-rose-500/20 text-rose-400 border-rose-500/30",
        "bg-violet-500/20 text-violet-400 border-violet-500/30",
        "bg-sky-500/20 text-sky-400 border-sky-500/30",
        "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        "bg-amber-500/20 text-amber-400 border-amber-500/30",
        "bg-pink-500/20 text-pink-400 border-pink-500/30",
    ];

    const getAvatarColor = (name: string) => {
        const idx = name.charCodeAt(0) % avatarColors.length;
        return avatarColors[idx];
    };

    return (
        <div className="flex flex-col pb-8 pt-2 animate-[slide-up_0.5s_ease-out]">

            {/* 페이지 제목 */}
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Guestbook</h1>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    오늘 파티의 소중한 추억을 남겨보세요 ✨
                </p>
            </div>

            {/* 입력 폼 카드 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 shadow-lg">
                <div className="flex flex-col gap-4">

                    {/* 이름 입력 */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                            이름
                        </label>
                        <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder="닉네임"
                            maxLength={20}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-gray-600 transition-all"
                        />
                    </div>

                    {/* 메시지 입력 */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                            메시지
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="오늘 파티 어땠나요? 한 마디 남겨주세요!"
                            maxLength={200}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-gray-600 transition-all resize-none leading-relaxed"
                        />
                        <div className="text-right text-[11px] text-gray-600">
                            {message.length} / 200
                        </div>
                    </div>

                    {/* 에러 메시지 */}
                    {submitError && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                            {submitError}
                        </p>
                    )}

                    {/* 성공 메시지 */}
                    {justPosted && (
                        <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-center">
                            방명록을 남겼어요! 🎉
                        </p>
                    )}

                    {/* 제출 버튼 */}
                    <button
                        onClick={handleSubmit}
                        disabled={!authorName.trim() || !message.trim() || submitting}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:bg-white/5 disabled:text-gray-600 text-white font-bold transition-all active:scale-95 shadow-md shadow-primary/10"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? "남기는 중..." : "방명록 남기기"}
                    </button>
                </div>
            </div>

            {/* 방명록 리스트 */}
            <div className="flex flex-col gap-6">
                {fetching ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-14 flex flex-col items-center gap-3">
                        <BookHeart className="w-12 h-12 text-gray-700" />
                        <p className="text-gray-500 text-sm leading-relaxed">
                            아직 방명록이 없어요.<br />
                            첫 번째 추억을 남겨보세요!
                        </p>
                    </div>
                ) : (
                    entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm"
                        >
                            {/* 카드 헤더: 아바타 + 이름 + 날짜 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm flex-shrink-0 ${getAvatarColor(entry.authorName)}`}
                                    >
                                        {getInitial(entry.authorName)}
                                    </div>
                                    <span className="font-semibold text-sm text-gray-100">
                                        {entry.authorName}
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-500 flex-shrink-0">
                                    {formatDate(entry.createdAt)}
                                </span>
                            </div>

                            {/* 구분선 */}
                            <div className="border-t border-white/5 mb-4" />

                            {/* 메시지 본문 */}
                            <p className="text-gray-200 leading-relaxed text-[15px] whitespace-pre-wrap break-words">
                                {entry.message}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
