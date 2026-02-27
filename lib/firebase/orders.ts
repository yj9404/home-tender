// 주문 Firestore 유틸 (클라이언트 사이드 - 실시간)
import {
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    Unsubscribe,
    where,
} from "firebase/firestore";
import { db } from "./config";
import { Order, OrderStatus, OrderRating } from "@/types";

/** 세션의 전체 주문 실시간 구독 (Host용) */
export function subscribeOrders(
    sessionId: string,
    callback: (orders: Order[]) => void
): Unsubscribe {
    const q = query(
        collection(db, "sessions", sessionId, "orders"),
        orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    });
}

/** 특정 손님의 주문만 실시간 구독 (Guest용) */
export function subscribeGuestOrders(
    sessionId: string,
    guestId: string,
    callback: (orders: Order[]) => void
): Unsubscribe {
    const q = query(
        collection(db, "sessions", sessionId, "orders"),
        where("guestId", "==", guestId),
        orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    });
}

/** 주문 상태 변경 (Host용) */
export async function updateOrderStatus(
    sessionId: string,
    orderId: string,
    status: OrderStatus
): Promise<void> {
    await updateDoc(doc(db, "sessions", sessionId, "orders", orderId), {
        status,
        updatedAt: serverTimestamp(),
    });
}

/** 주문 평가 (Guest용) */
export async function rateOrder(
    sessionId: string,
    orderId: string,
    rating: OrderRating
): Promise<void> {
    await updateDoc(doc(db, "sessions", sessionId, "orders", orderId), {
        rating,
        updatedAt: serverTimestamp(),
    });
}
