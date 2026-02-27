"use client";

import { useState } from "react";
import { User, ArrowRight } from "lucide-react";

export default function NicknameModal({
    onComplete
}: {
    onComplete: (name: string) => void;
}) {
    const [name, setName] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            localStorage.setItem("ht_guestName", name.trim());
            onComplete(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md animate-[fadeIn_0.3s_ease-out] p-4">
            <div className="w-full max-w-sm glass-panel p-8 rounded-3xl flex flex-col items-center border-primary/20 shadow-[0_0_40px_rgba(244,63,94,0.1)] text-center animate-[slideUp_0.4s_cubic-bezier(0.32,0.72,0,1)]">
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
                        onChange={(e) => setName(e.target.value)}
                        placeholder="예: 칵테일요정"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-center font-bold text-lg"
                        maxLength={10}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary transition-colors"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
