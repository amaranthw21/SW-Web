import { cleanEntry, sizeLabel } from "../../lib/pokedex";


// Los enemigos que pueden salir en una mazmorra, sacados de la Pokédex
// (src/content/pokedex/*.json): los que tienen esa mazmorra marcada. Los mini
// jefes y los jefes no salen nunca al azar; esos los pone el moderador.
//
// Es la Pokédex entera, no la vista pública: los moderadores ven también lo
// que los jugadores aún no han descubierto. Se lee la del build, así que un
// enemigo recién creado en el panel entra cuando se publica la web.
const modules = import.meta.glob("../../content/pokedex/*.json", { eager: true, import: "default" });

const NOT_RANDOM = ["miniboss", "boss"];


export const ENEMIES_BY_ID = Object.fromEntries(
    Object.entries(modules).map(([path, data]) => {
        const id = path.split("/").pop().replace(".json", "");
        return [id, { ...cleanEntry(data), id }];
    })
);


// La Pokédex guarda la mazmorra como se lee ("Inferno Cave") y la lista de
// objetos en mayúsculas ("INFERNO CAVE"): se comparan sin mayúsculas.
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();


export function enemiesFor(dungeon){

    if(!dungeon){
        return [];
    }

    return Object.values(ENEMIES_BY_ID)
        .filter(entry => !NOT_RANDOM.includes(entry.size))
        .filter(entry => entry.dungeons.some(name => same(name, dungeon)))
        .map(entry => ({ id: entry.id }));

}


export function enemyName(entry){

    return entry.name || (entry.number != null ? `Unnamed #${entry.number}` : "Unnamed enemy");

}


export { sizeLabel };
