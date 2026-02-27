// Firebase Auth 유틸
"use client";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";
import { auth } from "./config";

const googleProvider = new GoogleAuthProvider();

/** Google 팝업 로그인 */
export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

/** 로그아웃 */
export async function signOutUser(): Promise<void> {
    await signOut(auth);
}

/** 인증 상태 구독 */
export function subscribeAuthState(
    callback: (user: User | null) => void
): () => void {
    return onAuthStateChanged(auth, callback);
}
