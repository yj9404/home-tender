"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface MultiSelectProps {
    label: string;
    items: { id: string; name: string }[];
    selectedNames: string[];
    onChange: (selectedNames: string[]) => void;
    placeholder?: string;
}

export default function MultiSelect({ label, items, selectedNames, onChange, placeholder }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleItem = (name: string) => {
        if (selectedNames.includes(name)) {
            onChange(selectedNames.filter(n => n !== name));
        } else {
            onChange([...selectedNames, name]);
        }
    };

    const removeItem = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        onChange(selectedNames.filter(n => n !== name));
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            <div 
                className="min-h-[42px] w-full bg-black/20 border border-white/10 rounded-lg p-1.5 flex flex-wrap gap-1.5 cursor-pointer relative pr-10"
                onClick={() => setIsOpen(true)}
            >
                {selectedNames.length === 0 ? (
                    <span className="text-gray-500 text-sm p-1 ml-1 pt-0.5">{placeholder || "목록에서 선택..."}</span>
                ) : (
                    selectedNames.map(name => (
                        <span key={name} className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-0.5 rounded-md text-xs border border-primary/20 font-medium whitespace-nowrap">
                            {name}
                            <button type="button" onClick={(e) => removeItem(e, name)} className="hover:text-red-400 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))
                )}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 flex items-center gap-1">
                    {selectedNames.length > 0 && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onChange([]); }} className="p-0.5 hover:text-white rounded-md transition-colors mr-0.5">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#1a1c23] border border-white/10 rounded-lg shadow-2xl overflow-hidden max-h-60 flex flex-col">
                    <div className="p-2 border-b border-white/10 bg-black/20 flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="재료명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent text-sm w-full text-white placeholder-gray-500 focus:outline-none"
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto p-1 py-2 custom-scrollbar">
                        {filteredItems.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-500">결과가 없습니다.</div>
                        ) : (
                            filteredItems.map(item => {
                                const isSelected = selectedNames.includes(item.name);
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-3 py-2 px-3 mx-1 rounded-md cursor-pointer text-sm mb-0.5 transition-colors ${isSelected ? "bg-primary/10 text-primary font-medium" : "text-gray-300 hover:bg-white/5"}`}
                                        onClick={() => toggleItem(item.name)}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "border-primary bg-primary text-black" : "border-gray-500"}`}>
                                            {isSelected && <Check className="w-3 h-3 font-bold" />}
                                        </div>
                                        {item.name}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
