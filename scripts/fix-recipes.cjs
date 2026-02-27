const fs = require("fs");
const path = require("path");

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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
    }
}
loadEnv();

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

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

function parseProperCSV(csvPath) {
    const content = fs.readFileSync(csvPath, "utf-8");
    let inQuotes = false;
    let currentRow = [];
    let currentCell = "";
    const rows = [];

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (inQuotes) {
            // 따옴표 안에 있을 때
            if (char === '"') {
                if (nextChar === '"') {
                    // 이스케이프된 따옴표 ("")
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            // 따옴표 밖에 있을 때
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = "";
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                currentRow.push(currentCell.trim());
                if (currentRow.some(c => c !== "")) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = "";
                if (char === '\r') i++;
            } else {
                currentCell += char;
            }
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== "")) {
            rows.push(currentRow);
        }
    }
    return rows.slice(1); // 첫 번째 줄(헤더) 제외
}

async function fixRecipes() {
    console.log("🛠️ 여러 줄 레시피 복구 시작...");
    const csvPath = path.resolve(process.cwd(), "칵테일.csv");
    const rows = parseProperCSV(csvPath);

    // 이름 -> 레시피 매핑
    const recipeMap = new Map();
    for (const row of rows) {
        if (row.length >= 9) {
            const name = row[0].trim();
            const recipe = row[8].trim(); // 이미 정규화됨
            if (name) {
                recipeMap.set(name, recipe);
            }
        }
    }

    console.log(`📊 CSV 매핑 완료: ${recipeMap.size}개`);

    // 모든 칵테일 가져와서 업데이트
    const snap = await db.collection("cocktails").get();
    let updated = 0;

    let batch = db.batch();

    for (const doc of snap.docs) {
        const data = doc.data();
        const correctRecipe = recipeMap.get(data.name);

        if (correctRecipe && data.recipe !== correctRecipe) {
            batch.update(doc.ref, { recipe: correctRecipe });
            updated++;
            console.log(`  ✓ 업데이트: ${data.name}`);
        }

        if (updated % 499 === 0 && updated > 0) {
            await batch.commit();
            batch = db.batch();
        }
    }

    await batch.commit();
    console.log(`✅ 총 ${updated}개의 칵테일 레시피 복구 성공!`);
    process.exit(0);
}

fixRecipes().catch(console.error);
