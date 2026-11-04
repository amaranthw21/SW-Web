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


export const SIZES = {
    small: { label: "Small", width: 36, height: 22, cols: 3, rows: 2 },
    medium: { label: "Medium", width: 52, height: 30, cols: 4, rows: 3 },
    large: { label: "Large", width: 68, height: 38, cols: 5, rows: 4 }
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


const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomSeed(){

    let seed = "";

    for(let i = 0; i < 6; i++){
        seed += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }

    return seed;

}


export function generateDungeon({ seed, size = "medium", loops = "some" }){

    const { width, height, cols, rows } = SIZES[size] ?? SIZES.medium;
    const loopChance = (LOOPS[loops] ?? LOOPS.some).chance;

    // Por si acaso: si alguna vez no se pudiera llegar a las escaleras, se
    // vuelve a intentar con la semilla derivada. Con la construcción de abajo
    // no debería pasar nunca, pero así la garantía no depende de ella.
    for(let attempt = 0; attempt < 20; attempt++){

        const dungeon = build(rngFrom(attempt ? `${seed}#${attempt}` : seed), width, height, cols, rows, loopChance);

        if(dungeon.path){
            return { ...dungeon, seed, size, loops };
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

    for(const [i, j] of used){
        carveCorridor(tiles, rng, sectors[i], sectors[j], anchor(sectors[i]), anchor(sectors[j]), cellW, cellH);
    }

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
            return { tile, steps: distance[tile.y][tile.x] };
        })
        .filter(item => item.steps >= 0)
        .sort((a, b) => b.steps - a.steps);

    if(!candidates.length){
        return { path: null };
    }

    const stairs = rng.pick(candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)))).tile;
    const path = shortestPath(tiles, start, stairs);

    return {
        width,
        height,
        tiles,
        rooms: rooms.map(sector => sector.room),
        start,
        stairs,
        path,
        routes: countRoutes(sectors.length, used)
    };

}


function randomFloor(rng, room){

    return { x: rng.int(room.x, room.x + room.w - 1), y: rng.int(room.y, room.y + room.h - 1) };

}


// Pasillo en L (o en Z) entre dos sectores vecinos. El codo cae en la franja
// entre los dos sectores, así que el pasillo nunca se mete en un tercero.
function carveCorridor(tiles, rng, a, b, from, to, cellW, cellH){

    const dig = (x, y) => {
        if(tiles[y][x] === WALL){
            tiles[y][x] = HALL;
        }
    };

    if(a.row === b.row){

        // Vecinos en horizontal: a la izquierda, b a la derecha.
        const [left, right] = from.x <= to.x ? [from, to] : [to, from];
        const border = Math.max(a.col, b.col) * cellW;
        const bend = rng.int(Math.min(left.x + 1, border - 1), Math.max(right.x - 1, border - 1));

        for(let x = left.x; x <= bend; x++){ dig(x, left.y); }
        for(let y = Math.min(left.y, right.y); y <= Math.max(left.y, right.y); y++){ dig(bend, y); }
        for(let x = bend; x <= right.x; x++){ dig(x, right.y); }

    } else {

        const [top, bottom] = from.y <= to.y ? [from, to] : [to, from];
        const border = Math.max(a.row, b.row) * cellH;
        const bend = rng.int(Math.min(top.y + 1, border - 1), Math.max(bottom.y - 1, border - 1));

        for(let y = top.y; y <= bend; y++){ dig(top.x, y); }
        for(let x = Math.min(top.x, bottom.x); x <= Math.max(top.x, bottom.x); x++){ dig(x, bend); }
        for(let y = bend; y <= bottom.y; y++){ dig(bottom.x, y); }

    }

}


const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];


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
            if(tiles[ny]?.[nx] && dist[ny][nx] < 0){
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
