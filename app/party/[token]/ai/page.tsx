"use client";

import { useState, useRef, useEffect } from "react";
import { BotMessageSquare, Send, User } from "lucide-react";

interface Message {
    role: "user" | "model";
    text: string;
}

export default function AIBartenderPage({ params }: { params: Promise<{ token: string }> }) {
    const [token, setToken] = useState("");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "model",
            text: "안녕하세요! 오늘의 일일 바텐더입니다. 🍹\n어떤 스타일의 칵테일을 원하시나요? (예: 달달하고 도수 낮은 거, 시원하고 상큼한 거)",
        },
    ]);
    const [loading, setLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        params.then((p) => setToken(p.token));
    }, [params]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const sendMessage = async () => {
        if (!input.trim() || !token) return;

        const userMessage = input.trim();
        setInput("");

        // 유저 메시지 즉시 추가
        const newMessages: Message[] = [...messages, { role: "user", text: userMessage }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const res = await fetch("/api/ai/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionToken: token,
                    message: userMessage,
                    history: messages.slice(1), // 첫 인사말 제외한 히스토리 전송
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "API 오류");
            }

            const data = await res.json();

            setMessages((prev) => [
                ...prev,
                { role: "model", text: data.reply },
            ]);
        } catch (err: any) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                { role: "model", text: `에러가 발생했어요:\n${err.message}` },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100dvh-160px)] pb-6 pt-4 relative">
            <div className="text-center space-y-2 mb-6 mt-4 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-3xl font-bold tracking-tight">AI Chat</h1>
                <p className="text-gray-400 text-sm px-4 leading-relaxed">
                    현재 메뉴판에 있는 재료를 바탕으로 맞춤 칵테일을 추천해드려요.
                </p>
            </div>

            {/* 채팅 영역 (글래스모피즘) */}
            <div className="flex-1 glass-panel overflow-y-auto p-5 mb-4 flex flex-col gap-5 rounded-2xl bg-surface/40 border-white/10 custom-scrollbar mx-1">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 w-full ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                        {/* Profile Icon */}
                        <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-purple-500 text-white shadow-md shadow-purple-500/20"
                                }`}
                        >
                            {m.role === "user" ? <User className="w-5 h-5" /> : <BotMessageSquare className="w-5 h-5" />}
                        </div>

                        {/* Message Bubble */}
                        <div
                            className={`p-3.5 rounded-2xl text-[15px] leading-relaxed break-words break-all sm:break-normal max-w-[80%] ${m.role === "user"
                                ? "bg-primary text-white rounded-tr-none shadow-[0_4px_14px_0_var(--color-accent-glow)]"
                                : "bg-white/10 text-gray-100 rounded-tl-none border border-white/5"
                                }`}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex items-start gap-3 w-full flex-row">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/50 flex items-center justify-center animate-pulse text-white/50">
                            <BotMessageSquare className="w-4 h-4" />
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl rounded-tl-none border border-white/5 flex gap-1.5 items-center">
                            <div className="w-2 h-2 rounded-full bg-purple-400/50 animate-bounce"></div>
                            <div className="w-2 h-2 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            <div className="w-2 h-2 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {/* 입력창 */}
            <div className="shrink-0 flex items-center gap-3 w-full px-1">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ex) 오늘 좀 우울한데, 도수 높고 상큼한 거?"
                    className="input flex-1 bg-white/5 border-white/10 focus:border-purple-500 placeholder:text-gray-500 text-sm py-4 px-5 rounded-xl shadow-inner w-full"
                    maxLength={100}
                />
                <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-purple-500 hover:bg-purple-400 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-full transition-all shadow-lg shadow-purple-500/20 active:scale-95"
                >
                    <Send className="w-5 h-5 -ml-0.5" />
                </button>
            </div>
        </div>
    );
}
