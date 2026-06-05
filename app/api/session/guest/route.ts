import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/session/guest
 * Body: { token: string; nickname: string }
 *
 * 해당 세션 내에서 닉네임이 이미 사용 중이면 409 반환.
 * 사용 가능하면 세션 문서의 nicknames 배열에 추가하고 200 반환.
 */
export async function POST(req: NextRequest) {
    try {
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const body = await req.json();
        const { token, nickname } = body as { token?: string; nickname?: string };

        if (!token || !nickname) {
            return NextResponse.json({ error: "token and nickname are required" }, { status: 400 });
        }

        const trimmed = nickname.trim();
        if (!trimmed || trimmed.length > 10) {
            return NextResponse.json({ error: "Invalid nickname" }, { status: 400 });
        }

        // 세션 조회
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

        // 세션 만료 확인
        if (data.expiresAt.toDate() < new Date()) {
            return NextResponse.json({ error: "Session expired" }, { status: 410 });
        }

        // 닉네임 중복 확인 (대소문자 무시)
        const existing: string[] = data.nicknames ?? [];
        const isDuplicate = existing.some(
            (n) => n.toLowerCase() === trimmed.toLowerCase()
        );

        if (isDuplicate) {
            return NextResponse.json({ error: "Nickname already taken" }, { status: 409 });
        }

        // 닉네임 추가 (arrayUnion으로 원자적 업데이트)
        const { FieldValue } = await import("firebase-admin/firestore");
        await doc.ref.update({
            nicknames: FieldValue.arrayUnion(trimmed),
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[POST /api/session/guest]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
