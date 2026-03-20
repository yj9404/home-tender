// Firebase Admin SDK (서버 전용 - API Routes에서 사용)
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const privateKey = rawKey
        ? rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n")
        : undefined;

    if (!projectId || !clientEmail || !privateKey) {
        if (process.env.NODE_ENV === "production") {
            console.warn("Firebase Admin environment variables are missing.");
        }
        return null as any;
    }

    try {
        return initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    } catch (err) {
        console.error("Firebase Admin initialization error:", err);
        return null as any;
    }
}

const app = getAdminApp();
export const adminDb = app ? getFirestore(app) : (null as any);
export const adminAuth = app ? getAuth(app) : (null as any);
