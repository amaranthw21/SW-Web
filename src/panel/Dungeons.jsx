import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { HALL, LOOPS, ROOM, SIZES, generateDungeon, randomSeed } from "./dungeon/generate";


// Generador de mazmorras para los moderadores: saca un piso al estilo Mundo
// Misterioso (salas, pasillos, punto de inicio y escaleras) para explicar las
// mazmorras a los jugadores. Todo va en la dirección (semilla, tamaño,
// bucles), así que copiar el enlace basta para que otro vea el mismo mapa.
export function Dungeons(){

    const [params, setParams] = useSearchParams();
    const [showPath, setShowPath] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [copied, setCopied] = useState(false);
    const canvas = useRef(null);

    const seed = params.get("seed");
    const size = SIZES[params.get("size")] ? params.get("size") : "medium";
    const loops = LOOPS[params.get("loops")] ? params.get("loops") : "some";

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

    const dungeon = useMemo(() => seed ? generateDungeon({ seed, size, loops }) : null, [seed, size, loops]);

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
                next.set(key, value);
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
        link.download = `dungeon-${seed}.png`;
        link.href = canvas.current.toDataURL("image/png");
        link.click();
    }

    return (

        <>

            <nav className="panel-crumbs"><Link to="/panel">Collections</Link> › Dungeon generator</nav>

            <div className="panel-card dungeon-controls">

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
                        </ul>

                        <p className="panel-muted">
                            {dungeon.rooms.length} rooms · {dungeon.routes === 0 ? "one way through" : `${dungeon.routes} loop${dungeon.routes > 1 ? "s" : ""}`} · {dungeon.path.length - 1} steps to the stairs (shortest way)
                        </p>

                    </div>

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

                </>
            )}

        </>

    );

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
