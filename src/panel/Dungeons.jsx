import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Rarity } from "../components/ItemParts";
import asset from "../lib/asset";

import { HALL, HAZARD, HAZARDS, LOOPS, ROOM, SIZES, generateDungeon, randomSeed } from "./dungeon/generate";
import { DUNGEONS, ITEMS_BY_ID, dungeonLabel, lootFor } from "./dungeon/loot";
import { ENEMIES_BY_ID, enemiesFor, enemyName, sizeLabel } from "./dungeon/enemies";
import TypeBadge from "../components/TypeBadge";


// Generador de mazmorras para los moderadores: saca un piso al estilo Mundo
// Misterioso (salas, pasillos, punto de inicio y escaleras) para explicar las
// mazmorras a los jugadores. Todo va en la dirección (semilla, tamaño,
// bucles, mazmorra), así que copiar el enlace basta para que otro vea el
// mismo mapa. Al elegir una mazmorra, los objetos del suelo salen de los que
// la lista de objetos dice que aparecen en ella.
export function Dungeons(){

    const [params, setParams] = useSearchParams();
    const [showPath, setShowPath] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [copied, setCopied] = useState(false);
    const canvas = useRef(null);

    const seed = params.get("seed");
    const size = SIZES[params.get("size")] ? params.get("size") : "medium";
    const loops = LOOPS[params.get("loops")] ? params.get("loops") : "some";
    const hazardParam = params.get("hazard");
    const hazardChoice = HAZARDS[hazardParam] || hazardParam === "none" ? hazardParam : "random";
    const place = DUNGEONS.find(item => item.value === params.get("dungeon"))?.value ?? "";
    // Un enlace viejo puede traer una mazmorra que ya no está en la lista de
    // objetos (se renombró o se le quitaron todos): se avisa en vez de
    // enseñar el piso vacío sin más.
    const lostPlace = !place && params.get("dungeon");

    // Sin semilla en la dirección (recién llegado) se pone una al azar.
    useEffect(() => {
        if(!seed){
            setParams(current => {
                const next = new URLSearchParams(current);
                next.set("seed", randomSeed());
                return next;
            }, { replace: true });
        }
    }, [seed, setParams]);

    const dungeon = useMemo(
        () => seed ? generateDungeon({
            seed, size, loops,
            hazard: hazardChoice,
            loot: lootFor(place),
            foes: enemiesFor(dungeonLabel(place))
        }) : null,
        [seed, size, loops, hazardChoice, place]
    );
    const hazard = dungeon?.hazard ? HAZARDS[dungeon.hazard] : null;

    useEffect(() => {
        if(dungeon && canvas.current){
            draw(canvas.current, dungeon, { showPath, showGrid });
        }
    }, [dungeon, showPath, showGrid]);

    function update(changes){
        setCopied(false);
        setParams(current => {
            const next = new URLSearchParams(current);
            for(const [key, value] of Object.entries(changes)){
                if(value){
                    next.set(key, value);
                } else {
                    next.delete(key);
                }
            }
            return next;
        });
    }

    async function copyLink(){
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
        } catch {
            window.prompt("Copy this link:", window.location.href);
        }
    }

    function download(){
        const link = document.createElement("a");
        link.download = `${place ? `${place.toLowerCase().replace(/\W+/g, "-")}-` : "dungeon-"}${seed}.png`;
        link.href = canvas.current.toDataURL("image/png");
        link.click();
    }

    return (

        <>

            <nav className="panel-crumbs"><Link to="/panel">Collections</Link> › Dungeon generator</nav>

            <div className="panel-card dungeon-controls">

                <label className="dungeon-control dungeon-control--wide">
                    <span className="panel-field__label">Dungeon</span>
                    <select className="panel-input" value={place} onChange={event => update({ dungeon: event.target.value })}>
                        <option value="">No items</option>
                        {DUNGEONS.map(item => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>
                </label>

                <label className="dungeon-control">
                    <span className="panel-field__label">Size</span>
                    <select className="panel-input" value={size} onChange={event => update({ size: event.target.value })}>
                        {Object.entries(SIZES).map(([key, item]) => (
                            <option key={key} value={key}>{item.label}</option>
                        ))}
                    </select>
                </label>

                <label className="dungeon-control">
                    <span className="panel-field__label">Paths</span>
                    <select className="panel-input" value={loops} onChange={event => update({ loops: event.target.value })}>
                        {Object.entries(LOOPS).map(([key, item]) => (
                            <option key={key} value={key}>{item.label}</option>
                        ))}
                    </select>
                </label>

                <label className="dungeon-control">
                    <span className="panel-field__label">Hazard</span>
                    <select className="panel-input" value={hazardChoice} onChange={event => update({ hazard: event.target.value })}>
                        <option value="random">Random</option>
                        {Object.entries(HAZARDS).map(([key, item]) => (
                            <option key={key} value={key}>{item.label} ({item.ability.toLowerCase()})</option>
                        ))}
                        <option value="none">None</option>
                    </select>
                </label>

                <label className="dungeon-control">
                    <span className="panel-field__label">Seed</span>
                    {/* Se aplica al pulsar Enter o salir del campo, no con cada
                        letra, para poder borrarla entera y escribir otra. */}
                    <input
                        key={seed}
                        className="panel-input"
                        defaultValue={seed ?? ""}
                        spellCheck={false}
                        onKeyDown={event => event.key === "Enter" && event.currentTarget.blur()}
                        onBlur={event => {
                            const value = event.target.value.trim();
                            if(value && value !== seed){
                                update({ seed: value });
                            } else {
                                event.target.value = seed ?? "";
                            }
                        }}
                    />
                </label>

                <button type="button" className="panel-btn panel-btn--primary dungeon-new" onClick={() => update({ seed: randomSeed() })}>
                    New dungeon
                </button>

            </div>

            {dungeon && (
                <>

                    <div className="dungeon-map">
                        <canvas ref={canvas} aria-label={`Dungeon map, seed ${seed}`} />
                    </div>

                    <div className="dungeon-info">

                        <ul className="dungeon-legend">
                            <li><i className="dungeon-swatch dungeon-swatch--start" /> Start</li>
                            <li><i className="dungeon-swatch dungeon-swatch--stairs" /> Stairs</li>
                            <li><i className="dungeon-swatch dungeon-swatch--room" /> Room</li>
                            <li><i className="dungeon-swatch dungeon-swatch--hall" /> Corridor</li>
                            {hazard && (
                                <li><i className={`dungeon-swatch dungeon-swatch--${dungeon.hazard}`} /> {hazard.label}</li>
                            )}
                            {dungeon.items.length > 0 && (
                                <li><i className="dungeon-swatch dungeon-swatch--item">1</i> Item</li>
                            )}
                            {dungeon.enemies.length > 0 && (
                                <li><i className="dungeon-swatch dungeon-swatch--enemy">1</i> Enemy</li>
                            )}
                        </ul>

                        <p className="panel-muted">
                            {dungeon.rooms.length} rooms · {dungeon.routes === 0 ? "one way through" : `${dungeon.routes} loop${dungeon.routes > 1 ? "s" : ""}`} · {dungeon.path.length - 1} steps to the stairs (shortest way)
                        </p>

                    </div>

                    {hazard && (
                        <div className="panel-note dungeon-hazard">
                            <strong>{hazard.label}</strong>: {hazardSummary(dungeon, hazard)}
                        </div>
                    )}

                    <div className="panel-row dungeon-actions">
                        <label className="dungeon-toggle">
                            <input type="checkbox" checked={showPath} onChange={event => setShowPath(event.target.checked)} /> Show the shortest way
                        </label>
                        <label className="dungeon-toggle">
                            <input type="checkbox" checked={showGrid} onChange={event => setShowGrid(event.target.checked)} /> Grid
                        </label>
                        <span className="dungeon-spacer" />
                        <button type="button" className="panel-btn panel-btn--ghost" onClick={copyLink}>{copied ? "Link copied" : "Copy link"}</button>
                        <button type="button" className="panel-btn panel-btn--ghost" onClick={download}>Download PNG</button>
                    </div>

                    {lostPlace && (
                        <div className="panel-card dungeon-items">
                            <p className="panel-error">
                                “{dungeonLabel(lostPlace)}” isn't a dungeon in the item list anymore, so this floor has no items or enemies. Pick another dungeon above.
                            </p>
                        </div>
                    )}

                    {place && <EnemyList dungeon={dungeon} place={place} />}

                    {place && <ItemList dungeon={dungeon} place={place} hazard={hazard} />}

                </>
            )}

        </>

    );

}


// Los enemigos del piso, con el mismo número que en el mapa. Si la Pokédex no
// tiene ninguno para esta mazmorra, se dice y se manda a añadirlos, en vez de
// dejar el mapa vacío sin explicación.
function EnemyList({ dungeon, place }){

    const label = dungeonLabel(place);
    const pool = enemiesFor(label).length;

    if(!pool){
        return (
            <section className="panel-card dungeon-items dungeon-items--empty">
                <h2>Enemies on this floor</h2>
                <p className="panel-muted">
                    The Pokédex has no enemies for {label} yet (mini bosses and bosses never show up at random), so this floor has none.
                    {" "}<Link to="/panel?view=pokedex">Add some in the Pokédex</Link> and tick {label} under Dungeon. New entries show up here once the site is published.
                </p>
            </section>
        );
    }

    return (

        <section className="panel-card dungeon-items">

            <h2>Enemies on this floor</h2>

            <p className="panel-muted">
                {dungeon.enemies.length} picked at random from the {pool} {pool === 1 ? "enemy" : "enemies"} that the Pokédex places in {label}. Mini bosses and bosses are left out.
            </p>

            <ol className="dungeon-items__list">
                {dungeon.enemies.map((spot, index) => {
                    const entry = ENEMIES_BY_ID[spot.id];
                    return (
                        <li key={`${spot.x},${spot.y}`}>
                            <span className="dungeon-items__number dungeon-items__number--enemy">{index + 1}</span>
                            {entry.image && <img src={asset(entry.image)} alt="" width="32" height="32" loading="lazy" />}
                            <Link to={`/panel?view=pokedex&id=${entry.id}`} className="dungeon-items__name">{enemyName(entry)}</Link>
                            <span className="dungeon-items__tag">{sizeLabel(entry.size)}</span>
                            {entry.types.filter(Boolean).map(type => <TypeBadge key={type} type={type} />)}
                        </li>
                    );
                })}
            </ol>

        </section>

    );

}


// Los objetos del suelo, con el mismo número que llevan en el mapa.
function ItemList({ dungeon, place, hazard }){

    const label = dungeonLabel(place);
    const pool = lootFor(place).length;

    if(!pool){
        return (
            <section className="panel-card dungeon-items">
                <h2>Items on this floor</h2>
                <p className="panel-muted">
                    The item list has nothing to find in {label} (or anywhere), so this floor has no items.
                    {" "}<Link to="/panel?c=items">Open the items</Link> and add {place} to the locations of the ones that should show up here.
                </p>
            </section>
        );
    }

    return (

        <section className="panel-card dungeon-items">

            <h2>Items on this floor</h2>

            <p className="panel-muted">
                {dungeon.items.length} picked from the {plural(pool, "item")} that the item list places in {dungeonLabel(place)} (or anywhere). Rarer ones show up less.
                {hazard && dungeon.hazardRooms.length > 0 && ` Each ${hazard.label.toLowerCase()} room hides one, with better odds of something rare.`}
            </p>

            <ol className="dungeon-items__list">
                {dungeon.items.map((spot, index) => {
                    const item = ITEMS_BY_ID[spot.id];
                    return (
                        <li key={`${spot.x},${spot.y}`}>
                            <span className="dungeon-items__number" style={{ borderColor: rarityColor(item.rarity) }}>{index + 1}</span>
                            {item.image && <img src={asset(item.image)} alt="" width="32" height="32" loading="lazy" />}
                            <Link to={`/panel?c=items&f=${encodeURIComponent(`src/content/items/${item.id}.json`)}`} className="dungeon-items__name">{item.name}</Link>
                            <Rarity value={item.rarity} />
                            {spot.guarded && hazard && <span className="dungeon-items__tag">needs {hazard.ability.toLowerCase()}</span>}
                        </li>
                    );
                })}
            </ol>

        </section>

    );

}


const RARITY_COLORS = {
    "Common": "#e8e2d4",
    "Uncommon": "#6cc070",
    "Rare": "#4f9cf0",
    "Super Rare": "#b06cf0",
    "Special": "#f0c040"
};

const rarityColor = rarity => RARITY_COLORS[rarity] ?? RARITY_COLORS.Common;


const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;


function hazardSummary(dungeon, hazard){

    const rooms = dungeon.hazardRooms.length;
    const halls = dungeon.hazardHalls.length;

    if(!rooms && !halls){
        return "nothing could be closed off here without blocking the way to the stairs, so this floor has none. Try another seed.";
    }

    const parts = [
        rooms && `${plural(rooms, "room")} can only be entered`,
        halls && `${plural(halls, "corridor")} can only be crossed`
    ].filter(Boolean);

    return `${parts.join(" and ")} with ${hazard.ability.toLowerCase()}. Without it you can still reach the stairs and walk ${Math.round(dungeon.walkable * 100)}% of the floor.`;

}


const TILE = 16;

const COLORS = {
    wall: "#1c150d",
    wallEdge: "#3a2c1a",
    room: "#c9b48a",
    hall: "#a38e66",
    grid: "rgba(40, 28, 12, 0.28)",
    path: "rgba(212, 165, 55, 0.95)",
    start: "#4f9cf0",
    stairs: "#e8e2d4",
    stairsShade: "#5a4a32"
};

// Fondo y detalle de cada peligro (los mismos que las muestras de la leyenda).
const HAZARD_COLORS = {
    chasm: { base: "#08060c", detail: "rgba(140, 110, 200, 0.35)" },
    water: { base: "#2f6fb3", detail: "rgba(190, 225, 255, 0.55)" },
    lava: { base: "#c2410c", detail: "rgba(255, 210, 90, 0.75)" }
};


// Un poco de dibujo en cada tile de peligro para que no parezca solo un color:
// ondas en el agua, grietas brillantes en la lava, un borde tenue en el abismo.
function drawHazardTile(ctx, hazard, px, py){

    const colors = HAZARD_COLORS[hazard];

    ctx.fillStyle = colors.base;
    ctx.fillRect(px, py, TILE, TILE);

    ctx.strokeStyle = colors.detail;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    if(hazard === "water"){
        for(const offset of [5, 11]){
            ctx.moveTo(px + 2, py + offset);
            ctx.quadraticCurveTo(px + 5, py + offset - 3, px + 8, py + offset);
            ctx.quadraticCurveTo(px + 11, py + offset + 3, px + 14, py + offset);
        }
    } else if(hazard === "lava"){
        ctx.moveTo(px + 3, py + 4);
        ctx.lineTo(px + 8, py + 8);
        ctx.lineTo(px + 6, py + 13);
        ctx.moveTo(px + 8, py + 8);
        ctx.lineTo(px + 13, py + 6);
    } else {
        ctx.rect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
    }

    ctx.stroke();

}


function draw(canvas, dungeon, { showPath, showGrid }){

    const { width, height, tiles, start, stairs, path } = dungeon;

    canvas.width = width * TILE;
    canvas.height = height * TILE;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++){
            const tile = tiles[y][x];
            if(tile === ROOM || tile === HALL){
                ctx.fillStyle = tile === ROOM ? COLORS.room : COLORS.hall;
                ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            } else if(tile === HAZARD){
                drawHazardTile(ctx, dungeon.hazard, x * TILE, y * TILE);
            }
        }
    }

    // Borde claro del muro que da al suelo, para que salas y pasillos se lean.
    ctx.strokeStyle = COLORS.wallEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++){
            if(!tiles[y][x]){
                continue;
            }
            const px = x * TILE;
            const py = y * TILE;
            if(!tiles[y - 1]?.[x]){ ctx.moveTo(px, py); ctx.lineTo(px + TILE, py); }
            if(!tiles[y + 1]?.[x]){ ctx.moveTo(px, py + TILE); ctx.lineTo(px + TILE, py + TILE); }
            if(!tiles[y][x - 1]){ ctx.moveTo(px, py); ctx.lineTo(px, py + TILE); }
            if(!tiles[y][x + 1]){ ctx.moveTo(px + TILE, py); ctx.lineTo(px + TILE, py + TILE); }
        }
    }

    ctx.stroke();

    if(showGrid){
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let y = 0; y < height; y++){
            for(let x = 0; x < width; x++){
                if(tiles[y][x]){
                    ctx.rect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
                }
            }
        }
        ctx.stroke();
    }

    if(showPath && path){
        ctx.fillStyle = COLORS.path;
        for(const step of path.slice(1, -1)){
            ctx.beginPath();
            ctx.arc(step.x * TILE + TILE / 2, step.y * TILE + TILE / 2, TILE * 0.16, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Objetos: una ficha con su número (el de la lista de abajo), con el borde
    // del color de su rareza.
    ctx.font = `bold ${TILE * 0.62}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    dungeon.items.forEach((spot, index) => {
        const px = spot.x * TILE;
        const py = spot.y * TILE;
        ctx.fillStyle = "#2b1d0e";
        ctx.strokeStyle = rarityColor(ITEMS_BY_ID[spot.id]?.rarity);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE - 2, TILE - 2, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.fillText(String(index + 1), px + TILE / 2, py + TILE / 2 + 0.5);
    });

    // Enemigos: un círculo rojo con su número (el de su lista).
    dungeon.enemies.forEach((spot, index) => {
        const cx = spot.x * TILE + TILE / 2;
        const cy = spot.y * TILE + TILE / 2;
        ctx.fillStyle = "#c62828";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.fillText(String(index + 1), cx, cy + 0.5);
    });

    // Un halo detrás del inicio y de las escaleras: en un mapa grande, un solo
    // tile se pierde.
    const halo = (point, color) => {
        const cx = point.x * TILE + TILE / 2;
        const cy = point.y * TILE + TILE / 2;
        const glow = ctx.createRadialGradient(cx, cy, TILE * 0.3, cx, cy, TILE * 1.8);
        glow.addColorStop(0, color);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(cx - TILE * 2, cy - TILE * 2, TILE * 4, TILE * 4);
    };

    halo(stairs, "rgba(255, 220, 120, 0.75)");
    halo(start, "rgba(79, 156, 240, 0.7)");

    // Escaleras: peldaños que bajan, con borde para que se vean sobre el suelo.
    const sx = stairs.x * TILE;
    const sy = stairs.y * TILE;
    ctx.fillStyle = COLORS.stairsShade;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = COLORS.stairs;
    const step = TILE / 4;
    for(let i = 0; i < 4; i++){
        ctx.fillRect(sx + i * step, sy + i * step, TILE - i * step, step - 1);
    }
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx + 0.75, sy + 0.75, TILE - 1.5, TILE - 1.5);

    // Inicio: un círculo azul con borde blanco, como el marcador del equipo.
    ctx.fillStyle = COLORS.start;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x * TILE + TILE / 2, start.y * TILE + TILE / 2, TILE * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

}
