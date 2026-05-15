import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";

export const DEFAULT_COCKTAIL_IMAGE =
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80";

export async function uploadCocktailImage(
    hostUid: string,
    file: File,
    cocktailId?: string
): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = cocktailId
        ? `${cocktailId}.${ext}`
        : `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const storageRef = ref(storage, `hosts/${hostUid}/cocktails/${filename}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

export async function deleteCocktailImage(imageUrl: string): Promise<void> {
    try {
        const storageRef = ref(storage, imageUrl);
        await deleteObject(storageRef);
    } catch {
        // 이미 삭제됐거나 외부 URL이면 무시
    }
}
