"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { Martini } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 이미 로그인되어 있으면 Host 대시보드로 이동
    if (!loading && user) {
      router.push("/host");
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push("/host");
    } catch (error) {
      console.error("Login failed:", error);
      alert("로그인에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 로그인 상태면 화면을 렌더링하지 않고 바로 리다이렉트됨
  if (user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 백그라운드 효과 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="glass max-w-sm w-full p-8 flex flex-col items-center text-center relative z-10 glass-hover">
        <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30">
          <Martini className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-3xl font-bold mb-2">HomeTender</h1>
        <p className="text-sm text-gray-400 mb-8">
          홈파티를 위한 완벽한 칵테일 매니저
        </p>

        <button onClick={handleLogin} className="btn-primary w-full py-4 text-base">
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5 bg-white rounded-full p-0.5"
          />
          Host (집주인) 로그인
        </button>

        <p className="mt-6 text-xs text-gray-500">
          손님은 공유받은 링크로 직접 접속합니다.
        </p>
      </div>
    </main>
  );
}
