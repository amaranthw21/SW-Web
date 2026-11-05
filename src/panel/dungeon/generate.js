// Generador de mazmorras al estilo Mundo Misterioso: el mapa se parte en una
// rejilla de sectores; cada sector tiene una sala o un cruce de pasillos, y los
// sectores se unen con pasillos en L. Primero se tiende un árbol que pasa por
// todos los sectores (así todo queda conectado) y luego se añaden pasillos de
// sobra, que son los que dan caminos alternativos.
//
// Es determinista: la misma semilla y las mismas opciones dan siempre el mismo
// mapa, para que un moderador pueda pasar el enlace y los demás vean lo mismo.

export const WALL = 0;
export const ROOM = 1;
export const HALL = 2;
export const HAZARD = 3;


// Cada mazmorra tiene un solo tipo de peligro. Las salas con peligro tienen
// un anillo de ese terreno por dentro de sus paredes: para entrar hay que
// cruzarlo, así que solo llega quien tiene la habilidad.
export const HAZARDS = {
    chasm: { label: "Chasm", ability: "Flying" },
    water: { label: "Deep water", ability: "Swimming" },
    lava: { label: "Lava", ability: "Lava walking" }
};


export const SIZES = {
    small: { label: "Small", width: 36, height: 22, cols: 3, rows: 2, items: [4, 6], enemies: [3, 5] },
    medium: { label: "Medium", width: 52, height: 30, cols: 4, rows: 3, items: [6, 9], enemies: [5, 8] },
    large: { label: "Large", width: 68, height: 38, cols: 5, rows: 4, items: [9, 13], enemies: [8, 12] }
};


// Lo fácil que sale cada rareza al repartir objetos por el suelo. Detrás de un
// peligro, lo que no es común sale el doble: es la recompensa por tener la
// habilidad.
export const RARITY_WEIGHTS = {
    "Common": 50,
    "Uncommon": 30,
    "Rare": 15,
    "Super Rare": 5,
    "Special": 2
};

// Probabilidad de que cada unión que no hace falta se añada igualmente.
export const LOOPS = {
    none: { label: "Single path", chance: 0 },
    some: { label: "A few loops", chance: 0.25 },
    many: { label: "Many loops", chance: 0.55 }
};


// Semilla de texto → número (FNV-1a) → generador mulberry32.
function rngFrom(seed){

    let h = 2166136261;

    for(const char of String(seed)){
        h ^= char.codePointAt(0);
        h = Math.imul(h, 16777619);
    }

    let a = h >>> 0;

    const next = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return {
        next,
        int: (min, max) => min + Math.floor(next() * (max - min + 1)),
        pick: list => list[Math.floor(next() * list.length)],
        shuffle(list){
            const out = [...list];
            for(let i = out.length - 1; i > 0; i--){
                const j = Math.floor(next() * (i + 1));
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        }
    };

}


// Uno de la lista, siempre el mismo para la misma semilla y `salt` (el clima,
// el evento…), y sin tocar los generadores del mapa.
export function pickFrom(seed, salt, list){

    return list.length ? rngFrom(`${seed}/${salt}`).pick(list) : null;

}


const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomSeed(){

    let seed = "";

    for(let i = 0; i < 6; i++){
        seed += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }

    return seed;

}


// `hazard`: "random" (lo elige la semilla entre `hazardPool`), "none" o una
// clave de HAZARDS. `hazardPool`: entre cuáles elige "random"; por defecto,
// todos. Vacío, ninguno.
// `loot`: los objetos que pueden salir ([{ id, rarity }]); vacío, ninguno.
// `foes`: los enemigos que pueden salir ([{ id }]); vacío, ninguno.
export function generateDungeon({ seed, size = "medium", loops = "some", hazard = "random", hazardPool = Object.keys(HAZARDS), loot = [], foes = [] }){

    const { width, height, cols, rows, items: itemRange, enemies: enemyRange } = SIZES[size] ?? SIZES.medium;
    const loopChance = (LOOPS[loops] ?? LOOPS.some).chance;

    // Por si acaso: si alguna vez no se pudiera llegar a las escaleras, se
    // vuelve a intentar con la semilla derivada. Con la construcción de abajo
    // no debería pasar nunca, pero así la garantía no depende de ella.
    for(let attempt = 0; attempt < 20; attempt++){

        const key = attempt ? `${seed}#${attempt}` : seed;
        const dungeon = build(rngFrom(key), width, height, cols, rows, loopChance);

        if(dungeon.path){

            // Los peligros salen de otro generador con la misma semilla: así
            // cambiar el tipo de peligro no cambia la forma del mapa.
            const hazardRng = rngFrom(`${key}/hazard`);
            const pool = hazardPool.filter(key => HAZARDS[key]);
            const type = hazard === "random" ? (pool.length ? hazardRng.pick(pool) : null)
                : HAZARDS[hazard] ? hazard
                : null;

            const hazardRooms = type ? hazardousRooms(hazardRng, dungeon) : [];
            const hazardHalls = type ? hazardousCorridors(hazardRng, dungeon) : [];

            // Los objetos, con su propio generador por lo mismo: cambiar de
            // mazmorra cambia lo que hay en el suelo, no el mapa.
            const items = placeItems(rngFrom(`${key}/items`), dungeon, hazardRooms, loot, itemRange);

            const enemies = placeEnemies(rngFrom(`${key}/enemies`), dungeon, items, foes, enemyRange);

            return { ...dungeon, hazard: type, hazardRooms, hazardHalls, items, enemies, walkable: walkableShare(dungeon), seed, size, loops };

        }

    }

    throw new Error("Couldn't build a dungeon with a path to the stairs");

}


function build(rng, width, height, cols, rows, loopChance){

    const tiles = Array.from({ length: height }, () => new Array(width).fill(WALL));
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);

    // ── Salas y cruces ──
    // Al menos la mitad de los sectores (y nunca menos de dos) son salas: hace
    // falta una para empezar y otra distinta para las escaleras.
    const total = cols * rows;
    const roomCount = Math.max(2, rng.int(Math.ceil(total * 0.55), total));
    const hasRoom = rng.shuffle(Array.from({ length: total }, (_, i) => i < roomCount));

    const sectors = [];

    for(let row = 0; row < rows; row++){
        for(let col = 0; col < cols; col++){

            const index = row * cols + col;

            // El sector deja siempre un borde de muro de un tile alrededor, para
            // que dos salas vecinas no se peguen y los pasillos tengan sitio.
            const x0 = col * cellW + 1;
            const y0 = row * cellH + 1;
            const x1 = (col + 1) * cellW - 2;
            const y1 = (row + 1) * cellH - 2;

            if(hasRoom[index]){

                const w = rng.int(Math.max(4, Math.floor((x1 - x0 + 1) * 0.45)), x1 - x0 + 1);
                const h = rng.int(Math.max(3, Math.floor((y1 - y0 + 1) * 0.45)), y1 - y0 + 1);
                const x = rng.int(x0, x1 - w + 1);
                const y = rng.int(y0, y1 - h + 1);

                for(let ty = y; ty < y + h; ty++){
                    for(let tx = x; tx < x + w; tx++){
                        tiles[ty][tx] = ROOM;
                    }
                }

                sectors.push({ index, col, row, room: { x, y, w, h } });

            } else {

                // Un cruce: un solo tile donde se encuentran los pasillos.
                const x = rng.int(x0 + 1, x1 - 1);
                const y = rng.int(y0 + 1, y1 - 1);

                sectors.push({ index, col, row, junction: { x, y } });

            }

        }
    }

    // ── Uniones entre sectores vecinos ──
    const edges = [];

    for(const sector of sectors){
        if(sector.col + 1 < cols){
            edges.push([sector.index, sector.index + 1]);
        }
        if(sector.row + 1 < rows){
            edges.push([sector.index, sector.index + cols]);
        }
    }

    // Árbol de expansión aleatorio (Kruskal con las uniones barajadas): conecta
    // todos los sectores sin ciclos. Las que sobran pueden entrar como bucles.
    const parent = sectors.map((_, i) => i);
    const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const used = [];
    const spare = [];

    for(const edge of rng.shuffle(edges)){
        const a = find(edge[0]);
        const b = find(edge[1]);
        if(a !== b){
            parent[a] = b;
            used.push(edge);
        } else {
            spare.push(edge);
        }
    }

    for(const edge of spare){
        if(rng.next() < loopChance){
            used.push(edge);
        }
    }

    const anchor = sector => sector.room
        ? { x: rng.int(sector.room.x, sector.room.x + sector.room.w - 1), y: rng.int(sector.room.y, sector.room.y + sector.room.h - 1) }
        : sector.junction;

    // Cada pasillo guarda su recorrido y las salas que une, para poder poner
    // luego peligro en él.
    const corridors = used.map(([i, j]) => ({
        rooms: [sectors[i].room, sectors[j].room].filter(Boolean),
        tiles: carveCorridor(tiles, rng, sectors[i], sectors[j], anchor(sectors[i]), anchor(sectors[j]), cellW, cellH)
    }));

    // Todos los sectores están en el árbol, así que a cada cruce le llega al
    // menos un pasillo. Si es solo uno, queda un callejón sin salida, que en
    // estas mazmorras es normal.
    for(const sector of sectors){
        if(sector.junction){
            tiles[sector.junction.y][sector.junction.x] = HALL;
        }
    }

    // ── Inicio y escaleras ──
    const rooms = sectors.filter(sector => sector.room);
    const startRoom = rng.pick(rooms);
    const start = randomFloor(rng, startRoom.room);

    // Las escaleras van en otra sala, y mejor lejos: se elige entre la mitad
    // de las salas más alejadas del inicio, para que haya que recorrer algo.
    const distance = distances(tiles, start);
    const candidates = rooms
        .filter(sector => sector !== startRoom)
        .map(sector => {
            const tile = randomFloor(rng, sector.room);
            return { tile, room: sector.room, steps: distance[tile.y][tile.x] };
        })
        .filter(item => item.steps >= 0)
        .sort((a, b) => b.steps - a.steps);

    if(!candidates.length){
        return { path: null };
    }

    const chosen = rng.pick(candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2))));
    const stairs = chosen.tile;
    const path = shortestPath(tiles, start, stairs);

    return {
        width,
        height,
        tiles,
        rooms: rooms.map(sector => sector.room),
        start,
        stairs,
        startRoom: startRoom.room,
        stairsRoom: chosen.room,
        corridors,
        path,
        routes: countRoutes(sectors.length, used)
    };

}


// Convierte en salas con peligro entre un cuarto y dos quintos de las salas
// que pueden serlo (todas menos la del inicio y la de las escaleras), y al
// menos una si hay alguna. Una sala solo se queda con el peligro si, después,
// se sigue pudiendo ir del inicio a las escaleras sin ninguna habilidad: si
// era el único paso, se deja como estaba y se prueba con otra.
function hazardousRooms(rng, dungeon){

    const { tiles } = dungeon;
    const candidates = rng.shuffle(dungeon.rooms.filter(room => room !== dungeon.startRoom && room !== dungeon.stairsRoom));

    if(!candidates.length){
        return [];
    }

    const target = Math.max(1, Math.round(candidates.length * (0.25 + rng.next() * 0.15)));
    const placed = [];

    for(const room of candidates){

        if(placed.length >= target){
            break;
        }

        // Lo que cambia, con su valor de antes, para deshacerlo si hace falta.
        const changed = [];
        const flood = ({ x, y }) => {
            changed.push({ x, y, was: tiles[y][x] });
            tiles[y][x] = HAZARD;
        };

        for(let y = room.y; y < room.y + room.h; y++){
            for(let x = room.x; x < room.x + room.w; x++){
                if(x === room.x || y === room.y || x === room.x + room.w - 1 || y === room.y + room.h - 1){
                    flood({ x, y });
                }
            }
        }

        // Los pasillos que llegan a la sala son de peligro desde su mitad
        // hasta la puerta (enteros si la otra punta también es de peligro).
        for(const corridor of dungeon.corridors){

            if(!corridor.rooms.includes(room) || !corridor.tiles.length){
                continue;
            }

            const walked = corridor.tiles;
            const half = Math.ceil(walked.length / 2);
            const approach = beside(walked[0], room) ? walked.slice(0, half)
                : beside(walked[walked.length - 1], room) ? walked.slice(walked.length - half)
                : [];

            approach.filter(({ x, y }) => tiles[y][x] === HALL).forEach(flood);

        }

        const path = allowed(dungeon);

        if(path){
            placed.push(room);
            dungeon.path = path;
        } else {
            for(const { x, y, was } of changed.reverse()){
                tiles[y][x] = was;
            }
        }

    }

    return placed;

}


// Igual con los pasillos: entre un sexto y un tercio llevan un tramo de 2 a 4
// tiles de peligro en medio (nunca en los extremos, que tocan salas o cruces).
// El tramo tiene que ser pasillo "puro" (cada tile con solo dos vecinos por
// los que andar), o se podría rodear por un pasillo pegado y no cerraría
// nada. Y, como con las salas, se quita si corta el camino a las escaleras.
// Reparte objetos por el suelo de las salas. Primero uno en cada sala con
// peligro (dentro del anillo), que es lo que da motivo para entrar; el resto,
// en salas al azar, para que no se amontonen en las grandes. Nunca en el
// inicio ni en las escaleras, ni pegado a otro objeto.
function placeItems(rng, dungeon, hazardRooms, loot, [min, max]){

    if(!loot.length){
        return [];
    }

    const { tiles, start, stairs } = dungeon;
    const count = rng.int(min, max);
    const taken = [];

    const free = ({ x, y }) => tiles[y][x] === ROOM
        && !(x === start.x && y === start.y)
        && !(x === stairs.x && y === stairs.y)
        && taken.every(item => Math.abs(item.x - x) > 1 || Math.abs(item.y - y) > 1);

    const pickItem = guarded => {
        const weights = loot.map(item => {
            const base = RARITY_WEIGHTS[item.rarity] ?? RARITY_WEIGHTS.Common;
            return guarded && item.rarity !== "Common" ? base * 2 : base;
        });
        let roll = rng.next() * weights.reduce((sum, weight) => sum + weight, 0);
        for(let i = 0; i < loot.length; i++){
            roll -= weights[i];
            if(roll < 0){
                return loot[i];
            }
        }
        return loot[loot.length - 1];
    };

    const dropIn = (room, guarded) => {
        // Dentro del anillo si la sala tiene peligro; si no, en toda la sala.
        const inset = guarded ? 1 : 0;
        for(let tries = 0; tries < 12; tries++){
            const tile = {
                x: rng.int(room.x + inset, room.x + room.w - 1 - inset),
                y: rng.int(room.y + inset, room.y + room.h - 1 - inset)
            };
            if(free(tile)){
                taken.push({ ...tile, id: pickItem(guarded).id, guarded });
                return true;
            }
        }
        return false;
    };

    for(const room of rng.shuffle(hazardRooms)){
        if(taken.length < count){
            dropIn(room, true);
        }
    }

    for(let tries = 0; taken.length < count && tries < count * 10; tries++){
        const room = rng.pick(dungeon.rooms);
        dropIn(room, hazardRooms.includes(room));
    }

    return taken;

}


// Reparte enemigos al azar (todos con la misma probabilidad, y pueden
// repetirse) por el suelo de las salas. Nunca en la sala del inicio, que es
// donde llega el equipo, ni encima de las escaleras o de un objeto, ni pegados
// a otro enemigo.
function placeEnemies(rng, dungeon, items, foes, [min, max]){

    if(!foes.length){
        return [];
    }

    const { tiles, stairs } = dungeon;
    const rooms = dungeon.rooms.filter(room => room !== dungeon.startRoom);
    const count = rng.int(min, max);
    const placed = [];

    const free = ({ x, y }) => tiles[y][x] === ROOM
        && !(x === stairs.x && y === stairs.y)
        && !items.some(item => item.x === x && item.y === y)
        && placed.every(enemy => Math.abs(enemy.x - x) > 1 || Math.abs(enemy.y - y) > 1);

    for(let tries = 0; placed.length < count && tries < count * 20; tries++){
        const room = rng.pick(rooms);
        const tile = randomFloor(rng, room);
        if(free(tile)){
            placed.push({ ...tile, id: rng.pick(foes).id });
        }
    }

    return placed;

}


// Parte mínima del mapa (de todo lo que no es muro) que tiene que poder
// recorrerse desde el inicio sin ninguna habilidad. Sin este tope, los
// peligros pueden acabar cerrando casi todo menos el camino a las escaleras.
export const MIN_WALKABLE = 0.6;


// Qué parte del mapa se recorre desde el inicio sin habilidades (0 a 1).
function walkableShare({ tiles, start }){

    const open = tiles.flat().filter(tile => tile !== WALL).length;
    const reached = distances(tiles, start).flat().filter(steps => steps >= 0).length;

    return reached / open;

}


// Un peligro recién puesto se queda solo si se sigue llegando a las escaleras
// sin habilidades y se sigue pudiendo recorrer al menos MIN_WALKABLE del mapa.
// Devuelve el camino a las escaleras, o null si hay que quitarlo.
function allowed(dungeon){

    if(walkableShare(dungeon) < MIN_WALKABLE){
        return null;
    }

    return shortestPath(dungeon.tiles, dungeon.start, dungeon.stairs);

}


// Si el tile está pegado (no en diagonal) al borde de la sala, por fuera.
function beside({ x, y }, room){

    const inside = (px, py) => px >= room.x && px < room.x + room.w && py >= room.y && py < room.y + room.h;

    return !inside(x, y) && (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1));

}


function hazardousCorridors(rng, dungeon){

    const { tiles } = dungeon;
    const corridors = rng.shuffle(dungeon.corridors);

    if(!corridors.length){
        return [];
    }

    const target = Math.max(1, Math.round(corridors.length * (0.17 + rng.next() * 0.16)));
    const placed = [];

    const open = (x, y) => tiles[y]?.[x] > WALL;
    const neighbours = ({ x, y }) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length;
    const touching = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

    for(const { tiles: walked } of corridors){

        if(placed.length >= target){
            break;
        }

        const length = rng.int(2, 4);

        if(walked.length < length + 2){
            continue;
        }

        const from = rng.int(1, walked.length - 1 - length);
        const stretch = walked.slice(from, from + length);

        const usable = stretch.every((tile, i) =>
            tiles[tile.y][tile.x] === HALL
            && neighbours(tile) === 2
            && (i === 0 || touching(stretch[i - 1], tile))
        );

        if(!usable){
            continue;
        }

        for(const { x, y } of stretch){
            tiles[y][x] = HAZARD;
        }

        const path = allowed(dungeon);

        if(path){
            placed.push(stretch);
            dungeon.path = path;
        } else {
            for(const { x, y } of stretch){
                tiles[y][x] = HALL;
            }
        }

    }

    return placed;

}


function randomFloor(rng, room){

    return { x: rng.int(room.x, room.x + room.w - 1), y: rng.int(room.y, room.y + room.h - 1) };

}


// Pasillo en L (o en Z) entre dos sectores vecinos. El codo cae en la franja
// entre los dos sectores, así que el pasillo nunca se mete en un tercero.
function carveCorridor(tiles, rng, a, b, from, to, cellW, cellH){

    // Todos los tiles por los que pasa fuera de las salas, en orden, también
    // los que ya había abierto otro pasillo (si no, el pasillo tendría huecos).
    const walked = [];

    const dig = (x, y) => {
        if(tiles[y][x] === ROOM){
            return;
        }
        tiles[y][x] = HALL;
        const last = walked[walked.length - 1];
        if(!last || last.x !== x || last.y !== y){
            walked.push({ x, y });
        }
    };

    // De `a` a `b`, ambos incluidos, en el sentido en que se camina: así la
    // lista de tiles sale en orden.
    const span = (a, b, each) => {
        const step = a <= b ? 1 : -1;
        for(let i = a; i !== b + step; i += step){ each(i); }
    };

    if(a.row === b.row){

        // Vecinos en horizontal: a la izquierda, b a la derecha.
        const [left, right] = from.x <= to.x ? [from, to] : [to, from];
        const border = Math.max(a.col, b.col) * cellW;
        const bend = rng.int(Math.min(left.x + 1, border - 1), Math.max(right.x - 1, border - 1));

        for(let x = left.x; x <= bend; x++){ dig(x, left.y); }
        span(left.y, right.y, y => dig(bend, y));
        for(let x = bend; x <= right.x; x++){ dig(x, right.y); }

    } else {

        const [top, bottom] = from.y <= to.y ? [from, to] : [to, from];
        const border = Math.max(a.row, b.row) * cellH;
        const bend = rng.int(Math.min(top.y + 1, border - 1), Math.max(bottom.y - 1, border - 1));

        for(let y = top.y; y <= bend; y++){ dig(top.x, y); }
        span(top.x, bottom.x, x => dig(x, bend));
        for(let y = bend; y <= bottom.y; y++){ dig(bottom.x, y); }

    }

    return walked;

}


const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];


// Se puede andar por suelo de sala y pasillo; el terreno de peligro no cuenta,
// porque el camino garantizado es el que no pide ninguna habilidad.
const walkable = tile => tile === ROOM || tile === HALL;


// Pasos desde `from` hasta cada tile por el que se puede andar (-1 si no se llega).
function distances(tiles, from){

    const dist = tiles.map(row => row.map(() => -1));
    const queue = [from];
    dist[from.y][from.x] = 0;

    for(let i = 0; i < queue.length; i++){
        const { x, y } = queue[i];
        for(const [dx, dy] of STEPS){
            const nx = x + dx;
            const ny = y + dy;
            if(walkable(tiles[ny]?.[nx]) && dist[ny][nx] < 0){
                dist[ny][nx] = dist[y][x] + 1;
                queue.push({ x: nx, y: ny });
            }
        }
    }

    return dist;

}


// El camino más corto (lista de tiles) o null si no se puede llegar.
export function shortestPath(tiles, from, to){

    const dist = distances(tiles, from);

    if(dist[to.y][to.x] < 0){
        return null;
    }

    const path = [to];
    let current = to;

    while(current.x !== from.x || current.y !== from.y){
        const here = dist[current.y][current.x];
        for(const [dx, dy] of STEPS){
            const nx = current.x + dx;
            const ny = current.y + dy;
            if(dist[ny]?.[nx] === here - 1){
                current = { x: nx, y: ny };
                break;
            }
        }
        path.push(current);
    }

    return path.reverse();

}


// Cuántos bucles independientes tiene el mapa de sectores (uniones de más
// sobre las de un árbol). 0 = solo hay un camino entre cada par de sitios.
function countRoutes(nodes, edges){

    return edges.length - (nodes - 1);

}
