import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Rarity } from "../components/ItemParts";
import TypeBadge from "../components/TypeBadge";
import asset from "../lib/asset";

import { HALL, HAZARD, HAZARDS, ROOM } from "./dungeon/generate";
import { sizeLabel } from "./dungeon/enemies";


// Un piso dibujado: el mapa, la leyenda, el resumen, los botones de copiar y
// descargar, y las listas de enemigos y objetos con el mismo número que en el
// mapa. Lo usan el generador y las mazmorras guardadas.
//
// `enemies` e `items` traen el texto de encima de cada lista (`intro`) y lo
// que se dice si está vacía (`empty`); si no vienen, la lista no sale.
export function FloorView({ floor, fileName, enemies, items, linkItems = true }){

    const [showPath, setShowPath] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    // A qué piso corresponde el aviso de "copiado": si cambia el piso (y con
    // él el enlace), el aviso deja de valer solo.
    const [copiedFor, setCopiedFor] = useState(null);
    const copied = copiedFor === floor;
    const canvas = useRef(null);

    const hazard = floor.hazard ? HAZARDS[floor.hazard] : null;

    useEffect(() => {
        if(canvas.current){
            draw(canvas.current, floor, { showPath, showGrid });
        }
    }, [floor, showPath, showGrid]);

    async function copyLink(){
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiedFor(floor);
        } catch {
            window.prompt("Copy this link:", window.location.href);
        }
    }

    function download(){
        const link = document.createElement("a");
        link.download = `${fileName}.png`;
        link.href = canvas.current.toDataURL("image/png");
        link.click();
    }

    const { stats } = floor;

    return (

        <>

            <div className="dungeon-map">
                <canvas ref={canvas} aria-label="Dungeon map" />
            </div>

            <div className="dungeon-info">

                <ul className="dungeon-legend">
                    <li><i className="dungeon-swatch dungeon-swatch--start" /> Start</li>
                    <li><i className="dungeon-swatch dungeon-swatch--stairs" /> Stairs</li>
                    <li><i className="dungeon-swatch dungeon-swatch--room" /> Room</li>
                    <li><i className="dungeon-swatch dungeon-swatch--hall" /> Corridor</li>
                    {hazard && (
                        <li><i className={`dungeon-swatch dungeon-swatch--${floor.hazard}`} /> {hazard.label}</li>
                    )}
                    {floor.items.length > 0 && (
                        <li><i className="dungeon-swatch dungeon-swatch--item">1</i> Item</li>
                    )}
                    {floor.enemies.length > 0 && (
                        <li><i className="dungeon-swatch dungeon-swatch--enemy">1</i> Enemy</li>
                    )}
                </ul>

                <p className="panel-muted">
                    {stats.rooms} rooms · {stats.routes === 0 ? "one way through" : plural(stats.routes, "loop")} · {floor.path.length - 1} steps to the stairs (shortest way)
                </p>

            </div>

            {hazard && (
                <div className="panel-note dungeon-hazard">
                    <strong>{hazard.label}</strong>: {hazardSummary(stats, hazard)}
                </div>
            )}

            {floor.details && <DetailsCard details={floor.details} linkItems={linkItems} />}

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

            {enemies && (
                <section className="panel-card dungeon-items">
                    <h2>Enemies on this floor</h2>
                    {floor.enemies.length === 0 && enemies.empty
                        ? <p className="panel-muted">{enemies.empty}</p>
                        : (
                            <>
                                {enemies.intro && <p className="panel-muted">{enemies.intro}</p>}
                                <ol className="dungeon-items__list">
                                    {floor.enemies.map((spot, index) => (
                                        <li key={`${spot.x},${spot.y}`}>
                                            <span className="dungeon-items__number dungeon-items__number--enemy">{index + 1}</span>
                                            {spot.image && <img src={asset(spot.image)} alt="" width="32" height="32" loading="lazy" />}
                                            {linkItems
                                                ? <Link to={`/panel?view=pokedex&id=${spot.id}`} className="dungeon-items__name">{spot.name}</Link>
                                                : <span className="dungeon-items__name">{spot.name}</span>}
                                            {spot.size && <span className="dungeon-items__tag">{sizeLabel(spot.size)}</span>}
                                            {spot.types.map(type => <TypeBadge key={type} type={type} />)}
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}
                </section>
            )}

            {items && (
                <section className="panel-card dungeon-items">
                    <h2>Items on this floor</h2>
                    {floor.items.length === 0 && items.empty
                        ? <p className="panel-muted">{items.empty}</p>
                        : (
                            <>
                                {items.intro && <p className="panel-muted">{items.intro}</p>}
                                <ol className="dungeon-items__list">
                                    {floor.items.map((spot, index) => (
                                        <li key={`${spot.x},${spot.y}`}>
                                            <span className="dungeon-items__number" style={{ borderColor: rarityColor(spot.rarity) }}>{index + 1}</span>
                                            {spot.image && <img src={asset(spot.image)} alt="" width="32" height="32" loading="lazy" />}
                                            {linkItems
                                                ? <Link to={`/panel?c=items&f=${encodeURIComponent(`src/content/items/${spot.id}.json`)}`} className="dungeon-items__name">{spot.name}</Link>
                                                : <span className="dungeon-items__name">{spot.name}</span>}
                                            <Rarity value={spot.rarity} />
                                            {spot.guarded && hazard && <span className="dungeon-items__tag">needs {hazard.ability.toLowerCase()}</span>}
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}
                </section>
            )}

        </>

    );

}


// Lo que viene de la ficha de la mazmorra: el gimmick, el clima o terreno y
// el evento de este piso, y sus jefes.
function DetailsCard({ details, linkItems }){

    const boss = (title, entry) => entry && (
        <div className="dungeon-details__boss">
            <span className="panel-field__label">{title}</span>
            <span className="dungeon-details__boss-name">
                {entry.image && <img src={asset(entry.image)} alt="" width="32" height="32" loading="lazy" />}
                {linkItems
                    ? <Link to={`/panel?view=pokedex&id=${entry.id}`} className="dungeon-items__name">{entry.name}</Link>
                    : <span className="dungeon-items__name">{entry.name}</span>}
                {entry.types.map(type => <TypeBadge key={type} type={type} />)}
            </span>
        </div>
    );

    return (

        <section className="panel-card dungeon-details">

            <h2>{details.name}</h2>

            {details.gimmick && (
                <div className="dungeon-details__block">
                    <span className="panel-field__label">Gimmick</span>
                    <strong>{details.gimmick}</strong>
                    {details.gimmickText && <p className="dungeon-details__text">{details.gimmickText}</p>}
                </div>
            )}

            {details.conditionCount > 0 && (
                <div className="dungeon-details__block">
                    <span className="panel-field__label">Weather / terrain</span>
                    {details.condition ? <strong>{details.condition}</strong> : <span className="panel-muted">None on this floor</span>}
                </div>
            )}

            {details.eventCount > 0 && (
                <div className="dungeon-details__block">
                    <span className="panel-field__label">Event</span>
                    {details.event
                        ? (
                            <>
                                <strong>{details.event.name}</strong>
                                {details.event.description && <p className="dungeon-details__text">{details.event.description}</p>}
                            </>
                        )
                        : <span className="panel-muted">None on this floor</span>}
                </div>
            )}

            {(details.miniboss || details.boss) && (
                <div className="dungeon-details__bosses">
                    {boss("Mini boss", details.miniboss)}
                    {boss("Boss", details.boss)}
                </div>
            )}

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


function hazardSummary(stats, hazard){

    const rooms = stats.hazardRooms;
    const halls = stats.hazardHalls;

    if(!rooms && !halls){
        return "nothing could be closed off here without blocking the way to the stairs, so this floor has none. Try another seed.";
    }

    const parts = [
        rooms && `${plural(rooms, "room")} can only be entered`,
        halls && `${plural(halls, "corridor")} can only be crossed`
    ].filter(Boolean);

    return `${parts.join(" and ")} with ${hazard.ability.toLowerCase()}. Without it you can still reach the stairs and walk ${Math.round(stats.walkable * 100)}% of the floor.`;

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
        ctx.strokeStyle = rarityColor(spot.rarity);
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
