// Los personajes, NPCs y de jugadores. Cada uno vive en su carpeta, con su JSON
// y sus imágenes juntos (editable desde el panel, en "Characters"):
//
//     src/content/characters/ampelo/ampelo.json
//     src/content/characters/ampelo/ampelo-portrait.webp
//
// El id del personaje (y su dirección, /characters/<id>) es el nombre de la
// carpeta.
const modules = import.meta.glob("../content/characters/*/*.json", { eager: true });

// Igual que en las islas: Vite empaqueta las imágenes de las carpetas y
// devuelve su dirección final.
const images = import.meta.glob(
    "../content/characters/*/*.{png,jpg,jpeg,webp,avif,gif}",
    { eager: true, query: "?url", import: "default" }
);


export const KINDS = [
    { value: "npc",    label: "NPC" },
    { value: "player", label: "Player character" }
];

export const CHARACTER_STATUSES = [
    { value: "available", label: "Available" },
    { value: "reserved",  label: "Reserved" },
    { value: "taken",     label: "In use" }
];


function folderOf(path){

    return path.split("/").at(-2);

}


// El JSON guarda solo el nombre del archivo; si no está en la carpeta se deja
// tal cual, para que una ruta de public/ o una dirección externa sigan valiendo.
function resolveImage(id, image){

    const name = image?.trim();

    if(!name){
        return name;
    }

    return images[`../content/characters/${id}/${name.replace(/^\.?\//, "")}`] ?? name;

}


const characters = Object.entries(modules)
    .map(([path, mod]) => {
        const id = folderOf(path);
        const data = mod.default ?? mod;
        return {
            ...data,
            id,
            kind: data.kind === "player" ? "player" : "npc",
            // Las islas que guarda. Antes era una casilla ("guardián de su
            // isla"); un JSON que aún la tenga se lee igual.
            guardianOf: data.guardianOf ?? (data.guardian && data.island ? [data.island] : []),
            image: resolveImage(id, data.image),
            gallery: (data.gallery ?? [])
                .map(item => ({ ...item, image: resolveImage(id, item?.image) }))
                .filter(item => item.image)
        };
    })
    .sort((a, b) => a.name.localeCompare(b.name));


// Los de una isla: los que viven en ella y los que la guardan, con los
// guardianes delante, que es lo primero que se quiere ver.
export function charactersOf(islandId){

    const guards = character => character.guardianOf.includes(islandId);

    return characters
        .filter(character => character.island === islandId || guards(character))
        .sort((a, b) => Number(guards(b)) - Number(guards(a)));

}


// Todas las islas con las que tiene que ver: la suya y las que guarda.
export function islandsOf(character){

    return [...new Set([character.island, ...character.guardianOf].filter(Boolean))];

}


export default characters;
