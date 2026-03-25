"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { Cocktail } from "@/types";
import {
    subscribeHostCocktails,
    addHostCocktail,
    updateHostCocktail,
    deleteHostCocktail,
    importSharedCocktailsToHost,
} from "@/lib/firebase/cocktails";
import { Search, Plus, Pencil, Trash2, Download } from "lucide-react";
import CocktailModal from "@/components/host/CocktailModal";

export default function HostCocktailsPage() {
    const { user } = useAuth();
    const [cocktails, setCocktails] = useState<Cocktail[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCocktail, setEditingCocktail] = useState<Cocktail | null>(null);

    useEffect(() => {
        if (!user) return;

        const unsub = subscribeHostCocktails(user.uid, false, (data) => {
            setCocktails(data);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const handleSave = async (data: Partial<Cocktail>) => {
        if (!user) return;
        if (editingCocktail) {
            await updateHostCocktail(user.uid, editingCocktail.id, data);
        } else {
            await addHostCocktail(user.uid, data as Omit<Cocktail, "id" | "createdAt">);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!user) return;
        if (confirm(`'${name}' 레시피를 정말 삭제하시겠습니까?`)) {
            try {
                await deleteHostCocktail(user.uid, id);
            } catch (err) {
                console.error(err);
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    };

    const handleImport = async () => {
        if (!user) return;
        if (!confirm("공유 레시피 카탈로그 전체를 내 레시피로 가져올까요?")) return;
        try {
            setImporting(true);
            const count = await importSharedCocktailsToHost(user.uid);
            if (count === 0) alert("가져올 공유 레시피가 없습니다.");
            else alert(`${count}개의 레시피를 가져왔습니다.`);
        } catch (err) {
            console.error(err);
            alert("가져오기 중 오류가 발생했습니다.");
        } finally {
            setImporting(false);
        }
    };

    const handleAddNew = () => {
        setEditingCocktail(null);
        setIsModalOpen(true);
    };

    const handleEdit = (cocktail: Cocktail) => {
        setEditingCocktail(cocktail);
        setIsModalOpen(true);
    };

    if (loading) return <div className="animate-pulse p-4 flex justify-center mt-10">칵테일 정보를 불러오는 중입니다...</div>;

    const filteredCocktails = cocktails.filter(cocktail => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;

        const allIngredientsText = [
            ...(cocktail.ingredients?.fruits || []),
            ...(cocktail.ingredients?.beverages || []),
            ...(cocktail.ingredients?.herbs || []),
            ...(cocktail.ingredients?.others || [])
        ].filter(Boolean).join(" ").toLowerCase();
        const baseSpiritsText = (cocktail.baseSpirits || []).join(" ").toLowerCase();
        const nameText = cocktail.name.toLowerCase();

        return nameText.includes(term) || baseSpiritsText.includes(term) || allIngredientsText.includes(term);
    });

    return (
        <div className="flex flex-col gap-6 mb-8 mt-2">
            <div className="text-center space-y-2 animate-[slide-up_0.5s_ease-out]">
                <h1 className="text-3xl font-bold tracking-tight">Cocktail Recipes</h1>
                <p className="text-gray-400 text-sm">호스트 전용 칵테일 레시피 관리</p>
            </div>

            {/* 신규 호스트 온보딩 배너 */}
            {!loading && cocktails.length === 0 && (
                <div className="glass-panel border border-primary/30 bg-primary/5 rounded-2xl p-5 flex flex-col items-center gap-3 text-center animate-[slide-up_0.4s_ease-out]">
                    <Download className="w-8 h-8 text-primary" />
                    <div>
                        <p className="font-bold text-white">아직 레시피가 없어요</p>
                        <p className="text-gray-400 text-sm mt-1">공유 레시피 카탈로그에서 기본 레시피를 가져오거나, 직접 추가해보세요.</p>
                    </div>
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="btn-primary px-6 py-2.5 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {importing ? "가져오는 중..." : "공유 레시피 가져오기"}
                    </button>
                </div>
            )}

            <div className="flex items-center gap-3 animate-[slide-up_0.6s_ease-out]">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="칵테일 명, 기주, 재료 검색..."
                        className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-surface/40 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors shadow-inner"
                    />
                </div>
                <button onClick={handleAddNew} className="bg-primary text-black p-3 rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5 font-bold" />
                </button>
            </div>

            <div className="space-y-4">
                {filteredCocktails.map(cocktail => {
                    const allIngredients = [
                        ...(cocktail.ingredients?.fruits || []),
                        ...(cocktail.ingredients?.beverages || []),
                        ...(cocktail.ingredients?.herbs || []),
                        ...(cocktail.ingredients?.others || [])
                    ].filter(Boolean);

                    return (
                        <div key={cocktail.id} className="glass-panel p-4 rounded-xl space-y-3 bg-surface/40 hover:bg-surface/50 transition-colors border border-white/5 relative group">

                            {/* Action Buttons */}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <button onClick={() => handleEdit(cocktail)} className="p-1.5 bg-white/5 rounded hover:bg-primary/20 hover:text-primary transition-colors text-gray-400">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(cocktail.id, cocktail.name)} className="p-1.5 bg-white/5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors text-gray-400">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex justify-between items-start pr-16">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        {cocktail.name}
                                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                            {cocktail.abv.includes('%') ? cocktail.abv : `${cocktail.abv}%`}
                                        </span>
                                    </h2>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded border font-bold ${cocktail.isActive ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {cocktail.isActive ? "주문 가능" : "재료 소진"}
                                </div>
                            </div>

                            <div className="space-y-2 mt-2 text-sm text-gray-300 bg-black/20 p-3 rounded-lg border border-black/10">
                                <div className="flex items-start gap-3">
                                    <span className="font-semibold text-primary min-w-[2.5rem] mt-0.5">기주</span>
                                    <span className="leading-snug">{(cocktail.baseSpirits || []).join(", ") || "-"}</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="font-semibold text-primary min-w-[2.5rem] mt-0.5">재료</span>
                                    <span className="leading-snug">{allIngredients.join(", ") || "-"}</span>
                                </div>
                            </div>

                            <div className="flex flex-col mt-3 pt-3 border-t border-white/5">
                                <span className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">직접 입력 레시피</span>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-200">
                                    {cocktail.recipe}
                                </p>
                            </div>
                        </div>
                    );
                })}
                {filteredCocktails.length === 0 && !loading && cocktails.length > 0 && (
                    <div className="text-center py-10 text-gray-500">
                        검색 결과가 없습니다.
                    </div>
                )}
            </div>

            <CocktailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                cocktail={editingCocktail}
                hostUid={user?.uid ?? ""}
            />
        </div>
    );
}
