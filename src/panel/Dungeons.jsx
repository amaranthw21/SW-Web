import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError, deleteFiles, listFiles, readJson, writeJson } from "./api";
import { FloorView } from "./FloorView";
import { bundledData } from "./schema";
import { HAZARDS, LOOPS, SIZES, generateDungeon, randomSeed } from "./dungeon/generate";
import { DUNGEONS, dungeonLabel, lootFor } from "./dungeon/loot";
import { enemiesFor } from "./dungeon/enemies";
import { FOLDER, floorFromDungeon, fromSnapshot, idOf, newDungeonPath, toSnapshot } from "./dungeon/floor";


// Generador de mazmorras para los moderadores: saca un piso al estilo Mundo
// Misterioso (salas, pasillos, punto de inicio y escaleras) para explicar las
// mazmorras a los jugadores. Las opciones van en la dirección (semilla,
// tamaño, bucles, mazmorra), así que copiar el enlace basta para que otro vea
// el mismo mapa. Al elegir una mazmorra, los objetos y enemigos salen de la
// lista de objetos y de la Pokédex.
//
// Un piso se puede guardar (src/content/dungeons/) para volver a él mientras
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

            <Generator session={session} onSaved={onSaved} onError={onError} />

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


function Generator({ session, onSaved, onError }){

    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();

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

    const floor = useMemo(
        () => seed ? floorFromDungeon(generateDungeon({
            seed, size, loops,
            hazard: hazardChoice,
            loot: lootFor(place),
            foes: enemiesFor(dungeonLabel(place))
        })) : null,
        [seed, size, loops, hazardChoice, place]
    );

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

    const label = place ? dungeonLabel(place) : "";
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

            {floor && (
                <>

                    <SaveForm
                        key={`${place}|${seed}`}
                        session={session}
                        floor={floor}
                        place={place}
                        settings={{ seed, size, loops, hazard: hazardChoice }}
                        onSaved={(path, data) => {
                            onSaved(path, data);
                            navigate(`/panel?view=dungeons&saved=${idOf(path)}`);
                        }}
                        onError={onError}
                    />

                    {lostPlace && (
                        <div className="panel-card dungeon-items">
                            <p className="panel-error">
                                “{dungeonLabel(lostPlace)}” isn't a dungeon in the item list anymore, so this floor has no items or enemies. Pick another dungeon above.
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


// Guardar el piso que se ve, con un nombre. Se guarda tal cual (mapa, objetos
// y enemigos), no solo las opciones.
function SaveForm({ session, floor, place, settings, onSaved, onError }){

    const [name, setName] = useState(`${place ? dungeonLabel(place) : "Dungeon"} · ${settings.seed}`);
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
