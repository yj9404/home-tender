"use client";

import { Cocktail } from "@/types";
import { AlertCircle } from "lucide-react";

export default function CocktailCard({
    cocktail,
    onClick,
}: {
    cocktail: Cocktail;
    onClick: () => void;
}) {
    const isAvailable = cocktail.isActive;
    const firstLetter = cocktail.name.charAt(0);

    return (
        <div
            onClick={isAvailable ? onClick : undefined}
            className={
                isAvailable
                    ? "flex gap-4 p-4 rounded-2xl border transition-all glass-panel bg-surface/40 hover:bg-surface/60 cursor-pointer border-white/10 relative overflow-hidden group"
                    : "flex gap-4 p-4 rounded-2xl border bg-surface/20 border-white/5 opacity-50 cursor-not-allowed grayscale relative overflow-hidden"
            }
        >
            {isAvailable && (
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            )}

            <div
                className={`w-20 h-24 rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden ${isAvailable ? "bg-gradient-to-tr from-primary/40 to-purple-500/40" : "bg-gray-600/40"
                    }`}
                style={isAvailable && cocktail.imageUrl ? { backgroundImage: `url(${cocktail.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            >
                {(!cocktail.imageUrl || !isAvailable) && (
                    <span className={`text-2xl font-bold ${isAvailable ? "text-white/50" : "text-white/30"}`}>
                        {firstLetter}
                    </span>
                )}

                {!isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-red-300 bg-red-900/80 px-2 py-1 rounded shadow-lg border border-red-500/30">
                            SOLD OUT
                        </span>
                    </div>
                )}
            </div>

            <div className={`flex-1 flex flex-col py-1 ${isAvailable ? "z-10" : ""}`}>
                <div className="flex justify-between items-start">
                    <h3 className={`text-lg font-bold transition-colors ${isAvailable ? "text-white group-hover:text-primary" : "text-white/50"}`}>
                        {cocktail.name}
                    </h3>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border ${isAvailable ? "font-bold text-white bg-white/10 border-white/5" : "font-medium text-gray-500 bg-white/5 border-transparent"}`}>
                        {cocktail.abv}%
                    </span>
                </div>

                {isAvailable ? (
                    <>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{cocktail.note || "새콤 달콤 칵테일"}</p>
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                            {cocktail.flavorTags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-[10px] text-primary/90 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shadow-inner">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-[11px] text-red-400/80 font-medium bg-red-500/10 self-start px-2 py-0.5 rounded border border-red-500/20 mt-2">
                        <AlertCircle className="w-3 h-3 inline pb-0.5 mr-1" />
                        주문 불가 (재료 소진)
                    </p>
                )}
            </div>
        </div>
    );
}
