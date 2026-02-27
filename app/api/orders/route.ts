import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { CreateOrderPayload } from "@/types";

/** POST /api/orders - 주문 생성 (Guest용) */
export async function POST(req: NextRequest) {
    try {
        const body: CreateOrderPayload = await req.json();
        const { sessionToken, guestId, guestName, cocktailId, cocktailName, customizations } = body;

        // 세션 검증
        const sessionSnap = await adminDb
            .collection("sessions")
            .where("token", "==", sessionToken)
            .limit(1)
            .get();

        if (sessionSnap.empty) {
            return NextResponse.json({ error: "Invalid session" }, { status: 404 });
        }

        const sessionDoc = sessionSnap.docs[0];
        const sessionData = sessionDoc.data();

        // 만료 확인
        if (sessionData.expiresAt.toDate() < new Date()) {
            return NextResponse.json({ error: "Session expired" }, { status: 410 });
        }

        // 주문 일시정지 확인
        if (sessionData.isOrderPaused) {
            return NextResponse.json({ error: "Orders are paused" }, { status: 503 });
        }

        // 칵테일 활성화 확인
        const cocktailDoc = await adminDb.collection("cocktails").doc(cocktailId).get();
        if (!cocktailDoc.exists || !cocktailDoc.data()?.isActive) {
            return NextResponse.json({ error: "Cocktail not available" }, { status: 400 });
        }

        // 주문 생성
        const orderRef = await adminDb
            .collection("sessions")
            .doc(sessionDoc.id)
            .collection("orders")
            .add({
                sessionId: sessionDoc.id,
                guestId,
                guestName: guestName || "익명",
                cocktailId,
                cocktailName,
                customizations: customizations || {
                    lessSugar: false,
                    lessIce: false,
                    excludeIngredients: [],
                    memo: "",
                },
                status: "pending",
                rating: null,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

        return NextResponse.json({ orderId: orderRef.id }, { status: 201 });
    } catch (err) {
        console.error("[POST /api/orders]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
