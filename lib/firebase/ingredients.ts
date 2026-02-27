// 재료 Firestore CRUD
import {
    collection,
    doc,
    getDocs,
    updateDoc,
    onSnapshot,
    Unsubscribe,
    serverTimestamp,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "./config";
import { Ingredient } from "@/types";

const COL = "ingredients";

/** 전체 재료 목록 */
export async function getAllIngredients(): Promise<Ingredient[]> {
    const snap = await getDocs(
        query(collection(db, COL), orderBy("category"), orderBy("name"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient));
}

/** 품절 토글 */
export async function toggleSoldOut(
    ingredientId: string,
    isSoldOut: boolean
): Promise<void> {
    await updateDoc(doc(db, COL, ingredientId), {
        isSoldOut,
        updatedAt: serverTimestamp(),
    });
}

/** 재료 실시간 구독 */
export function subscribeIngredients(
    callback: (ingredients: Ingredient[]) => void
): Unsubscribe {
    const q = query(collection(db, COL), orderBy("category"), orderBy("name"));
    return onSnapshot(q, (snap) => {
        callback(
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient))
        );
    });
}
