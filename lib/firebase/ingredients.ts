// 재료 Firestore CRUD
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
    Unsubscribe,
    serverTimestamp,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "./config";
import { Ingredient } from "@/types";

// ─── 공유 카탈로그 (읽기 전용) ─────────────────────────────────────────────────
const SHARED_COL = "ingredients";

/** 공유 재료 카탈로그 전체 조회 (신규 호스트 가져오기용) */
export async function getSharedIngredients(): Promise<Ingredient[]> {
    const snap = await getDocs(
        query(collection(db, SHARED_COL), orderBy("category"), orderBy("name"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient));
}

// ─── 호스트별 재고 ─────────────────────────────────────────────────────────────
function hostIngredientsCol(hostUid: string) {
    return collection(db, "hosts", hostUid, "ingredients");
}

function hostIngredientDoc(hostUid: string, id: string) {
    return doc(db, "hosts", hostUid, "ingredients", id);
}

/** 호스트 재료 실시간 구독 */
export function subscribeHostIngredients(
    hostUid: string,
    callback: (ingredients: Ingredient[]) => void
): Unsubscribe {
    const q = query(
        hostIngredientsCol(hostUid),
        orderBy("category"),
        orderBy("name")
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient)));
    });
}

/** 호스트 재료 추가 */
export async function addHostIngredient(
    hostUid: string,
    name: string,
    category: string
): Promise<void> {
    await addDoc(hostIngredientsCol(hostUid), {
        name,
        category,
        isSoldOut: false,
        updatedAt: serverTimestamp(),
    });
}

/** 호스트 재료 삭제 */
export async function deleteHostIngredient(
    hostUid: string,
    id: string
): Promise<void> {
    await deleteDoc(hostIngredientDoc(hostUid, id));
}

/** 호스트 재료 품절 토글 */
export async function toggleHostSoldOut(
    hostUid: string,
    ingredientId: string,
    isSoldOut: boolean
): Promise<void> {
    await updateDoc(hostIngredientDoc(hostUid, ingredientId), {
        isSoldOut,
        updatedAt: serverTimestamp(),
    });
}

/**
 * 공유 카탈로그의 재료를 호스트 개인 컬렉션으로 일괄 복사.
 */
export async function importSharedIngredientsToHost(
    hostUid: string
): Promise<number> {
    const shared = await getSharedIngredients();
    if (shared.length === 0) return 0;

    const batch = writeBatch(db);
    for (const ing of shared) {
        const { id, ...rest } = ing;
        const newRef = doc(hostIngredientsCol(hostUid));
        batch.set(newRef, {
            ...rest,
            isSoldOut: false,
            updatedAt: serverTimestamp(),
        });
    }
    await batch.commit();
    return shared.length;
}
