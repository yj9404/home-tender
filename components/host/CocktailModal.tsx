"use client";

import { useState, useEffect } from "react";
import { Cocktail, Ingredient } from "@/types";
import { X } from "lucide-react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import MultiSelect from "./MultiSelect";

interface CocktailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Cocktail>) => Promise<void>;
    cocktail: Cocktail | null;
}

export default function CocktailModal({ isOpen, onClose, onSave, cocktail }: CocktailModalProps) {
    const [name, setName] = useState("");
    const [baseSpirits, setBaseSpirits] = useState<string[]>([]);
    const [fruits, setFruits] = useState<string[]>([]);
    const [beverages, setBeverages] = useState<string[]>([]);
    const [herbs, setHerbs] = useState<string[]>([]);
    const [others, setOthers] = useState<string[]>([]);
    const [note, setNote] = useState("");
    const [abv, setAbv] = useState("");
    const [recipe, setRecipe] = useState("");
    const [flavorTags, setFlavorTags] = useState("");
    const [sweetness, setSweetness] = useState(3);
    const [isActive, setIsActive] = useState(true);
    
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchIngredients = async () => {
            try {
                const q = query(collection(db, "ingredients"), orderBy("name"));
                const snap = await getDocs(q);
                setAllIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ingredient)));
            } catch (err) {
                console.error("Failed to fetch ingredients:", err);
            }
        };

        fetchIngredients();

        if (cocktail) {
            setName(cocktail.name || "");
            setBaseSpirits(cocktail.baseSpirits || []);
            setFruits(cocktail.ingredients?.fruits || []);
            setBeverages(cocktail.ingredients?.beverages || []);
            setHerbs(cocktail.ingredients?.herbs || []);
            setOthers(cocktail.ingredients?.others || []);
            setNote(cocktail.note || "");
            setAbv(cocktail.abv || "");
            setRecipe(cocktail.recipe || "");
            setFlavorTags((cocktail.flavorTags || []).join(", "));
            setSweetness(cocktail.sweetness || 3);
            setIsActive(cocktail.isActive ?? true);
        } else {
            setName("");
            setBaseSpirits([]);
            setFruits([]);
            setBeverages([]);
            setHerbs([]);
            setOthers([]);
            setNote("");
            setAbv("");
            setRecipe("");
            setFlavorTags("");
            setSweetness(3);
            setIsActive(true);
        }
    }, [cocktail, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const parseTags = (str: string) => str.split(",").map(s => s.trim()).filter(Boolean);

        const data: Partial<Cocktail> = {
            name: name.trim(),
            baseSpirits,
            ingredients: {
                fruits,
                beverages,
                herbs,
                others,
            },
            note: note.trim(),
            abv: abv.trim(),
            recipe: recipe.trim(),
            flavorTags: parseTags(flavorTags),
            sweetness: Number(sweetness),
            isActive,
            imageUrl: cocktail?.imageUrl || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
        };

        try {
            await onSave(data);
            onClose();
        } catch (error) {
            console.error(error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const getItemsByCategory = (cat: string) => allIngredients.filter(i => i.category === cat);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="bg-surface/90 backdrop-blur-md p-4 flex justify-between items-center z-10 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">{cocktail ? "레시피 수정" : "새 레시피 추가"}</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto w-full custom-scrollbar">
                    <form onSubmit={handleSubmit} className="p-4 space-y-5" id="cocktail-form">
                        <div>
                            <label className="block text-sm font-semibold text-primary mb-1">칵테일명 *</label>
                            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="예: 마가리타" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-primary mb-1">도수 (ABV) *</label>
                                <input required type="text" placeholder="예: 25%" value={abv} onChange={e => setAbv(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-primary mb-1">주문 가능 상태</label>
                                <div className="flex items-center h-[46px] bg-black/10 px-3 rounded-lg border border-white/5">
                                    <label className="flex items-center gap-3 cursor-pointer w-full">
                                        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded bg-black/20 border-white/10 text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer" />
                                        <span className="text-sm font-medium text-gray-300">현재 판매 가능</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-white/[0.03] rounded-xl border border-white/5">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                레시피 구성 재료
                            </h3>
                            
                            <MultiSelect 
                                label="기주 (Base Spirits)" 
                                items={getItemsByCategory("base")} 
                                selectedNames={baseSpirits} 
                                onChange={setBaseSpirits}
                                placeholder="기주 선택..." 
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <MultiSelect 
                                    label="과일 (Fruits)" 
                                    items={getItemsByCategory("fruit")} 
                                    selectedNames={fruits} 
                                    onChange={setFruits} 
                                />
                                <MultiSelect 
                                    label="음료 (Beverages)" 
                                    items={getItemsByCategory("beverage")} 
                                    selectedNames={beverages} 
                                    onChange={setBeverages} 
                                />
                                <MultiSelect 
                                    label="허브 (Herbs)" 
                                    items={getItemsByCategory("herb")} 
                                    selectedNames={herbs} 
                                    onChange={setHerbs} 
                                />
                                <MultiSelect 
                                    label="기타 (Others)" 
                                    items={getItemsByCategory("other")} 
                                    selectedNames={others} 
                                    onChange={setOthers} 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-primary mb-1">제조 레시피 *</label>
                            <textarea required rows={4} value={recipe} onChange={e => setRecipe(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white resize-none text-sm placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="만드는 법을 상세히 적어주세요." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-primary mb-1">맛 태그 (쉼표 구분)</label>
                                <input type="text" placeholder="상큼, 달달..." value={flavorTags} onChange={e => setFlavorTags(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-primary mb-1">단맛 평가 (1~5)</label>
                                <input type="number" min="1" max="5" value={sweetness} onChange={e => setSweetness(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-primary mb-1">비고 및 설명</label>
                            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="추가 노트 사항" />
                        </div>
                    </form>
                </div>

                <div className="p-4 bg-surface/90 border-t border-white/5 flex gap-3">
                    <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-300 font-bold hover:bg-white/5 transition-colors">
                        취소
                    </button>
                    <button type="submit" form="cocktail-form" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-primary text-black font-extrabold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all">
                        {loading ? "저장 중..." : "저장하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}
