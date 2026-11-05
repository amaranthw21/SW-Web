import { HALL, HAZARD, ROOM, WALL, shortestPath } from "./generate";
import { ITEMS_BY_ID } from "./loot";
import { ENEMIES_BY_ID, enemyName } from "./enemies";


// Un "piso" es lo que se dibuja y se lista: el mapa con sus objetos y enemigos
// ya con nombre, imagen y demás. Sale del generador o de una mazmorra
// guardada; las vistas no distinguen de dónde viene.
//
// Los pisos guardados van en src/content/dungeon-runs/<id>.json, con el mapa
// entero y una copia de cada objeto y enemigo: así no cambian aunque luego se
// toque la lista de objetos, la Pokédex o el propio generador.

export const FOLDER = "src/content/dungeon-runs";

const CHARS = { [WALL]: "#", [ROOM]: ".", [HALL]: ",", [HAZARD]: "~" };
const TILES = Object.fromEntries(Object.entries(CHARS).map(([tile, char]) => [char, Number(tile)]));


export function floorFromDungeon(dungeon){

    return {
        width: dungeon.width,
        height: dungeon.height,
        tiles: dungeon.tiles,
        start: dungeon.start,
        stairs: dungeon.stairs,
        path: dungeon.path,
        hazard: dungeon.hazard,
        stats: {
            rooms: dungeon.rooms.length,
            routes: dungeon.routes,
            walkable: dungeon.walkable,
            hazardRooms: dungeon.hazardRooms.length,
            hazardHalls: dungeon.hazardHalls.length
        },
        items: dungeon.items.map(spot => {
            const item = ITEMS_BY_ID[spot.id] ?? {};
            return { x: spot.x, y: spot.y, guarded: spot.guarded, id: spot.id, name: item.name ?? spot.id, rarity: item.rarity ?? "Common", image: item.image ?? "" };
        }),
        enemies: dungeon.enemies.map(spot => {
            const entry = ENEMIES_BY_ID[spot.id];
            return {
                x: spot.x,
                y: spot.y,
                id: spot.id,
                name: entry ? enemyName(entry) : spot.id,
                size: entry?.size ?? "",
                types: entry?.types.filter(Boolean) ?? [],
                image: entry?.image ?? ""
            };
        })
    };

}


// `settings` son las opciones con las que se generó (semilla, tamaño…), para
// saber de dónde salió; `place` es la mazmorra de la lista de objetos.
export function toSnapshot(floor, { name, place, settings, user }){

    return {
        name,
        dungeon: place,
        createdBy: user,
        createdAt: new Date().toISOString(),
        settings,
        map: {
            width: floor.width,
            height: floor.height,
            rows: floor.tiles.map(row => row.map(tile => CHARS[tile]).join(""))
        },
        start: floor.start,
        stairs: floor.stairs,
        hazard: floor.hazard,
        stats: floor.stats,
        items: floor.items,
        enemies: floor.enemies,
        details: floor.details ?? null
    };

}


export function fromSnapshot(data){

    const tiles = data.map.rows.map(row => [...row].map(char => TILES[char] ?? WALL));

    return {
        width: data.map.width,
        height: data.map.height,
        tiles,
        start: data.start,
        stairs: data.stairs,
        path: shortestPath(tiles, data.start, data.stairs) ?? [data.start],
        hazard: data.hazard ?? null,
        stats: data.stats,
        items: data.items ?? [],
        enemies: data.enemies ?? [],
        details: data.details ?? null
    };

}


// Nombre de archivo: la fecha delante, para que se ordenen solas, y un poco
// de azar por si dos se guardan a la vez.
export function newDungeonPath(){

    const random = Math.random().toString(36).slice(2, 7);

    return `${FOLDER}/${Date.now().toString(36)}-${random}.json`;

}


export function idOf(path){

    return path.split("/").pop().replace(".json", "");

}
