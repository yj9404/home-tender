import { Timestamp } from "firebase/firestore";

// ─── Cocktail ─────────────────────────────────────────────────────────────────

export interface CocktailIngredients {
  fruits: string[];
  beverages: string[];
  herbs: string[];
  others: string[];
}

export interface Cocktail {
  id: string;
  name: string;
  baseSpirits: string[]; // 기주 (진, 보드카 등)
  ingredients: CocktailIngredients;
  note: string; // 비고
  abv: string; // 도수
  recipe: string; // 레시피 전문
  imageUrl: string;
  flavorTags: string[]; // ["새콤", "달콤", "상큼"] - AI 추천용
  sweetness: number; // 1(드라이) ~ 5(달달)
  isActive: boolean; // 재료 기반 자동 계산 여부
  createdAt: Timestamp;
}

// ─── Ingredient ───────────────────────────────────────────────────────────────

export type IngredientCategory =
  | "base"
  | "fruit"
  | "beverage"
  | "herb"
  | "other";

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  isSoldOut: boolean;
  updatedAt: Timestamp;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  hostUid: string;
  token: string; // URL 공유용 12자 랜덤 토큰
  isOrderPaused: boolean;
  expiresAt: Timestamp; // 생성 후 12시간
  createdAt: Timestamp;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "making" | "done";
export type OrderRating = "like" | "dislike" | null;

export interface OrderCustomization {
  lessSugar: boolean;
  lessIce: boolean;
  excludeIngredients: string[]; // ["계란흰자"]
  memo: string;
}

export interface Order {
  id: string;
  sessionId: string;
  guestId: string; // 로컬스토리지 UUID (익명 식별)
  guestName: string; // 손님 닉네임
  cocktailId: string;
  cocktailName: string;
  customizations: OrderCustomization;
  status: OrderStatus;
  rating: OrderRating;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  sessionToken: string;
  guestId: string;
  guestName: string;
  cocktailId: string;
  cocktailName: string;
  customizations: OrderCustomization;
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  rating?: OrderRating;
}

export interface AIRecommendPayload {
  sessionToken: string;
  message: string;
  history: Array<{ role: "user" | "model"; text: string }>;
}
