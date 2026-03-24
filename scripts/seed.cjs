/**
 * Firestore 초기 데이터 입력 스크립트 (순수 CJS JavaScript)
 * 실행: node scripts/seed.cjs
 */

// dotenv 직접 파싱 (require 사용)
const fs = require("fs");
const path = require("path");

// .env.local 수동 파싱
function loadEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // 따옴표 제거
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
    }
}

loadEnv();

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

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

// ─── CSV 파싱 ─────────────────────────────────────────────────────────────────

function parseCSVContent(content) {
    const rows = [];
    let currentRow = [];
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
            // 무시
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

function parseList(raw) {
    if (!raw || !raw.trim()) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function getFlavorTags(name, abv) {
    const tags = [];
    const abvNum = parseFloat(abv) || 0;
    if (abvNum > 0 && abvNum <= 10) tags.push("저도수");
    else if (abvNum <= 15) tags.push("가벼운");
    else if (abvNum >= 25) tags.push("강한");

    const fruity = ["모히또", "다이키리", "카이피로스카", "카이피리냐", "카이피리시마", "코스모폴리탄", "섹스온더비치", "데킬라 선라이즈", "보드카 선라이즈", "아페롤 스프리츠", "사우스사이드", "존콜린스", "칸찬차라"];
    if (fruity.includes(name)) tags.push("과일향");
    const citrusy = ["김렛", "마가리타", "사이드카", "화이트레이디", "세인트 클레멘스", "XYZ", "카미카제"];
    if (citrusy.includes(name)) tags.push("새콤");
    const herbal = ["네그로니", "불바디에", "롭로이", "아페롤입문", "비즈니스", "민트 줄렙"];
    if (herbal.includes(name)) tags.push("허브");
    const smoky = ["모던 메디슨", "비터 진"];
    if (smoky.includes(name)) tags.push("스모키");
    const sweet = ["코스모폴리탄", "섹스온더비치", "아페롤 스프리츠", "데킬라 선라이즈", "보드카 선라이즈", "화이트러시안", "블랙러시안", "모히또", "쿠바리브레", "칸찬차라"];
    if (sweet.includes(name)) tags.push("달콤");
    if (tags.length === 0) tags.push("클래식");
    return tags;
}

function getSweetness(name) {
    const sweet4 = ["코스모폴리탄", "섹스온더비치", "아페롤 스프리츠", "데킬라 선라이즈", "보드카 선라이즈", "화이트러시안", "블랙러시안", "모히또", "쿠바리브레", "칸찬차라", "멕시콜라", "바탕가"];
    const dry2 = ["네그로니", "불바디에", "롭로이", "비터 진", "민트 줄렙", "올드패션드"];
    if (sweet4.includes(name)) return 4;
    if (dry2.includes(name)) return 2;
    return 3;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80";

function parseCocktailCSV(csvPath) {
    const content = fs.readFileSync(csvPath, "utf-8");
    const rows = parseCSVContent(content).slice(1);
    const cocktails = [];

    for (const cols of rows) {
        if (cols.length < 9) continue;

        const [name, spirits, fruits, beverages, herbs, others, note, abv, recipe] = cols;
        if (!name.trim()) continue;

        const cleanName = name.trim();
        cocktails.push({
            name: cleanName,
            baseSpirits: parseList(spirits),
            ingredients: {
                fruits: parseList(fruits),
                beverages: parseList(beverages),
                herbs: parseList(herbs),
                others: parseList(others),
            },
            note: note.trim(),
            abv: abv.trim() || "미상",
            recipe: recipe.replace(/^"/, "").replace(/"$/, "").trim(),
            imageUrl: DEFAULT_IMAGE,
            flavorTags: getFlavorTags(cleanName, abv.trim()),
            sweetness: getSweetness(cleanName),
            isActive: true,
        });
    }
    return cocktails;
}

function extractIngredients(cocktails) {
    const map = new Map();
    for (const c of cocktails) {
        for (const name of c.baseSpirits) {
            if (name && !map.has(name)) map.set(name, { name, category: "base", isSoldOut: false });
        }
        for (const name of c.ingredients.fruits) {
            if (name && !map.has(name)) map.set(name, { name, category: "fruit", isSoldOut: false });
        }
        for (const name of c.ingredients.beverages) {
            if (name && !map.has(name)) map.set(name, { name, category: "beverage", isSoldOut: false });
        }
        for (const name of c.ingredients.herbs) {
            if (name && !map.has(name)) map.set(name, { name, category: "herb", isSoldOut: false });
        }
        for (const name of c.ingredients.others) {
            if (name && !map.has(name)) map.set(name, { name, category: "other", isSoldOut: false });
        }
    }
    return Array.from(map.values());
}

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
        let delBatch = db.batch();
        existingCocktails.docs.forEach(doc => delBatch.delete(doc.ref));
        await delBatch.commit();
    }

    const existingIngredients = await db.collection("ingredients").get();
    if (!existingIngredients.empty) {
        console.log("🧹 기존 재료 데이터를 삭제합니다...");
        let delBatch = db.batch();
        existingIngredients.docs.forEach(doc => delBatch.delete(doc.ref));
        await delBatch.commit();
    }

    // 칵테일 업로드 (Firestore batch는 500개 제한)
    console.log(`\n🍹 칵테일 ${cocktails.length}개 업로드 중...`);
    let batch = db.batch();
    for (let i = 0; i < cocktails.length; i++) {
        const ref = db.collection("cocktails").doc();
        batch.set(ref, { ...cocktails[i], createdAt: Timestamp.now() });
        console.log(`  ✓ ${cocktails[i].name}`);
        if ((i + 1) % 499 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    await batch.commit();
    console.log("✅ 칵테일 업로드 완료!");

    // 재료 업로드
    console.log(`\n🧪 재료 ${ingredients.length}개 업로드 중...`);
    batch = db.batch();
    for (let i = 0; i < ingredients.length; i++) {
        const ref = db.collection("ingredients").doc();
        batch.set(ref, { ...ingredients[i], updatedAt: Timestamp.now() });
        console.log(`  ✓ [${ingredients[i].category}] ${ingredients[i].name}`);
        if ((i + 1) % 499 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    await batch.commit();
    console.log("✅ 재료 업로드 완료!");

    console.log("\n🎉 Seed 완료! Firestore 콘솔에서 데이터를 확인하세요.");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seed 실패:", err);
    process.exit(1);
});
