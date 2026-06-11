import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/** GET /api/guestbook?token=xxx - 방명록 목록 (최신순) */
export async function GET(req: NextRequest) {
    try {
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const token = req.nextUrl.searchParams.get("token");
        if (!token) {
            return NextResponse.json({ error: "token is required" }, { status: 400 });
        }

        const sessionSnap = await adminDb
            .collection("sessions")
            .where("token", "==", token)
            .limit(1)
            .get();

        if (sessionSnap.empty) {
            return NextResponse.json({ error: "Invalid session" }, { status: 404 });
        }

        const sessionId = sessionSnap.docs[0].id;

        const snap = await adminDb
            .collection("guestbook")
            .where("sessionId", "==", sessionId)
            .get();

        // 복합 인덱스 없이 서버에서 최신순 정렬
        const entries = snap.docs
            .map((doc) => ({
                id: doc.id,
                sessionId: doc.data().sessionId as string,
                authorName: doc.data().authorName as string,
                message: doc.data().message as string,
                createdAt: doc.data().createdAt?.toDate().toISOString() ?? null,
            }))
            .sort((a, b) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return b.createdAt.localeCompare(a.createdAt);
            });

        return NextResponse.json({ entries });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[GET /api/guestbook]", msg);
        return NextResponse.json({ error: "Internal Server Error", detail: msg }, { status: 500 });
    }
}

/** POST /api/guestbook - 방명록 작성 */
export async function POST(req: NextRequest) {
    try {
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const body = await req.json();
        const { sessionToken, authorName, message } = body;

        if (!sessionToken || !authorName?.trim() || !message?.trim()) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (authorName.trim().length > 20) {
            return NextResponse.json({ error: "authorName too long" }, { status: 400 });
        }

        if (message.trim().length > 200) {
            return NextResponse.json({ error: "message too long" }, { status: 400 });
        }

        const sessionSnap = await adminDb
            .collection("sessions")
            .where("token", "==", sessionToken)
            .limit(1)
            .get();

        if (sessionSnap.empty) {
            return NextResponse.json({ error: "Invalid session" }, { status: 404 });
        }

        const sessionDoc = sessionSnap.docs[0];
        if (sessionDoc.data().expiresAt.toDate() < new Date()) {
            return NextResponse.json({ error: "Session expired" }, { status: 410 });
        }

        const ref = await adminDb.collection("guestbook").add({
            sessionId: sessionDoc.id,
            authorName: authorName.trim(),
            message: message.trim(),
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ id: ref.id }, { status: 201 });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[POST /api/guestbook]", msg);
        return NextResponse.json({ error: "Internal Server Error", detail: msg }, { status: 500 });
    }
}
