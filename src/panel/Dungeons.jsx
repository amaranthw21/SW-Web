import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError, deleteFiles, listFiles, readJson, writeJson } from "./api";
import { FloorView } from "./FloorView";
import { bundledData } from "./schema";
import { HAZARDS, LOOPS, SIZES, generateDungeon, pickFrom, randomSeed } from "./dungeon/generate";
import { dungeonLabel, dungeonOptions, lootFor } from "./dungeon/loot";
import { ENEMIES_BY_ID, enemiesFor, enemyName } from "./dungeon/enemies";
import { BUNDLED_DEFINITIONS, DEFINITIONS_FOLDER, cleanDefinition, definitionFor } from "./dungeon/definitions";
import { FOLDER, floorFromDungeon, fromSnapshot, idOf, newDungeonPath, toSnapshot } from "./dungeon/floor";


// Generador de mazmorras para los moderadores: saca un piso al estilo Mundo
// Misterioso (salas, pasillos, punto de inicio y escaleras) para explicar las
// mazmorras a los jugadores. Las opciones van en la dirección (semilla,
// tamaño, bucles, mazmorra), así que copiar el enlace basta para que otro vea
// el mismo mapa. Al elegir una mazmorra, los objetos y enemigos salen de la
// lista de objetos y de la Pokédex, y si tiene ficha (colección Dungeons),
// sus peligros, climas o terrenos, eventos y jefes se cargan solos.
//
// Un piso se puede guardar (src/content/dungeon-runs/) para volver a él mientras
// se juega, y borrar cuando la mazmorra se completa. Uno guardado se abre con
// ?view=dungeons&saved=<id>.
export function Dungeons({ session, onError }){

    const [params] = useSearchParams();
    const [paths, setPaths] = useState(null);

    // Lo leído de GitHub y lo guardado en esta sesión: tapa al contenido del
    // build, que no tiene lo guardado después del último deploy.
    const [fresh, setFresh] = useState({});

    useEffect(() => {
        listFiles(session).then(setPaths).catch(onError);
    }, [session, onError]);

    const files = useMemo(
        () => (paths ?? []).filter(path => path.startsWith(`${FOLDER}/`) && path.endsWith(".json")),
        [paths]
    );

    const definitionFiles = useMemo(
        () => (paths ?? []).filter(path => path.startsWith(`${DEFINITIONS_FOLDER}/`) && path.endsWith(".json")),
        [paths]
    );

    // Las fichas de las mazmorras: las que hay ahora en GitHub (una borrada
    // después del último deploy ya no sale). Hasta saberlo, las del build.
    const definitions = useMemo(
        () => paths
            ? Object.fromEntries(definitionFiles.map(path => [path, fresh[path] ?? bundledData(path)]).filter(([, data]) => data))
            : BUNDLED_DEFINITIONS,
        [paths, definitionFiles, fresh]
    );

    // Lo que no está en el build se lee de GitHub. Las fichas, siempre: se
    // editan y el build puede tener una versión vieja.
    const readDefinitions = useRef(false);

    useEffect(() => {
        if(!paths || readDefinitions.current){
            return;
        }
        readDefinitions.current = true;
        Promise.all(definitionFiles.map(path => readJson(session, path).then(result => [path, result.data])))
            .then(read => read.length && setFresh(current => ({ ...current, ...Object.fromEntries(read) })))
            .catch(onError);
    }, [session, paths, definitionFiles, onError]);

    useEffect(() => {
        const missing = files.filter(path => !bundledData(path) && !fresh[path]);
        if(!missing.length){
            return;
        }
        Promise.all(missing.map(path => readJson(session, path).then(result => [path, result.data])))
            .then(read => setFresh(current => ({ ...Object.fromEntries(read), ...current })))
            .catch(onError);
    }, [session, files, fresh, onError]);

    const saved = useMemo(
        () => files
            .map(path => ({ path, id: idOf(path), data: fresh[path] ?? bundledData(path) }))
            .filter(entry => entry.data)
            .sort((a, b) => String(b.data.createdAt).localeCompare(String(a.data.createdAt))),
        [files, fresh]
    );

    const onSaved = (path, data) => {
        setFresh(current => ({ ...current, [path]: data }));
        setPaths(current => [...(current ?? []), path]);
    };

    const onDeleted = path => {
        setPaths(current => (current ?? []).filter(item => item !== path));
    };

    const openId = params.get("saved");

    if(openId){
        return (
            <SavedDungeon
                key={openId}
                session={session}
                path={`${FOLDER}/${openId}.json`}
                known={paths ? files.includes(`${FOLDER}/${openId}.json`) : null}
                onDeleted={onDeleted}
                onError={onError}
            />
        );
    }

    return (

        <>

            <nav className="panel-crumbs"><Link to="/panel">Collections</Link> › Dungeon generator</nav>

            <SavedList saved={paths ? saved : null} session={session} onDeleted={onDeleted} onError={onError} />

            <Generator session={session} definitions={definitions} onSaved={onSaved} onError={onError} />

        </>

    );

}


// Las mazmorras guardadas, la más nueva primero.
function SavedList({ saved, session, onDeleted, onError }){

    if(!saved){
        return <p className="panel-muted">Loading saved dungeons…</p>;
    }

    if(!saved.length){
        return null;
    }

    return (

        <section className="panel-card dungeon-saved">

            <h2>Saved dungeons</h2>

            <ul className="dungeon-saved__list">
                {saved.map(entry => (
                    <li key={entry.path}>
                        <Link to={`?view=dungeons&saved=${entry.id}`} className="dungeon-saved__name">{entry.data.name}</Link>
                        <span className="panel-muted">{describe(entry.data)}</span>
                        <DeleteDungeon
                            session={session}
                            path={entry.path}
                            name={entry.data.name}
                            onDeleted={() => onDeleted(entry.path)}
                            onError={onError}
                        />
                    </li>
                ))}
            </ul>

        </section>

    );

}


// El botón de borrar una mazmorra completada. Pide confirmación en la propia
// página, no con window.confirm: hay navegadores (como el del panel de
// Claude) que bloquean esos diálogos y los dan por cancelados sin enseñarlos,
// y entonces el botón parecía no hacer nada.
function DeleteDungeon({ session, path, name, sha = null, onDeleted, onError }){

    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState("");

    async function remove(){
        setBusy(true);
        setProblem("");
        try {
            await deleteFiles(session, [path], sha, `Delete dungeon “${name}” (completed)`);
            onDeleted();
        } catch(err){
            setBusy(false);
            if(err instanceof ApiError && err.status !== 401){
                setProblem(`Couldn't delete it: ${err.message}`);
            } else {
                onError(err);
            }
        }
    }

    if(!asking){
        return (
            <span className="dungeon-delete">
                <button type="button" className="panel-btn panel-btn--ghost" onClick={() => setAsking(true)}>
                    Completed · delete
                </button>
                {problem && <span className="panel-error">{problem}</span>}
            </span>
        );
    }

    return (
        <span className="dungeon-delete dungeon-delete--asking">
            <span>Delete it for good?</span>
            <button type="button" className="panel-btn panel-btn--danger" disabled={busy} onClick={remove}>
                {busy ? "Deleting…" : "Yes, delete"}
            </button>
            <button type="button" className="panel-btn panel-btn--ghost" disabled={busy} onClick={() => setAsking(false)}>
                Cancel
            </button>
            {problem && <span className="panel-error">{problem}</span>}
        </span>
    );

}


const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;


function describe(data){

    const parts = [
        data.dungeon ? dungeonLabel(data.dungeon) : "No dungeon",
        SIZES[data.settings?.size]?.label,
        data.createdBy && `saved by ${data.createdBy}`,
        data.createdAt && new Date(data.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    ];

    return parts.filter(Boolean).join(" · ");

}


// Cuál se usa de una lista: el parámetro dice "none", un valor concreto o
// (por defecto) "random", que lo elige la semilla.
function choose(param, list, seed, salt){

    if(param === "none"){
        return null;
    }

    if(param && param !== "random"){
        return list.find(item => item === param) ?? null;
    }

    return pickFrom(seed, salt, list);

}


function Generator({ session, definitions, onSaved, onError }){

    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();

    const seed = params.get("seed");
    const size = SIZES[params.get("size")] ? params.get("size") : "medium";
    const loops = LOOPS[params.get("loops")] ? params.get("loops") : "some";
    const hazardParam = params.get("hazard");
    const hazardChoice = HAZARDS[hazardParam] || hazardParam === "none" ? hazardParam : "random";
    const options = useMemo(() => dungeonOptions(definitions), [definitions]);
    const option = options.find(item => item.value === params.get("dungeon"));
    const place = option?.value ?? "";
    const label = option?.label ?? "";
    // Un enlace viejo puede traer una mazmorra que ya no existe (se renombró
    // o se borró): se avisa en vez de enseñar el piso vacío sin más.
    const lostPlace = !place && params.get("dungeon");

    // La ficha de la mazmorra, si tiene. Sus peligros son entre los que elige
    // "Random"; si no tiene ficha, entre todos.
    const definition = useMemo(() => {
        const data = definitionFor(place, definitions);
        return data ? cleanDefinition(data) : null;
    }, [place, definitions]);
    const hazardPool = useMemo(() => definition ? definition.hazards : Object.keys(HAZARDS), [definition]);

    const conditionParam = params.get("condition") ?? "random";
    const eventParam = params.get("event") ?? "random";

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

    const floor = useMemo(() => {

        if(!seed){
            return null;
        }

        const generated = floorFromDungeon(generateDungeon({
            seed, size, loops,
            hazard: hazardChoice,
            hazardPool,
            loot: lootFor(place),
            foes: enemiesFor(label)
        }));

        return { ...generated, details: definition ? detailsOf(definition, seed, conditionParam, eventParam) : null };

    }, [seed, size, loops, hazardChoice, hazardPool, place, label, definition, conditionParam, eventParam]);

    function update(changes){
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

    const itemPool = lootFor(place).length;
    const enemyPool = enemiesFor(label).length;
    const hazard = floor?.hazard ? HAZARDS[floor.hazard] : null;

    return (

        <>

            <div className="panel-card dungeon-controls">

                <label className="dungeon-control dungeon-control--wide">
                    <span className="panel-field__label">Dungeon</span>
                    <select className="panel-input" value={place} onChange={event => update({ dungeon: event.target.value })}>
                        <option value="">No items</option>
                        {options.map(item => (
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
                        <option value="random">
                            {!definition ? "Random" : hazardPool.length ? `Random (${hazardPool.map(key => HAZARDS[key].label).join(", ")})` : "Random (this dungeon has none)"}
                        </option>
                        {Object.entries(HAZARDS).map(([key, item]) => (
                            <option key={key} value={key}>{item.label} ({item.ability.toLowerCase()})</option>
                        ))}
                        <option value="none">None</option>
                    </select>
                </label>

                {definition && definition.conditions.length > 0 && (
                    <label className="dungeon-control">
                        <span className="panel-field__label">Weather / terrain</span>
                        <select className="panel-input" value={conditionParam} onChange={event => update({ condition: event.target.value === "random" ? "" : event.target.value })}>
                            <option value="random">Random</option>
                            {definition.conditions.map(item => <option key={item} value={item}>{item}</option>)}
                            <option value="none">None</option>
                        </select>
                    </label>
                )}

                {definition && definition.events.length > 0 && (
                    <label className="dungeon-control">
                        <span className="panel-field__label">Event</span>
                        <select className="panel-input" value={eventParam} onChange={event => update({ event: event.target.value === "random" ? "" : event.target.value })}>
                            <option value="random">Random</option>
                            {definition.events.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
                            <option value="none">None</option>
                        </select>
                    </label>
                )}

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

            {floor && (
                <>

                    <SaveForm
                        key={`${place}|${seed}`}
                        session={session}
                        floor={floor}
                        place={place}
                        label={label}
                        settings={{ seed, size, loops, hazard: hazardChoice, condition: conditionParam, event: eventParam }}
                        onSaved={(path, data) => {
                            onSaved(path, data);
                            navigate(`/panel?view=dungeons&saved=${idOf(path)}`);
                        }}
                        onError={onError}
                    />

                    {lostPlace && (
                        <div className="panel-card dungeon-items">
                            <p className="panel-error">
                                “{dungeonLabel(lostPlace)}” isn't a dungeon anymore, so this floor has no items or enemies. Pick another dungeon above.
                            </p>
                        </div>
                    )}

                    <FloorView
                        floor={floor}
                        fileName={`${place ? `${place.toLowerCase().replace(/\W+/g, "-")}-` : "dungeon-"}${seed}`}
                        enemies={place ? {
                            intro: `${floor.enemies.length} picked at random from the ${enemyPool} ${enemyPool === 1 ? "enemy" : "enemies"} that the Pokédex places in ${label}. Mini bosses and bosses are left out.`,
                            empty: enemyPool ? null : (
                                <>
                                    The Pokédex has no enemies for {label} yet (mini bosses and bosses never show up at random), so this floor has none.
                                    {" "}<Link to="/panel?view=pokedex">Add some in the Pokédex</Link> and tick {label} under Dungeon. New entries show up here once the site is published.
                                </>
                            )
                        } : null}
                        items={place ? {
                            intro: `${floor.items.length} picked from the ${plural(itemPool, "item")} that the item list places in ${label} (or anywhere). Rarer ones show up less.`
                                + (hazard && floor.stats.hazardRooms > 0 ? ` Each ${hazard.label.toLowerCase()} room hides one, with better odds of something rare.` : ""),
                            empty: itemPool ? null : (
                                <>
                                    The item list has nothing to find in {label} (or anywhere), so this floor has no items.
                                    {" "}<Link to="/panel?c=items">Open the items</Link> and add {place} to the locations of the ones that should show up here.
                                </>
                            )
                        } : null}
                    />

                </>
            )}

        </>

    );

}


// Lo que la ficha de la mazmorra aporta a este piso: su gimmick, el clima o
// terreno y el evento que tocan, y sus jefes. Los jefes se copian (nombre,
// imagen, tipos) para que el piso guardado no dependa de la Pokédex.
function detailsOf(definition, seed, conditionParam, eventParam){

    const boss = id => {
        const entry = id ? ENEMIES_BY_ID[id] : null;
        return entry ? { id, name: enemyName(entry), image: entry.image, types: entry.types.filter(Boolean) } : null;
    };

    const eventName = choose(eventParam, definition.events.map(event => event.name), seed, "event");

    return {
        name: definition.name,
        gimmick: definition.gimmick,
        gimmickText: definition.gimmickText,
        condition: choose(conditionParam, definition.conditions, seed, "condition"),
        conditionCount: definition.conditions.length,
        event: definition.events.find(event => event.name === eventName) ?? null,
        eventCount: definition.events.length,
        miniboss: boss(definition.miniboss),
        boss: boss(definition.boss)
    };

}


// Guardar el piso que se ve, con un nombre. Se guarda tal cual (mapa, objetos
// y enemigos), no solo las opciones.
function SaveForm({ session, floor, place, label, settings, onSaved, onError }){

    const [name, setName] = useState(`${label || "Dungeon"} · ${settings.seed}`);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState("");

    async function save(event){

        event.preventDefault();

        const title = name.trim();

        if(!title){
            setProblem("Give it a name first.");
            return;
        }

        setBusy(true);
        setProblem("");

        const path = newDungeonPath();
        const data = toSnapshot(floor, { name: title, place, settings, user: session.user });

        try {
            await writeJson(session, path, data, null, `Save dungeon “${title}”`);
            onSaved(path, data);
        } catch(err){
            setBusy(false);
            if(err instanceof ApiError && err.status !== 401){
                setProblem(err.message);
            } else {
                onError(err);
            }
        }

    }

    return (

        <form className="panel-card dungeon-save" onSubmit={save}>
            <label className="dungeon-control dungeon-control--wide">
                <span className="panel-field__label">Save this floor as</span>
                <input className="panel-input" value={name} maxLength={80} onChange={event => setName(event.target.value)} />
            </label>
            <button type="submit" className="panel-btn panel-btn--primary" disabled={busy}>{busy ? "Saving…" : "Save dungeon"}</button>
            {problem && <p className="panel-error dungeon-save__problem">{problem}</p>}
        </form>

    );

}


// Una mazmorra guardada: se lee siempre de GitHub (el build puede ir por
// detrás) y se enseña igual que en el generador, con el botón de borrarla
// cuando se completa.
function SavedDungeon({ session, path, known, onDeleted, onError }){

    const navigate = useNavigate();
    const [entry, setEntry] = useState(null);
    const [notFound, setNotFound] = useState(false);

    // `known` es null mientras no se sabe qué archivos hay, y false si este no
    // está entre ellos (ya se borró).
    const missing = known === false || notFound;

    useEffect(() => {

        if(!known){
            return;
        }

        readJson(session, path)
            .then(result => setEntry(result))
            .catch(err => {
                if(err instanceof ApiError && err.status === 404){
                    setNotFound(true);
                } else {
                    onError(err);
                }
            });

    }, [session, path, known, onError]);

    const floor = useMemo(() => entry ? fromSnapshot(entry.data) : null, [entry]);

    const crumbs = <nav className="panel-crumbs"><Link to="/panel">Collections</Link> › <Link to="?view=dungeons">Dungeon generator</Link> › {entry?.data.name ?? "Saved dungeon"}</nav>;

    if(missing){
        return (
            <>
                {crumbs}
                <div className="panel-card">
                    <p className="panel-error">This dungeon isn't saved anymore. Someone probably deleted it after it was completed.</p>
                    <Link to="?view=dungeons" className="panel-btn">Back to the generator</Link>
                </div>
            </>
        );
    }

    if(!entry){
        return <>{crumbs}<p className="panel-muted">Loading…</p></>;
    }

    const { data } = entry;

    return (

        <>

            {crumbs}

            <div className="panel-card dungeon-saved-head">
                <div>
                    <h2>{data.name}</h2>
                    <p className="panel-muted">{describe(data)}</p>
                </div>
                <DeleteDungeon
                    session={session}
                    path={path}
                    name={data.name}
                    sha={entry.sha}
                    onDeleted={() => {
                        onDeleted(path);
                        navigate("/panel?view=dungeons", { replace: true });
                    }}
                    onError={onError}
                />
            </div>

            <FloorView
                floor={floor}
                fileName={`${data.dungeon ? `${data.dungeon.toLowerCase().replace(/\W+/g, "-")}-` : "dungeon-"}${data.settings?.seed ?? idOf(path)}`}
                enemies={data.dungeon ? { intro: "", empty: "No enemies on this floor." } : null}
                items={data.dungeon ? { intro: "", empty: "No items on this floor." } : null}
            />

        </>

    );

}
