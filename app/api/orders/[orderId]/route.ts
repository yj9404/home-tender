import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { UpdateOrderPayload } from "@/types";

type Params = { params: Promise<{ orderId: string }> };

/** PATCH /api/orders/[orderId] - 주문 상태/평가 변경 */
export async function PATCH(req: NextRequest, { params }: Params) {
    try {
        const { orderId } = await params;
        const body: UpdateOrderPayload & { sessionId: string } = await req.json();
        const { sessionId, status, rating } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        const orderRef = adminDb
            .collection("sessions")
            .doc(sessionId)
            .collection("orders")
            .doc(orderId);

        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const update: Record<string, unknown> = {
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Host: 상태 변경 (Authorization 헤더 있을 때)
        if (status) {
            const authHeader = req.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                await adminAuth.verifyIdToken(authHeader.slice(7));
            }
            update.status = status;
        }

        // Guest: 평가하기 (done 상태인 경우만)
        if (rating !== undefined) {
            const currentData = orderDoc.data();
            if (currentData?.status !== "done") {
                return NextResponse.json(
                    { error: "Can only rate completed orders" },
                    { status: 400 }
                );
            }
            update.rating = rating;
        }

        await orderRef.update(update);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[PATCH /api/orders/[orderId]]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
