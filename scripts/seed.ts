/**
 * Firestore 초기 데이터 입력 스크립트
 * 실행: npm run seed
 *
 * 주의: .env.local에 FIREBASE_ADMIN_* 환경변수 설정 필요
 * 실행 전: npm install dotenv
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Firebase Admin 초기화
if (getApps().length === 0) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}

const db = getFirestore();

// ─── 칵테일 데이터 ───────────────────────────────────────────────────────────

interface CocktailSeed {
    name: string;
    baseSpirits: string[];
    ingredients: {
        fruits: string[];
        beverages: string[];
        herbs: string[];
        others: string[];
    };
    note: string;
    abv: string;
    recipe: string;
    imageUrl: string;
    flavorTags: string[];
    sweetness: number;
    isActive: boolean;
}

// CSV 전체 내용을 파싱 (개행문자가 포함된 셀 지원)
function parseCSVContent(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = "";
        } else if (char === "\n" && !inQuotes) {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = "";
        } else if (char === "\r" && !inQuotes) {
            // \r 무시
        } else {
            currentCell += char;
        }
    }
    
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    
    return rows;
}

function parseIngredientList(raw: string): string[] {
    if (!raw || raw.trim() === "") return [];
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

// 칵테일 이름 → 이미지 URL 맵핑 (Unsplash 칵테일 이미지 - 실제 배포 전 교체 가능)
const COCKTAIL_IMAGES: Record<string, string> = {
    default:
        "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
};

// 도수 문자열 → sweetness 수치 변환 (AI 추천용)
function estimateSweetness(
    name: string,
    abv: string,
    flavorTags: string[]
): number {
    const sweetCocktails = [
        "코스모폴리탄", "섹스온더비치", "아페롤 스프리츠", "데킬라 선라이즈", "보드카 선라이즈",
        "화이트러시안", "블랙러시안", "모히또", "쿠바리브레", "칸찬차라",
    ];
    const dryCocktails = [
        "마티니", "네그로니", "불바디에", "롭로이", "비터 진", "민트 줄렙",
        "김렛", "사이드카", "화이트레이디",
    ];
    if (sweetCocktails.includes(name)) return 4;
    if (dryCocktails.includes(name)) return 2;
    return 3;
}

function getFlavorTags(name: string, abv: string): string[] {
    const tags: string[] = [];
    const abvNum = parseFloat(abv) || 0;

    if (abvNum <= 10) tags.push("저도수");
    else if (abvNum <= 15) tags.push("가벼운");
    else if (abvNum >= 25) tags.push("강한");

    const fruityCocktails = [
        "모히또", "다이키리", "카이피로스카", "카이피리냐", "카이피리시마",
        "코스모폴리탄", "섹스온더비치", "데킬라 선라이즈", "보드카 선라이즈",
        "아페롤 스프리츠", "사우스사이드", "존콜린스", "칸찬차라",
    ];
    if (fruityCocktails.includes(name)) tags.push("과일향");

    const citrusy = ["김렛", "마가리타", "사이드카", "화이트레이디", "세인트 클레멘스", "XYZ"];
    if (citrusy.includes(name)) tags.push("새콤");

    const smoky = ["모던 메디슨", "비터 진"];
    if (smoky.includes(name)) tags.push("스모키");

    const herbal = ["네그로니", "불바디에", "롭로이", "아페롤입문", "비즈니스"];
    if (herbal.includes(name)) tags.push("허브");

    if (tags.length === 0) tags.push("클래식");
    return tags;
}

// CSV를 읽어 칵테일 데이터 배열로 파싱
function parseCocktailCSV(csvPath: string): CocktailSeed[] {
    const content = fs.readFileSync(csvPath, "utf-8");
    const rows = parseCSVContent(content).slice(1); // 헤더 제거

    const cocktails: CocktailSeed[] = [];

    for (const cols of rows) {
        if (cols.length < 9) continue;

        const [name, spirits, fruits, beverages, herbs, others, note, abv, recipe] = cols;

        if (!name.trim()) continue;

        const flavorTags = getFlavorTags(name.trim(), abv.trim());
        const sweetness = estimateSweetness(name.trim(), abv.trim(), flavorTags);

        cocktails.push({
            name: name.trim(),
            baseSpirits: parseIngredientList(spirits),
            ingredients: {
                fruits: parseIngredientList(fruits),
                beverages: parseIngredientList(beverages),
                herbs: parseIngredientList(herbs),
                others: parseIngredientList(others),
            },
            note: note.trim(),
            abv: abv.trim() || "미상",
            recipe: recipe
                .replace(/^"/, "")
                .replace(/"$/, "")
                .trim(),
            imageUrl: COCKTAIL_IMAGES[name.trim()] || COCKTAIL_IMAGES.default,
            flavorTags,
            sweetness,
            isActive: true, // 기본값: 재료 있음
        });
    }

    return cocktails;
}

// ─── 재료 데이터 추출 ────────────────────────────────────────────────────────

interface IngredientSeed {
    name: string;
    category: "base" | "fruit" | "beverage" | "herb" | "other";
    isSoldOut: boolean;
}

function extractIngredients(cocktails: CocktailSeed[]): IngredientSeed[] {
    const ingredientMap = new Map<string, IngredientSeed>();

    for (const c of cocktails) {
        for (const name of c.baseSpirits) {
            if (name && !ingredientMap.has(name)) {
                ingredientMap.set(name, { name, category: "base", isSoldOut: false });
            }
        }
        for (const name of c.ingredients.fruits) {
            if (name && !ingredientMap.has(name)) {
                ingredientMap.set(name, { name, category: "fruit", isSoldOut: false });
            }
        }
        for (const name of c.ingredients.beverages) {
            if (name && !ingredientMap.has(name)) {
                ingredientMap.set(name, { name, category: "beverage", isSoldOut: false });
            }
        }
        for (const name of c.ingredients.herbs) {
            if (name && !ingredientMap.has(name)) {
                ingredientMap.set(name, { name, category: "herb", isSoldOut: false });
            }
        }
        for (const name of c.ingredients.others) {
            if (name && !ingredientMap.has(name)) {
                ingredientMap.set(name, { name, category: "other", isSoldOut: false });
            }
        }
    }

    return Array.from(ingredientMap.values());
}

// ─── Firestore 업로드 ────────────────────────────────────────────────────────

async function seedCocktails(cocktails: CocktailSeed[]): Promise<void> {
    console.log(`\n🍹 칵테일 ${cocktails.length}개 업로드 중...`);
    const batch = db.batch();

    for (const cocktail of cocktails) {
        const ref = db.collection("cocktails").doc();
        batch.set(ref, {
            ...cocktail,
            createdAt: Timestamp.now(),
        });
        console.log(`  ✓ ${cocktail.name}`);
    }

    await batch.commit();
    console.log("✅ 칵테일 업로드 완료!");
}

async function seedIngredients(ingredients: IngredientSeed[]): Promise<void> {
    console.log(`\n🧪 재료 ${ingredients.length}개 업로드 중...`);
    const batch = db.batch();

    for (const ingredient of ingredients) {
        const ref = db.collection("ingredients").doc();
        batch.set(ref, {
            ...ingredient,
            updatedAt: Timestamp.now(),
        });
        console.log(`  ✓ [${ingredient.category}] ${ingredient.name}`);
    }

    await batch.commit();
    console.log("✅ 재료 업로드 완료!");
}

// ─── 메인 실행 ───────────────────────────────────────────────────────────────

async function main() {
    console.log("🚀 HomeTender Seed 스크립트 시작");
    console.log("📂 Firebase Project:", process.env.FIREBASE_ADMIN_PROJECT_ID);

    const csvPath = path.resolve(process.cwd(), "cocktails.csv");
    if (!fs.existsSync(csvPath)) {
        console.error("❌ cocktails.csv 파일을 찾을 수 없습니다:", csvPath);
        process.exit(1);
    }

    const cocktails = parseCocktailCSV(csvPath);
    console.log(`\n📊 파싱된 칵테일: ${cocktails.length}개`);

    const ingredients = extractIngredients(cocktails);
    console.log(`📊 추출된 재료: ${ingredients.length}개`);

    // 기존 데이터 삭제
    const existingCocktails = await db.collection("cocktails").get();
    if (!existingCocktails.empty) {
        console.log("\n🧹 기존 칵테일 데이터를 삭제합니다...");
        const batch = db.batch();
        existingCocktails.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    const existingIngredients = await db.collection("ingredients").get();
    if (!existingIngredients.empty) {
        console.log("🧹 기존 재료 데이터를 삭제합니다...");
        const batch = db.batch();
        existingIngredients.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    await seedCocktails(cocktails);
    await seedIngredients(ingredients);

    console.log("\n🎉 Seed 완료! Firestore 콘솔에서 데이터를 확인하세요.");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seed 실패:", err);
    process.exit(1);
});
