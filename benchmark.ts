const ingredients = Array.from({ length: 10000 }, (_, i) => ({
    id: `id_${i}`,
    name: `Ingredient ${i}`,
    isSoldOut: i % 2 === 0
}));

const targetId = 'id_0';

console.time('filter_map');
for(let k = 0; k < 1000; k++) {
    const currentSoldOutNames = new Set(
        ingredients.filter(i => i.isSoldOut && i.id !== targetId).map(i => i.name)
    );
}
console.timeEnd('filter_map');

console.time('reduce');
for(let k = 0; k < 1000; k++) {
    const currentSoldOutNames = ingredients.reduce((acc, i) => {
        if (i.isSoldOut && i.id !== targetId) {
            acc.add(i.name);
        }
        return acc;
    }, new Set<string>());
}
console.timeEnd('reduce');

console.time('for_loop');
for(let k = 0; k < 1000; k++) {
    const currentSoldOutNames = new Set<string>();
    for (let i = 0; i < ingredients.length; i++) {
        const item = ingredients[i];
        if (item.isSoldOut && item.id !== targetId) {
            currentSoldOutNames.add(item.name);
        }
    }
}
console.timeEnd('for_loop');
