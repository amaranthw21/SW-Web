// La Pokédex: los enemigos de las mazmorras. Cada uno es un JSON en
// src/content/pokedex/<id>.json (su imagen, en public/dex/) y se edita en el
// panel (?view=pokedex). La página pública (/pokedex) solo enseña lo que los
// moderadores han marcado como descubierto; lo demás sale como ???.
//
// Lo oculto no es secreto de verdad: el repo es público y quien sepa mirar en
// GitHub lo encuentra. Se decidió así a propósito; para los jugadores basta
// con que la web no lo enseñe.
//
// Hay dos clases de enemigo:
//   - Amalgamas: fusiones, con hasta 3 tipos. Su tamaño fija cuántos
//     movimientos tienen.
//   - Jefes: como un Pokémon normal, 1 o 2 tipos más un tipo oculto, una
//     habilidad y 6 movimientos.


export const KINDS = [
    { value: "amalgam", label: "Amalgam", plural: "Amalgams" },
    { value: "boss",    label: "Boss",    plural: "Bosses" }
];

// `moves` es [mínimo, máximo].
export const SIZES = [
    { value: "small",    label: "Small",     moves: [2, 3] },
    { value: "medium",   label: "Medium",    moves: [4, 5] },
    { value: "large",    label: "Large",     moves: [6, 6] },
    { value: "miniboss", label: "Mini boss", moves: [6, 6] }
];

const BOSS_MOVES = [6, 6];

export const MAX_MOVES = 6;

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const FOLDER = "src/content/pokedex";

export const IMAGE_FOLDER = "dex";

// Los ids son el nombre del archivo. Van al azar y no salen del nombre del
// enemigo: así se puede crear antes de saber cómo se llama, y renombrarlo no
// cambia el archivo.


export function newId(){

    const bytes = crypto.getRandomValues(new Uint8Array(8));

    return Array.from(bytes, byte => byte.toString(36).padStart(2, "0")).join("").slice(0, 12);

}


export function typeSlots(kind){

    return kind === "boss" ? 2 : 3;

}


export function moveRange(entry){

    if(entry.kind === "boss"){
        return BOSS_MOVES;
    }

    return SIZES.find(size => size.value === entry.size)?.moves ?? [1, MAX_MOVES];

}


export function sizeLabel(size){

    return SIZES.find(item => item.value === size)?.label ?? size;

}


export function emptyEntry(kind = "amalgam"){

    return cleanEntry({ kind });

}


function text(value, max){

    return typeof value === "string" ? value.trim().slice(0, max) : "";

}


function texts(value, count, max){

    return (Array.isArray(value) ? value : []).slice(0, count).map(item => text(item, max));

}


function flags(value, count){

    return Array.from({ length: count }, (_, i) => Array.isArray(value) && value[i] === true);

}


// Deja una entrada con la forma de siempre, venga de donde venga (el panel,
// el KV o una entrada a medias). Las listas de lo descubierto se alinean con
// las de tipos y movimientos: `revealed.moves[2]` es el tercer movimiento.
//
export function cleanEntry(input = {}){

    const kind = input.kind === "boss" ? "boss" : "amalgam";
    const number = Number.isInteger(input.number) ? input.number : null;

    const types = texts(input.types, typeSlots(kind), 40);
    const moves = texts(input.moves, MAX_MOVES, 80);
    const revealed = input.revealed ?? {};

    const entry = {
        kind,
        number,
        name: text(input.name, 80),
        size: kind === "amalgam" ? (SIZES.some(size => size.value === input.size) ? input.size : "small") : null,
        types,
        hiddenType: kind === "boss" ? text(input.hiddenType, 40) : "",
        ability: text(input.ability, 80),
        abilityText: text(input.abilityText, 1000),
        moves,
        description: text(input.description, 4000),
        dungeons: texts(input.dungeons, 30, 80).filter(Boolean),
        image: text(input.image, 300),
        notes: text(input.notes, 4000),
        revealed: {
            seen: revealed.seen === true,
            name: revealed.name === true,
            image: revealed.image === true,
            types: flags(revealed.types, types.length),
            hiddenType: kind === "boss" && revealed.hiddenType === true,
            ability: revealed.ability === true,
            moves: flags(revealed.moves, moves.length),
            description: revealed.description === true,
            dungeons: revealed.dungeons === true
        }
    };

    return entry;

}


// Lo que ve la web pública de una entrada: lo descubierto tal cual y, en su
// lugar, null en lo que no. Los huecos se mantienen (tres tipos, cinco
// movimientos…) para que se vea cuántos quedan por descubrir. Una entrada que
// nadie ha visto aún no sale.
//
// Las notas de los moderadores no salen en la web.
export function publicView(entry){

    const { revealed } = entry;

    if(!revealed?.seen){
        return null;
    }

    const show = (flag, value) => flag && value ? value : null;

    // Solo los huecos rellenos, cada uno con su marca de descubierto.
    const slots = (values, flags) => values
        .map((value, i) => ({ value, flag: flags[i] }))
        .filter(slot => slot.value)
        .map(slot => show(slot.flag, slot.value));

    return {
        id: entry.id,
        kind: entry.kind,
        number: entry.number,
        size: entry.size,
        name: show(revealed.name, entry.name),
        image: show(revealed.image, entry.image),
        types: slots(entry.types, revealed.types),
        hiddenType: entry.kind === "boss" ? show(revealed.hiddenType, entry.hiddenType) : null,
        ability: show(revealed.ability, entry.ability),
        abilityText: show(revealed.ability, entry.abilityText),
        moves: slots(entry.moves, revealed.moves),
        description: show(revealed.description, entry.description),
        dungeons: revealed.dungeons ? entry.dungeons : null
    };

}


// Cuánto se ha descubierto, para el resumen del panel: "5 / 12".
export function revealCount(entry){

    const { revealed } = entry;

    const slots = [
        revealed.name,
        revealed.image,
        ...revealed.types.filter((_, i) => entry.types[i]),
        ...(entry.kind === "boss" ? [revealed.hiddenType] : []),
        revealed.ability,
        ...revealed.moves.filter((_, i) => entry.moves[i]),
        revealed.description,
        revealed.dungeons
    ];

    return { shown: slots.filter(Boolean).length, total: slots.length };

}


export function compareEntries(a, b){

    return (a.number ?? Infinity) - (b.number ?? Infinity)
        || (a.name ?? "").localeCompare(b.name ?? "");

}
