import items from "../../data/items";


// Qué objetos salen en cada mazmorra, sacado de la lista de objetos: los que se
// consiguen encontrándolos ("FIND") y tienen esa mazmorra en sus lugares, más
// los que salen en cualquier sitio ("ANYWHERE"). Así, al añadir un objeto o
// una mazmorra nueva desde el panel, el generador lo tiene en cuenta solo.
const ANYWHERE = "ANYWHERE";

const findable = items.filter(item => item.howToGet === "FIND");


export const ITEMS_BY_ID = Object.fromEntries(items.map(item => [item.id, item]));


// "VIEN FOREST" → "Vien Forest".
export function dungeonLabel(name){

    return name.toLowerCase().replace(/\b\p{L}/gu, letter => letter.toUpperCase());

}


export const DUNGEONS = [...new Set(findable.flatMap(item => item.locations ?? []))]
    .filter(location => location !== ANYWHERE)
    .sort()
    .map(value => ({ value, label: dungeonLabel(value) }));


export function lootFor(dungeon){

    if(!dungeon){
        return [];
    }

    return findable
        .filter(item => item.locations?.includes(dungeon) || item.locations?.includes(ANYWHERE))
        .map(item => ({ id: item.id, rarity: item.rarity }));

}
