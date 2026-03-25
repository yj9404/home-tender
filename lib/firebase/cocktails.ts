// 칵테일 Firestore CRUD
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { Cocktail } from "@/types";

// ─── 공유 카탈로그 (읽기 전용) ─────────────────────────────────────────────────
const SHARED_COL = "cocktails";

/** 공유 카탈로그 전체 조회 (신규 호스트 가져오기용) */
export async function getSharedCocktails(): Promise<Cocktail[]> {
    const snap = await getDocs(
        query(collection(db, SHARED_COL), orderBy("name", "asc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail));
}

// ─── 호스트별 레시피 ───────────────────────────────────────────────────────────
function hostCocktailsCol(hostUid: string) {
    return collection(db, "hosts", hostUid, "cocktails");
}

function hostCocktailDoc(hostUid: string, id: string) {
    return doc(db, "hosts", hostUid, "cocktails", id);
}

/** 호스트 레시피 전체 조회 */
export async function getHostCocktails(hostUid: string): Promise<Cocktail[]> {
    const snap = await getDocs(
        query(hostCocktailsCol(hostUid), orderBy("name", "asc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail));
}

/** 호스트 레시피 실시간 구독 */
export function subscribeHostCocktails(
    hostUid: string,
    onlyActive: boolean,
    callback: (cocktails: Cocktail[]) => void
): Unsubscribe {
    const q = onlyActive
        ? query(
            hostCocktailsCol(hostUid),
            where("isActive", "==", true),
            orderBy("name", "asc")
        )
        : query(hostCocktailsCol(hostUid), orderBy("name", "asc"));

    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail)));
    });
}

/** 호스트 레시피 추가 */
export async function addHostCocktail(
    hostUid: string,
    data: Omit<Cocktail, "id" | "createdAt">
): Promise<void> {
    await addDoc(hostCocktailsCol(hostUid), {
        ...data,
        createdAt: serverTimestamp(),
    });
}

/** 호스트 레시피 수정 */
export async function updateHostCocktail(
    hostUid: string,
    id: string,
    data: Partial<Cocktail>
): Promise<void> {
    await updateDoc(hostCocktailDoc(hostUid, id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/** 호스트 레시피 삭제 */
export async function deleteHostCocktail(
    hostUid: string,
    id: string
): Promise<void> {
    await deleteDoc(hostCocktailDoc(hostUid, id));
}

/**
 * 공유 카탈로그의 레시피를 호스트 개인 컬렉션으로 일괄 복사.
 * 기존에 이미 데이터가 있으면 skip.
 */
export async function importSharedCocktailsToHost(
    hostUid: string
): Promise<number> {
    const shared = await getSharedCocktails();
    if (shared.length === 0) return 0;

    const batch = writeBatch(db);
    for (const c of shared) {
        const { id, ...rest } = c;
        const newRef = doc(hostCocktailsCol(hostUid));
        batch.set(newRef, { ...rest, importedFromShared: true, createdAt: serverTimestamp() });
    }
    await batch.commit();
    return shared.length;
}

/** 특정 호스트의 레시피 1개 isActive 업데이트 (재고 연동) */
export async function updateHostCocktailActive(
    hostUid: string,
    id: string,
    isActive: boolean
): Promise<void> {
    await updateDoc(hostCocktailDoc(hostUid, id), { isActive });
}
