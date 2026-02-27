export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIRecommendPayload } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/** POST /api/ai/recommend - AI 바텐더 추천 */
export async function POST(req: NextRequest) {
    try {
        const body: AIRecommendPayload = await req.json();
        const { sessionToken, message, history } = body;

        // 세션 검증 및 sessionId 확인
        const sessionSnap = await adminDb
            .collection("sessions")
            .where("token", "==", sessionToken)
            .limit(1)
            .get();

        if (sessionSnap.empty) {
            return NextResponse.json({ error: "Invalid session" }, { status: 404 });
        }

        // 현재 주문 가능한 칵테일만 RAG 컨텍스트로 사용
        const cocktailsSnap = await adminDb
            .collection("cocktails")
            .where("isActive", "==", true)
            .get();

        const availableCocktails = cocktailsSnap.docs.map((doc: any) => {
            const d = doc.data();
            return {
                name: d.name,
                abv: d.abv,
                flavorTags: d.flavorTags,
                sweetness: d.sweetness,
                baseSpirits: d.baseSpirits,
                ingredients: d.ingredients,
                recipe: d.recipe,
            };
        });

        // RAG 시스템 프롬프트
        const systemPrompt = `너는 홈파티 칵테일 바텐더 'HomeTender'야. 친근하고 유쾌하게 손님의 취향에 맞는 칵테일을 추천해줘.

현재 주문 가능한 칵테일 목록 (총 ${availableCocktails.length}개):
${JSON.stringify(availableCocktails, null, 2)}

규칙:
1. **반드시 위 목록에 있는 칵테일만 추천**해. 목록에 없는 건 추천 금지.
2. 손님 취향(달달한, 도수 낮은, 상큼한 등)을 파악해서 최적 2~3개 추천.
3. 각 추천마다 왜 그 칵테일이 어울리는지 한 줄 설명 추가.
4. 답변은 한국어로, 이모지 적절히 사용해서 친근하게.
5. 취향 정보가 부족하면 먼저 질문해.
6. 추천 형식: **칵테일명** - 설명 (도수: XX%, 특징: 태그들)`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
        });

        // 대화 히스토리 포함
        const chat = model.startChat({
            history: history.map((h) => ({
                role: h.role,
                parts: [{ text: h.text }],
            })),
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        return NextResponse.json({ reply: responseText });
    } catch (err: any) {
        console.error("[POST /api/ai/recommend]", err);
        return NextResponse.json(
            { error: err.message || "AI 서비스 통신 오류" },
            { status: 500 }
        );
    }
}
