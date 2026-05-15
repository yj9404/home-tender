
const { performance } = require('perf_hooks');

const sampleCocktail = {
    name: "Classic Martini",
    baseSpirits: ["Gin"],
    ingredients: {
        fruits: ["Lemon Peel"],
        beverages: ["Dry Vermouth"],
        herbs: [],
        others: ["Orange Bitters"]
    },
    abv: "35%",
    isActive: true
};

const cocktails = Array.from({ length: 1000 }, (_, i) => ({
    ...sampleCocktail,
    id: i.toString(),
    name: `${sampleCocktail.name} ${i}`
}));

function currentFilter(cocktails, searchTerm) {
    return cocktails.filter(cocktail => {
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
}

function optimizedFilter(cocktailsWithSearch, searchTerm) {
    const term = searchTerm.toLowerCase();
    if (!term) return cocktailsWithSearch;
    return cocktailsWithSearch.filter(c => c.searchableText.includes(term));
}

const cocktailsWithSearch = cocktails.map(cocktail => {
    const allIngredientsText = [
        ...(cocktail.ingredients?.fruits || []),
        ...(cocktail.ingredients?.beverages || []),
        ...(cocktail.ingredients?.herbs || []),
        ...(cocktail.ingredients?.others || [])
    ].filter(Boolean).join(" ").toLowerCase();
    const baseSpiritsText = (cocktail.baseSpirits || []).join(" ").toLowerCase();
    const nameText = cocktail.name.toLowerCase();

    return {
        ...cocktail,
        searchableText: `${nameText} ${baseSpiritsText} ${allIngredientsText}`
    };
});

const searchTerm = "Martini 500";
const iterations = 100;

console.log(`Running benchmark with ${cocktails.length} cocktails and ${iterations} iterations...`);

const startA = performance.now();
for (let i = 0; i < iterations; i++) {
    currentFilter(cocktails, searchTerm);
}
const endA = performance.now();
console.log(`Current filter took: ${(endA - startA).toFixed(4)}ms`);

const startB = performance.now();
for (let i = 0; i < iterations; i++) {
    optimizedFilter(cocktailsWithSearch, searchTerm);
}
const endB = performance.now();
console.log(`Optimized filter took: ${(endB - startB).toFixed(4)}ms`);

const improvement = ((endA - startA) - (endB - startB)) / (endA - startA) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}%`);
