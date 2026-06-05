"use client";

import { useState } from "react";
import { User, ArrowRight } from "lucide-react";

export default function NicknameModal({
    token,
    onComplete,
}: {
    token: string;
    onComplete: (name: string) => void;
}) {
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/session/guest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, nickname: trimmed }),
            });

            if (res.status === 409) {
                setError("이미 사용 중인 닉네임이에요. 다른 이름을 입력해주세요.");
                return;
            }

            if (!res.ok) {
                setError("오류가 발생했습니다. 다시 시도해주세요.");
                return;
            }

            // 성공 → localStorage 저장 후 완료
            localStorage.setItem("ht_guestName", trimmed);
            onComplete(trimmed);
        } catch {
            setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md animate-[fadeIn_0.3s_ease-out] p-4">
            <div className="w-full max-w-sm glass-panel p-8 rounded-3xl flex flex-col items-center border-primary/20 shadow-[0_0_40px_rgba(244,63,94,0.1)] text-center animate-[slideUp_0.4s_cubic-bezier(0.32,0.72,0,1)] relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_var(--color-accent-glow)]">
                    <User className="w-8 h-8 text-primary shadow-primary/20" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">환영합니다!</h2>
                <p className="text-sm text-gray-400 mb-8">
                    바텐더가 부르기 편한<br />닉네임을 설정해주세요.
                </p>

                <form onSubmit={handleSubmit} className="w-full relative">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(null);
                        }}
                        placeholder="예: 칵테일요정"
                        className={`w-full bg-black/40 border rounded-2xl py-4 pl-6 pr-14 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 transition-all text-center font-bold text-lg ${
                            error
                                ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/50"
                                : "border-white/10 focus:border-primary/50 focus:ring-primary/50"
                        }`}
                        maxLength={10}
                        autoFocus
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={!name.trim() || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary transition-colors"
                    >
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ArrowRight className="w-5 h-5" />
                        )}
                    </button>
                </form>

                {error && (
                    <p className="mt-3 text-xs text-red-400 animate-[fadeIn_0.2s_ease-out]">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}
