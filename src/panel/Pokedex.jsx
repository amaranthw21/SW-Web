import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import DexCard from "../components/DexCard";
import { TYPES } from "../data/pokemon";
import normalize from "../lib/normalize";
import { KINDS, MAX_IMAGE_BYTES, SIZES, cleanEntry, emptyEntry, moveRange, newId, publicView, revealCount, sizeLabel, typeSlots } from "../lib/pokedex";

import { ApiError, deleteDex, dexImageBlob, listDex, removeDexImage, saveDex, uploadDexImage } from "./api";
import { DUNGEONS } from "./dungeon/loot";


// La Pokédex en el panel: los moderadores ven y editan todo, y marcan qué ha
// descubierto ya la gente. Lo marcado es lo único que llega a la página
// pública (/pokedex). No va por GitHub como el resto: se guarda al momento en
// el Worker (ver src/lib/pokedex.js).
//
// Dónde se está va en la dirección: ?view=pokedex, &id=<id> para una entrada,
// &new=amalgam|boss para crear una.
export function Pokedex({ session, onError }){

    const [params] = useSearchParams();
    const [entries, setEntries] = useState(null);

    useEffect(() => {
        listDex(session).then(setEntries).catch(onError);
    }, [session, onError]);

    const id = params.get("id");
    const creating = params.get("new");

    if(!entries){
        return <p className="panel-muted">Loading…</p>;
    }

    if(id || creating){

        const existing = entries.find(entry => entry.id === id);

        if(id && !existing){
            return (
                <div className="panel-card">
                    <p>This entry doesn't exist any more.</p>
                    <Link to="?view=pokedex" className="panel-btn">Back to the Pokédex</Link>
                </div>
            );
        }

        return (
            <DexEditor
                key={id ?? `new-${creating}`}
                session={session}
                initial={existing ?? { ...emptyEntry(creating), id: newId(), updated: null, image: null }}
                isNew={!existing}
                onSaved={entry => setEntries(current => [...current.filter(item => item.id !== entry.id), entry])}
                onDeleted={removed => setEntries(current => current.filter(item => item.id !== removed))}
                onError={onError}
            />
        );

    }

    return <DexList entries={entries} />;

}


function DexList({ entries }){

    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const kind = params.get("kind") === "boss" ? "boss" : "amalgam";

    const shown = entries
        .filter(entry => entry.kind === kind)
        .filter(entry => !query || normalize(`${entry.name} ${entry.number ?? ""}`).includes(normalize(query)))
        .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.name.localeCompare(b.name));

    return (

        <>

            <div className="panel-crumbs"><Link to="/panel">Panel</Link> › Pokédex</div>

            <div className="panel-note">
                Players see an enemy on the <Link to="/pokedex" target="_blank">Pokédex page</Link> once
                it's marked <strong>Seen</strong>, and only the parts marked <strong>Discovered</strong>.
                Everything else shows as ???. Changes reach the page within a minute; they don't wait for a deploy.
            </div>

            <div className="panel-toolbar">
                <div className="dex-tabs" role="group" aria-label="Kind">
                    {KINDS.map(item => (
                        <button
                            key={item.value}
                            type="button"
                            className={`panel-btn${item.value === kind ? " panel-btn--primary" : ""}`}
                            aria-pressed={item.value === kind}
                            onClick={() => setParams({ view: "pokedex", kind: item.value })}
                        >
                            {item.plural} ({entries.filter(entry => entry.kind === item.value).length})
                        </button>
                    ))}
                </div>
                <Link to={`?view=pokedex&new=${kind}`} className="panel-btn panel-btn--primary">
                    New {kind === "boss" ? "boss" : "amalgam"}
                </Link>
            </div>

            <input
                className="panel-input dex-search"
                type="search"
                placeholder="Search by name or number…"
                value={query}
                onChange={event => setQuery(event.target.value)}
            />

            {shown.length === 0
                ? <p className="panel-muted">{query ? "Nothing matches." : "None yet."}</p>
                : (
                    <ul className="panel-entries">
                        {shown.map(entry => {
                            const { shown: found, total } = revealCount(entry);
                            return (
                                <li key={entry.id}>
                                    <Link to={`?view=pokedex&id=${entry.id}`} className="dex-row">
                                        <span>
                                            <span className="dex-row__number">{entry.number ?? "—"}</span>
                                            {entry.name || <em className="panel-muted">Unnamed</em>}
                                            {entry.kind === "amalgam" && <span className="panel-muted"> · {sizeLabel(entry.size)}</span>}
                                        </span>
                                        <span className={`dex-row__state${entry.revealed.seen ? " is-seen" : ""}`}>
                                            {entry.revealed.seen ? `Seen · ${found}/${total} discovered` : "Not seen yet"}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}

        </>

    );

}


// La casilla de "descubierto" que va junto a cada dato.
function Reveal({ on, onChange, label = "Discovered" }){

    return (

        <label className={`dex-reveal${on ? " is-on" : ""}`} title="Players can see this on the Pokédex page">
            <input type="checkbox" checked={on} onChange={event => onChange(event.target.checked)} />
            {label}
        </label>

    );

}


function Field({ label, hint, reveal, children }){

    return (

        <div className="panel-field">
            <div className="dex-field__head">
                <span className="panel-field__label">{label}</span>
                {reveal}
            </div>
            {children}
            {hint && <p className="panel-field__hint">{hint}</p>}
        </div>

    );

}


function TypeSelect({ value, onChange, placeholder = "—" }){

    return (

        <select className="panel-input" value={value} onChange={event => onChange(event.target.value)}>
            <option value="">{placeholder}</option>
            {TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>

    );

}


function DexEditor({ session, initial, isNew, onSaved, onDeleted, onError }){

    const [, setParams] = useSearchParams();
    const [entry, setEntry] = useState(initial);
    const [saved, setSaved] = useState(!isNew);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const [problem, setProblem] = useState("");
    const [loaded, setLoaded] = useState(null);

    const version = entry.image?.version;
    const image = version && loaded?.version === version ? loaded.url : null;

    // La imagen se baja con la sesión (puede estar aún oculta).
    useEffect(() => {

        if(!version){
            return;
        }

        let url;
        let live = true;

        dexImageBlob(session, entry.id, version)
            .then(next => { url = next; if(live) setLoaded({ version, url: next }); })
            .catch(() => {});

        return () => {
            live = false;
            if(url) URL.revokeObjectURL(url);
        };

    }, [session, entry.id, version]);

    // Avisa antes de cerrar la pestaña con cambios sin guardar.
    useEffect(() => {

        if(!dirty){
            return;
        }

        const warn = event => event.preventDefault();

        window.addEventListener("beforeunload", warn);

        return () => window.removeEventListener("beforeunload", warn);

    }, [dirty]);

    function change(update){
        setEntry(current => {
            const next = typeof update === "function" ? update(current) : { ...current, ...update };
            return { ...next, ...cleanForm(next) };
        });
        setDirty(true);
        setStatus("");
    }

    function reveal(key, value){
        change(current => ({ ...current, revealed: { ...current.revealed, [key]: value } }));
    }

    function setSlot(list, index, value){
        change(current => {
            const values = [...current[list]];
            values[index] = value;
            return { ...current, [list]: values };
        });
    }

    function revealSlot(list, index, value){
        change(current => {
            const flags = [...current.revealed[list]];
            flags[index] = value;
            return { ...current, revealed: { ...current.revealed, [list]: flags } };
        });
    }

    function removeMove(index){
        change(current => ({
            ...current,
            moves: current.moves.filter((_, i) => i !== index),
            revealed: { ...current.revealed, moves: current.revealed.moves.filter((_, i) => i !== index) }
        }));
    }

    function revealAll(value){
        change(current => ({
            ...current,
            revealed: {
                seen: value || current.revealed.seen,
                name: value,
                image: value,
                types: current.types.map(() => value),
                hiddenType: value,
                ability: value,
                moves: current.moves.map(() => value),
                description: value,
                dungeons: value
            }
        }));
    }

    function fail(err){
        if(err instanceof ApiError && err.status !== 401){
            setProblem(err.message);
        } else {
            onError(err);
        }
    }

    async function save(){

        if(!entry.name.trim()){
            setProblem("The enemy needs a name (players won't see it until it's discovered).");
            return;
        }

        setBusy(true);
        setProblem("");

        try {
            const next = await saveDex(session, entry);
            setEntry(next);
            setSaved(true);
            setDirty(false);
            setStatus("Saved. Players see it within a minute.");
            onSaved(next);
            if(isNew){
                setParams({ view: "pokedex", id: next.id }, { replace: true });
            }
        } catch(err){
            fail(err);
        } finally {
            setBusy(false);
        }

    }

    async function remove(){

        if(!window.confirm(`Delete “${entry.name || "this entry"}” from the Pokédex? This can't be undone.`)){
            return;
        }

        setBusy(true);

        try {
            await deleteDex(session, entry.id);
            onDeleted(entry.id);
            setDirty(false);
            setParams({ view: "pokedex", kind: entry.kind }, { replace: true });
        } catch(err){
            fail(err);
            setBusy(false);
        }

    }

    // La imagen se guarda sola, aparte del resto: solo trae de vuelta la
    // imagen y la versión nueva, para no pisar lo que haya sin guardar.
    async function pickImage(file){

        if(!file){
            return;
        }

        if(file.size > MAX_IMAGE_BYTES){
            setProblem("The picture must be under 2 MB.");
            return;
        }

        setBusy(true);
        setProblem("");

        try {
            const next = file === "remove"
                ? await removeDexImage(session, entry.id)
                : await uploadDexImage(session, entry.id, file);
            setEntry(current => ({ ...current, image: next.image, updated: next.updated }));
            onSaved({ ...next });
            setStatus(file === "remove" ? "Picture removed." : "Picture saved.");
        } catch(err){
            fail(err);
        } finally {
            setBusy(false);
        }

    }

    const boss = entry.kind === "boss";
    const [minMoves, maxMoves] = moveRange(entry);
    const filledMoves = entry.moves.filter(Boolean).length;
    const preview = useMemo(() => publicView({ ...entry, revealed: { ...entry.revealed, seen: true } }), [entry]);
    const typeCount = typeSlots(entry.kind);

    return (

        <>

            <div className="panel-crumbs">
                <Link to="/panel">Panel</Link> › <Link to={`?view=pokedex&kind=${entry.kind}`}>Pokédex</Link> › {entry.name || "New entry"}
            </div>

            <div className="dex-editor">

                <div className="panel-editor">

                    <div className="panel-card dex-seen">
                        <label className="panel-switch">
                            <input
                                type="checkbox"
                                checked={entry.revealed.seen}
                                onChange={event => reveal("seen", event.target.checked)}
                            />
                            <strong>Seen</strong>
                        </label>
                        <span className="panel-muted">
                            {entry.revealed.seen
                                ? "Listed on the Pokédex page, with the discovered parts."
                                : "Not on the Pokédex page at all."}
                        </span>
                        <div className="panel-row dex-seen__all">
                            <button type="button" className="panel-btn panel-btn--ghost" onClick={() => revealAll(true)}>Discover everything</button>
                            <button type="button" className="panel-btn panel-btn--ghost" onClick={() => revealAll(false)}>Hide everything</button>
                        </div>
                    </div>

                    <div className="dex-pair">
                        <Field label="Number (#)" hint="Its place in the Pokédex. Always shown.">
                            <input
                                className="panel-input panel-input--short"
                                type="number"
                                value={entry.number ?? ""}
                                onChange={event => change({ number: event.target.value === "" ? null : Math.trunc(Number(event.target.value)) })}
                            />
                        </Field>

                        <Field label="Kind">
                            <select className="panel-input" value={entry.kind} onChange={event => change({ kind: event.target.value })}>
                                {KINDS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </Field>

                        {!boss && (
                            <Field label="Size" hint="Sets how many moves it has. Always shown.">
                                <select className="panel-input" value={entry.size} onChange={event => change({ size: event.target.value })}>
                                    {SIZES.map(size => (
                                        <option key={size.value} value={size.value}>
                                            {size.label} ({size.moves[0] === size.moves[1] ? size.moves[0] : size.moves.join("–")} moves)
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}
                    </div>

                    <Field label="Name" hint={boss ? undefined : "The fusion's name."} reveal={<Reveal on={entry.revealed.name} onChange={value => reveal("name", value)} />}>
                        <input className="panel-input" value={entry.name} onChange={event => change({ name: event.target.value })} />
                    </Field>

                    <Field label="Picture" reveal={<Reveal on={entry.revealed.image} onChange={value => reveal("image", value)} />}>
                        <div className="panel-image">
                            <div className="panel-image__thumb">
                                {image ? <img src={image} alt="" /> : entry.image ? "…" : "None"}
                            </div>
                            <div className="panel-image__side">
                                {saved
                                    ? (
                                        <div className="panel-row">
                                            <label className={`panel-btn${busy ? " is-disabled" : ""}`}>
                                                {entry.image ? "Replace" : "Upload"}
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                                                    hidden
                                                    disabled={busy}
                                                    onChange={event => { pickImage(event.target.files[0]); event.target.value = ""; }}
                                                />
                                            </label>
                                            {entry.image && (
                                                <button type="button" className="panel-btn panel-btn--ghost" disabled={busy} onClick={() => pickImage("remove")}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    )
                                    : <span className="panel-muted">Save the entry first, then add its picture.</span>}
                                <span className="panel-muted">PNG, JPEG, WebP, GIF or AVIF, under 2 MB. It's saved straight away.</span>
                            </div>
                        </div>
                    </Field>

                    <Field label="Types" hint={boss ? "One or two, like a normal Pokémon." : "Up to three: it's a fusion."}>
                        <div className="dex-slots">
                            {Array.from({ length: typeCount }, (_, i) => (
                                <div key={i} className="dex-slot">
                                    <TypeSelect
                                        value={entry.types[i] ?? ""}
                                        placeholder={i === 0 ? "Pick a type" : "—"}
                                        onChange={value => setSlot("types", i, value)}
                                    />
                                    {entry.types[i] && (
                                        <Reveal on={entry.revealed.types[i] ?? false} onChange={value => revealSlot("types", i, value)} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </Field>

                    {boss && (
                        <Field label="Hidden type" reveal={<Reveal on={entry.revealed.hiddenType} onChange={value => reveal("hiddenType", value)} />}>
                            <TypeSelect value={entry.hiddenType} onChange={value => change({ hiddenType: value })} />
                        </Field>
                    )}

                    <Field label="Ability" reveal={<Reveal on={entry.revealed.ability} onChange={value => reveal("ability", value)} />}>
                        <input className="panel-input" placeholder="Name" value={entry.ability} onChange={event => change({ ability: event.target.value })} />
                        <textarea
                            className="panel-input panel-input--area"
                            rows={2}
                            placeholder="What it does (optional)"
                            value={entry.abilityText}
                            onChange={event => change({ abilityText: event.target.value })}
                        />
                    </Field>

                    <Field
                        label={`Moves (${filledMoves}/${minMoves === maxMoves ? maxMoves : `${minMoves}–${maxMoves}`})`}
                        hint={filledMoves < minMoves ? `${boss ? "A boss" : `A ${sizeLabel(entry.size).toLowerCase()} amalgam`} has ${minMoves === maxMoves ? minMoves : `${minMoves} to ${maxMoves}`} moves.` : undefined}
                    >
                        <div className="dex-slots dex-slots--list">
                            {entry.moves.map((move, i) => (
                                <div key={i} className="dex-slot">
                                    <input className="panel-input" value={move} placeholder={`Move ${i + 1}`} onChange={event => setSlot("moves", i, event.target.value)} />
                                    <Reveal on={entry.revealed.moves[i] ?? false} onChange={value => revealSlot("moves", i, value)} />
                                    <button type="button" className="panel-btn panel-btn--ghost" title="Remove this move" onClick={() => removeMove(i)}>×</button>
                                </div>
                            ))}
                        </div>
                        {entry.moves.length < maxMoves && (
                            <div>
                                <button type="button" className="panel-btn" onClick={() => setSlot("moves", entry.moves.length, "")}>Add a move</button>
                            </div>
                        )}
                        {entry.moves.length > maxMoves && (
                            <p className="panel-error">Too many moves for this size: it takes at most {maxMoves}.</p>
                        )}
                    </Field>

                    <Field label="Description" hint="A short text about it, Pokédex style." reveal={<Reveal on={entry.revealed.description} onChange={value => reveal("description", value)} />}>
                        <textarea className="panel-input panel-input--area" rows={4} value={entry.description} onChange={event => change({ description: event.target.value })} />
                    </Field>

                    <Field label="Found in" hint="The dungeons where it shows up." reveal={<Reveal on={entry.revealed.dungeons} onChange={value => reveal("dungeons", value)} />}>
                        <div className="dex-dungeons">
                            {[...new Set([...DUNGEONS.map(item => item.label), ...entry.dungeons])].map(name => (
                                <label key={name} className="panel-switch">
                                    <input
                                        type="checkbox"
                                        checked={entry.dungeons.includes(name)}
                                        onChange={event => change(current => ({
                                            ...current,
                                            dungeons: event.target.checked
                                                ? [...current.dungeons, name]
                                                : current.dungeons.filter(item => item !== name)
                                        }))}
                                    />
                                    {name}
                                </label>
                            ))}
                        </div>
                    </Field>

                    <Field label="Moderator notes" hint="Never shown to players: tactics, drops, reminders…">
                        <textarea className="panel-input panel-input--area" rows={3} value={entry.notes} onChange={event => change({ notes: event.target.value })} />
                    </Field>

                </div>

                <aside className="dex-preview">
                    <h3 className="panel-subhead">What players see</h3>
                    {!entry.revealed.seen && <p className="panel-muted">Not seen yet: it isn't on the page. Once it is, it'll look like this.</p>}
                    <DexCard entry={preview} image={entry.revealed.image ? image : null} />
                </aside>

            </div>

            <div className="panel-savebar">
                {problem && <p className="panel-error">{problem}</p>}
                <div className="panel-row">
                    {status && <span className="panel-ok">{status}</span>}
                    {saved && (
                        <button type="button" className="panel-btn panel-btn--danger panel-savebar__delete" disabled={busy} onClick={remove}>
                            Delete
                        </button>
                    )}
                    <button type="button" className="panel-btn panel-btn--primary" disabled={busy || (!dirty && saved)} onClick={save}>
                        {busy ? "Saving…" : isNew && !saved ? "Create" : "Save"}
                    </button>
                </div>
            </div>

        </>

    );

}


// Mientras se edita, los huecos vacíos se quedan (un movimiento a medio
// escribir, el segundo tipo sin elegir). cleanEntry es para lo guardado; aquí
// solo se ajusta lo que depende de la clase y el tamaño.
function cleanForm(entry){

    const kind = entry.kind === "boss" ? "boss" : "amalgam";
    const slots = typeSlots(kind);
    const types = Array.from({ length: slots }, (_, i) => entry.types[i] ?? "");
    const clean = cleanEntry(entry);

    return {
        kind,
        size: clean.size,
        types,
        hiddenType: kind === "boss" ? entry.hiddenType ?? "" : "",
        revealed: {
            ...entry.revealed,
            types: types.map((_, i) => entry.revealed.types?.[i] === true),
            moves: entry.moves.map((_, i) => entry.revealed.moves?.[i] === true),
            hiddenType: kind === "boss" && entry.revealed.hiddenType === true
        }
    };

}
