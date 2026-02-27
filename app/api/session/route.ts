import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

// 랜덤 토큰 생성 (12자 영숫자)
function generateToken(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 12 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join("");
}

/** POST /api/session - 세션 생성 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Firebase ID Token 검증
        const token = authHeader.slice(7);
        const decoded = await adminAuth.verifyIdToken(token);
        const hostUid = decoded.uid;

        // 기존 유효 세션 확인 (12시간 이내)
        const now = new Date();
        const existing = await adminDb
            .collection("sessions")
            .where("hostUid", "==", hostUid)
            .where("expiresAt", ">", now)
            .orderBy("expiresAt", "desc")
            .limit(1)
            .get();

        if (!existing.empty) {
            const doc = existing.docs[0];
            return NextResponse.json({
                sessionId: doc.id,
                token: doc.data().token,
                expiresAt: doc.data().expiresAt.toDate().toISOString(),
            });
        }

        // 새 세션 생성
        const sessionToken = generateToken();
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // +12시간

        const sessionRef = await adminDb.collection("sessions").add({
            hostUid,
            token: sessionToken,
            isOrderPaused: false,
            expiresAt,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            sessionId: sessionRef.id,
            token: sessionToken,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (err) {
        console.error("[POST /api/session]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/** GET /api/session?token=xxx - 세션 검증 (Guest용) */
export async function GET(req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get("token");
        if (!token) {
            return NextResponse.json({ error: "token required" }, { status: 400 });
        }

        const snap = await adminDb
            .collection("sessions")
            .where("token", "==", token)
            .limit(1)
            .get();

        if (snap.empty) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const doc = snap.docs[0];
        const data = doc.data();
        const expiresAt: Date = data.expiresAt.toDate();

        if (expiresAt < new Date()) {
            return NextResponse.json({ error: "Session expired" }, { status: 410 });
        }

        return NextResponse.json({
            sessionId: doc.id,
            isOrderPaused: data.isOrderPaused,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (err) {
        console.error("[GET /api/session]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
