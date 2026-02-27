// 세션 Firestore 유틸 (클라이언트 사이드)
import {
    doc,
    getDoc,
    updateDoc,
} from "firebase/firestore";
import { db } from "./config";
import { Session } from "@/types";

const COL = "sessions";

/** 토큰으로 세션 조회 */
export async function getSessionByToken(token: string): Promise<Session | null> {
    // sessions 컬렉션을 token 필드로 쿼리 (API route에서 처리하므로 여기선 id로 직접 조회)
    const snap = await getDoc(doc(db, COL, token));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Session;
}

/** 주문 일시 정지 토글 */
export async function toggleOrderPause(
    sessionId: string,
    isPaused: boolean
): Promise<void> {
    await updateDoc(doc(db, COL, sessionId), {
        isOrderPaused: isPaused,
    });
}

/** 세션 실시간 구독 (isOrderPaused 변경 감지) */
import { onSnapshot, Unsubscribe } from "firebase/firestore";

export function subscribeSession(
    sessionId: string,
    callback: (session: Session | null) => void
): Unsubscribe {
    return onSnapshot(doc(db, COL, sessionId), (snap) => {
        if (!snap.exists()) {
            callback(null);
            return;
        }
        callback({ id: snap.id, ...snap.data() } as Session);
    });
}
