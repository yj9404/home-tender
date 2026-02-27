// 칵테일 Firestore CRUD
import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { Cocktail } from "@/types";

const COL = "cocktails";

/** 전체 칵테일 목록 조회 */
export async function getAllCocktails(): Promise<Cocktail[]> {
    const snap = await getDocs(
        query(collection(db, COL), orderBy("name", "asc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail));
}

/** 주문 가능한(isActive=true) 칵테일만 조회 */
export async function getActiveCocktails(): Promise<Cocktail[]> {
    const snap = await getDocs(
        query(
            collection(db, COL),
            where("isActive", "==", true),
            orderBy("name", "asc")
        )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail));
}

/** 개별 칵테일 조회 */
export async function getCocktail(id: string): Promise<Cocktail | null> {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Cocktail;
}

/** 칵테일 목록 실시간 구독 */
export function subscribeCocktails(
    onlyActive: boolean,
    callback: (cocktails: Cocktail[]) => void
): Unsubscribe {
    const q = onlyActive
        ? query(
            collection(db, COL),
            where("isActive", "==", true),
            orderBy("name", "asc")
        )
        : query(collection(db, COL), orderBy("name", "asc"));

    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cocktail)));
    });
}
