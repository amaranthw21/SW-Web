import items from "../../data/items";
import { BUNDLED_DEFINITIONS, placeKey } from "./definitions";


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


// Las mazmorras: las de la lista de objetos y las que tienen ficha propia
// (aunque aún no tengan objetos). El valor va en mayúsculas, como en la lista
// de objetos; el nombre, como lo escribe la ficha si la hay.
export function dungeonOptions(definitions = BUNDLED_DEFINITIONS){

    const named = Object.fromEntries(
        Object.values(definitions)
            .filter(data => data?.name)
            .map(data => [placeKey(data.name), data.name.trim()])
    );

    const values = new Set([
        ...findable.flatMap(item => item.locations ?? []).filter(location => location !== ANYWHERE),
        ...Object.keys(named)
    ]);

    return [...values]
        .sort()
        .map(value => ({ value, label: named[value] ?? dungeonLabel(value) }));

}


export const DUNGEONS = dungeonOptions();


export function lootFor(dungeon){

    if(!dungeon){
        return [];
    }

    return findable
        .filter(item => item.locations?.includes(dungeon) || item.locations?.includes(ANYWHERE))
        .map(item => ({ id: item.id, rarity: item.rarity }));

}
