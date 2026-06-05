import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { customAlphabet } from "nanoid";

export const dynamic = 'force-dynamic';

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const nanoid = customAlphabet(CHARS, 12);

// 랜덤 토큰 생성 (12자 영숫자) - 암호학적으로 안전한 nanoid 사용
function generateToken(): string {
    return nanoid();
}

/** POST /api/session - 세션 생성 */
export async function POST(req: NextRequest) {
    try {
        if (!adminDb || !adminAuth) {
            console.error("Firebase Admin is not initialized");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Firebase ID Token 검증
        const token = authHeader.slice(7);
        const decoded = await adminAuth.verifyIdToken(token);
        const hostUid = decoded.uid;

        // 요청 바디 파싱 (커스텀 만료 시간 확인)
        const body = await req.json().catch(() => ({}));
        const now = new Date();
        let expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 디폴트 +12시간

        if (body.expiresAt) {
            const parsedDate = new Date(body.expiresAt);
            if (!isNaN(parsedDate.getTime())) {
                expiresAt = parsedDate;
            }
        }

        // 기존 유효 세션들 만료 처리 (새 세션 생성 시 이전 세션은 강제 만료)
        // 복합 인덱스 오류를 방지하기 위해 서버 메모리에서 필터링
        const existing = await adminDb
            .collection("sessions")
            .where("hostUid", "==", hostUid)
            .get();

        const activeSessions = existing.docs.filter(doc => {
            const data = doc.data();
            return data.expiresAt && data.expiresAt.toDate() > now;
        });

        if (activeSessions.length > 0) {
            const batch = adminDb.batch();
            activeSessions.forEach((doc) => {
                batch.update(doc.ref, { expiresAt: now });
            });
            await batch.commit();
        }

        // 새 세션 생성
        const sessionToken = generateToken();

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
        if (!adminDb) {
            console.error("adminDb is not initialized");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

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
            hostUid: data.hostUid,
            isOrderPaused: data.isOrderPaused,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (err) {
        console.error("[GET /api/session]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/** DELETE /api/session - 활성화된 세션 강제 종료 */
export async function DELETE(req: NextRequest) {
    try {
        if (!adminDb || !adminAuth) {
            console.error("Firebase Admin is not initialized");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.slice(7);
        const decoded = await adminAuth.verifyIdToken(token);
        const hostUid = decoded.uid;

        const now = new Date();

        const existing = await adminDb
            .collection("sessions")
            .where("hostUid", "==", hostUid)
            .get();

        const activeSessions = existing.docs.filter(doc => {
            const data = doc.data();
            return data.expiresAt && data.expiresAt.toDate() > now;
        });

        if (activeSessions.length > 0) {
            const batch = adminDb.batch();
            activeSessions.forEach((doc) => {
                // 과거 시간으로 덮어씌워 강제 만료
                batch.update(doc.ref, { expiresAt: new Date(Date.now() - 1000) });
            });
            await batch.commit();
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[DELETE /api/session]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
