import { useEffect, useMemo, useState } from "react";
import CopyTemplate from "./CopyTemplate";
import Dropdown from "./Dropdown";
import TypeBadge from "./TypeBadge";
import { worlds, worldsHint } from "../data/characterTypes";
import asset from "../lib/asset";
import pokemon, { TYPES } from "../data/pokemon";
import { fillTemplate, parseTemplate } from "../lib/ocTemplate";


// Algunas preguntas no se escriben a mano sino que se eligen de nuestras
// listas. Se reconocen por su nombre en la plantilla.
//
//   "Specie 1", "Species 2"…           → la lista de Pokémon.
//   "Main Type 1", "Hidden Type"…      → los tipos.
//   "World of Origin"                  → los mundos del panel, más "Other".
//   "Move (Type/PP)"                   → nombre, categoría, tipo, PP y si es
//                                        legendario, como en el panel.
function kindOf(label){

    if(/^move\b/i.test(label)){
        return "move";
    }

    if(/^species?\s*\d*$/i.test(label)){
        return "species";
    }

    if(/\btype\b/i.test(label)){
        return "type";
    }

    if(/^world of origin$/i.test(label)){
        return "world";
    }

    return "text";

}


// "Articuno" y "Articuno (Galarian)": el "+" del Excel ("+ Galarian", la forma
// normal y la regional en una fila) no hace falta aquí.
const SPECIES = [...new Map(
    pokemon.map(entry => {
        const form = entry.form?.replace(/^\+\s*/, "").trim();
        const label = form ? `${entry.name} (${form})` : entry.name;
        return [label, { label, image: entry.image }];
    })
).values()];

const OTHER = "__other";


// Shadow, Radiant y Stellar son tipos especiales del servidor: un OC nuevo no
// los elige.
const TYPE_OPTIONS = TYPES.filter(type => !["Stellar", "Shadow", "Radiant"].includes(type.value));

const CATEGORIES = ["Physical", "Special", "Status"].map(value => ({ value, label: value }));

// Cada tipo se ve con su insignia de color, como en la lista de Pokémon.
const showType = option => <TypeBadge type={option.value} />;


// Lo escrito se guarda en el navegador de quien lo escribe, para que recargar
// la página o cerrarla sin querer no borre un OC a medias. Si el navegador no
// deja guardar (ventana privada…), simplemente no se guarda.
function load(key){

    try {
        return JSON.parse(localStorage.getItem(key)) ?? {};
    } catch {
        return {};
    }

}


function save(key, data){

    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // Sin almacenamiento: se trabaja igual, solo que no se recuerda.
    }

}


// El cuestionario del OC Maker: se elige una versión (Full, Slice of Life…),
// se contestan las preguntas que salen de su plantilla y, debajo, se va
// formando la plantilla completa, lista para copiar en Discord.
//
// `versions` son los apartados del tipo que tienen plantilla; `storageKey`
// separa lo guardado de cada tipo de personaje.
export default function OcMaker({ versions, storageKey, typeId, legendaryMoves = false }){

    const [state, setState] = useState(() => load(storageKey));

    useEffect(() => save(storageKey, state), [storageKey, state]);


    const current = versions.find(version => version.title === state.version) ?? versions[0];
    const values = state.values?.[current?.title] ?? {};
    const extras = state.extras ?? [];

    const tokens = useMemo(() => parseTemplate(current?.template), [current]);

    const worldOptions = worlds.filter(world => !(world.notFor ?? []).includes(typeId));


    if(!current){

        return <p className="section-tabs__hint">There are no templates to fill in yet.</p>;

    }


    function setValue(key, value){

        setState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                [current.title]: { ...prev.values?.[current.title], [key]: value }
            }
        }));

    }


    function setExtras(next){

        setState(prev => ({ ...prev, extras: next }));

    }


    function reset(){

        if(window.confirm("Clear everything you've written for this OC?")){
            setState({ version: current.title });
        }

    }


    // Las preguntas repetidas (los seis "Move (Type/PP)") se numeran en el
    // formulario para distinguirlas; en la plantilla siguen saliendo igual.
    const totals = {};
    const seen = {};

    for(const token of tokens){
        if(token.type === "field"){
            totals[token.label] = (totals[token.label] ?? 0) + 1;
        }
    }


    return (

        <div className="oc-maker">

            {
                versions.length > 1 && (

                    <div className="oc-maker__versions" role="group" aria-label="Version">
                        {
                            versions.map(version => (
                                <button
                                    key={version.title}
                                    type="button"
                                    className={`section-tab${version === current ? " section-tab--on" : ""}`}
                                    aria-pressed={version === current}
                                    onClick={() => setState(prev => ({ ...prev, version: version.title }))}
                                >
                                    {version.title}
                                </button>
                            ))
                        }
                    </div>

                )
            }


            <form className="oc-maker__form" onSubmit={event => event.preventDefault()}>

                {
                    tokens.map((token, i) => {

                        if(token.type === "heading"){
                            return token.top
                                ? null
                                : <h3 key={i} className="block-part__title oc-maker__heading">{token.label}</h3>;
                        }

                        if(token.type === "group"){
                            return <p key={i} className="oc-maker__group">{token.label}</p>;
                        }

                        if(token.type !== "field"){
                            return null;
                        }

                        seen[token.label] = (seen[token.label] ?? 0) + 1;

                        // "Move (Type/PP)" ya no hace falta explicarlo: lo
                        // piden los campos del movimiento.
                        const base = kindOf(token.label) === "move" ? "Move" : token.label;

                        const label = totals[token.label] > 1
                            ? `${base} #${seen[token.label]}`
                            : base;

                        const id = `oc-${token.key}`;
                        const nested = (token.indent?.length ?? 0) > 1;

                        return (

                            <div key={token.key} className={`oc-maker__field${nested ? " oc-maker__field--nested" : ""}`}>

                                <label htmlFor={id}>{label}</label>

                                {
                                    kindOf(token.label) === "move" && (
                                        <MoveFields label={label} fieldKey={token.key} values={values} setValue={setValue} legendary={legendaryMoves} />
                                    )
                                }

                                {
                                    token.long && token.line !== null && kindOf(token.label) !== "move" && (
                                        <input
                                            className="oc-maker__input"
                                            type="text"
                                            placeholder="Name (optional)"
                                            aria-label={`${label}: name`}
                                            value={values[`${token.key}:inline`] ?? ""}
                                            onChange={event => setValue(`${token.key}:inline`, event.target.value)}
                                        />
                                    )
                                }

                                {
                                    !token.long && kindOf(token.label) !== "text"
                                        ? <Picker
                                              id={id}
                                              kind={kindOf(token.label)}
                                              fieldKey={token.key}
                                              values={values}
                                              setValue={setValue}
                                              worldOptions={worldOptions}
                                          />
                                        : token.long
                                        ? <textarea
                                              id={id}
                                              className="oc-maker__input oc-maker__input--area"
                                              rows={3}
                                              placeholder="Description"
                                              value={values[token.key] ?? ""}
                                              onChange={event => setValue(token.key, event.target.value)}
                                          />
                                        : <input
                                              id={id}
                                              className="oc-maker__input"
                                              type="text"
                                              value={values[token.key] ?? ""}
                                              onChange={event => setValue(token.key, event.target.value)}
                                          />
                                }

                            </div>

                        );

                    })
                }


                <h3 className="block-part__title oc-maker__heading">EXTRAS</h3>

                <p className="oc-maker__hint">
                    Anything else you want to add about your OC. Each one goes at the end of the sheet.
                </p>

                {
                    extras.map((extra, i) => (

                        <div key={i} className="oc-maker__extra">

                            <div className="oc-maker__extra-head">

                                <input
                                    className="oc-maker__input"
                                    type="text"
                                    placeholder="Title"
                                    aria-label={`Extra ${i + 1}: title`}
                                    value={extra.title ?? ""}
                                    onChange={event => setExtras(extras.map((e, j) => j === i ? { ...e, title: event.target.value } : e))}
                                />

                                <button
                                    type="button"
                                    className="oc-maker__button oc-maker__button--ghost"
                                    aria-label={`Remove extra ${i + 1}`}
                                    onClick={() => setExtras(extras.filter((_, j) => j !== i))}
                                >
                                    Remove
                                </button>

                            </div>

                            <textarea
                                className="oc-maker__input oc-maker__input--area"
                                rows={3}
                                placeholder="Details"
                                aria-label={`Extra ${i + 1}: details`}
                                value={extra.text ?? ""}
                                onChange={event => setExtras(extras.map((e, j) => j === i ? { ...e, text: event.target.value } : e))}
                            />

                        </div>

                    ))
                }

                <div className="oc-maker__actions">

                    <button type="button" className="oc-maker__button" onClick={() => setExtras([...extras, { title: "", text: "" }])}>
                        + Add extra
                    </button>

                    <button type="button" className="oc-maker__button oc-maker__button--ghost" onClick={reset}>
                        Clear all
                    </button>

                </div>

            </form>


            <CopyTemplate title="Your finished sheet" text={fillTemplate(tokens, answers(tokens, values, legendaryMoves), extras)} />

        </div>

    );

}


// Lo que se escribe en la plantilla. Casi todo va tal cual; el mundo "Other"
// pone el nombre escrito y, debajo, su descripción.
function answers(tokens, values, legendaryMoves){

    const out = { ...values };

    for(const token of tokens){

        // "Thunderbolt (Special-Electric/15) [Legendary]", como lo resume el panel.
        if(token.type === "field" && kindOf(token.label) === "move"){

            const name = (values[`${token.key}:name`] ?? "").trim();
            const category = values[`${token.key}:cat`] ?? "";
            const type = values[`${token.key}:type`] ?? "";
            const pp = String(values[`${token.key}:pp`] ?? "").trim();

            const kind = [category, type].filter(Boolean).join("-");
            const detail = [kind, pp].filter(Boolean).join("/");

            out[`${token.key}:inline`] = name && [
                name,
                detail && `(${detail})`,
                legendaryMoves && values[`${token.key}:legendary`] && "[Legendary]"
            ].filter(Boolean).join(" ");

        }

        if(token.type === "field" && kindOf(token.label) === "world" && values[token.key] === OTHER){
            out[token.key] = values[`${token.key}:name`] ?? "";
            out[`${token.key}:quote`] = values[`${token.key}:desc`] ?? "";
        }

    }

    return out;

}


// Una pregunta que se contesta eligiendo de una lista.
function Picker({ id, kind, fieldKey, values, setValue, worldOptions }){

    const value = values[fieldKey] ?? "";

    if(kind === "species"){

        return <SpeciesSearch id={id} value={value} onChange={next => setValue(fieldKey, next)} />;

    }


    if(kind === "type"){

        return (
            <Dropdown id={id} value={value} onChange={next => setValue(fieldKey, next)} options={TYPE_OPTIONS} renderOption={showType} />
        );

    }


    return (

        <>

            {worldsHint.trim() && <p className="oc-maker__hint">{worldsHint}</p>}

            <Dropdown
                id={id}
                value={value}
                onChange={next => setValue(fieldKey, next)}
                options={[
                    ...worldOptions.map(world => ({ value: world.name, label: world.name })),
                    { value: OTHER, label: "Other" }
                ]}
            />

            {
                value === OTHER && (

                    <div className="oc-maker__field oc-maker__field--nested">

                        <input
                            className="oc-maker__input"
                            type="text"
                            placeholder="Name of the world"
                            aria-label="Name of the world"
                            value={values[`${fieldKey}:name`] ?? ""}
                            onChange={event => setValue(`${fieldKey}:name`, event.target.value)}
                        />

                        <textarea
                            className="oc-maker__input oc-maker__input--area"
                            rows={3}
                            placeholder="A short description of the world"
                            aria-label="Description of the world"
                            value={values[`${fieldKey}:desc`] ?? ""}
                            onChange={event => setValue(`${fieldKey}:desc`, event.target.value)}
                        />

                    </div>

                )
            }

        </>

    );

}


// Buscar un Pokémon de la lista, como el buscador del panel: se escribe, salen
// los que coinciden y al elegir uno queda como una pastilla con su ×.
function SpeciesSearch({ id, value, onChange }){

    const [query, setQuery] = useState("");

    const needle = query.trim().toLowerCase();

    const matches = needle
        ? SPECIES.filter(option => option.label.toLowerCase().includes(needle))
            // Los que empiezan por lo escrito, primero.
            .sort((a, b) => a.label.toLowerCase().startsWith(needle) === b.label.toLowerCase().startsWith(needle)
                ? 0
                : a.label.toLowerCase().startsWith(needle) ? -1 : 1)
            .slice(0, 8)
        : [];

    function pick(label){
        onChange(label);
        setQuery("");
    }


    if(value){

        const image = SPECIES.find(option => option.label === value)?.image;

        return (
            <div className="oc-species">
                <span className="oc-species__chip">
                    {image && <img src={asset(image)} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />}
                    {value}
                    <button type="button" aria-label={`Remove ${value}`} onClick={() => onChange("")}>×</button>
                </span>
            </div>
        );

    }


    return (

        <div className="oc-species">

            <input
                id={id}
                className="oc-maker__input"
                type="search"
                placeholder="Search…"
                autoComplete="off"
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                    if(event.key === "Enter" && matches[0]){
                        event.preventDefault();
                        pick(matches[0].label);
                    }
                }}
            />

            {
                matches.length > 0 && (
                    <ul className="oc-species__options">
                        {matches.map(option => (
                            <li key={option.label}>
                                <button type="button" onClick={() => pick(option.label)}>
                                    {option.image && <img src={asset(option.image)} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = "hidden"; }} />}
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )
            }

            {
                needle && matches.length === 0 && (
                    <p className="oc-maker__hint">No Pokémon matches “{query.trim()}”.</p>
                )
            }

        </div>

    );

}


// Un movimiento, con los mismos datos que en el panel: nombre, categoría, tipo,
// PP y la etiqueta de legendario. La descripción va debajo, en su caja.
function MoveFields({ label, fieldKey, values, setValue, legendary }){

    const field = name => ({
        value: values[`${fieldKey}:${name}`] ?? "",
        onChange: event => setValue(`${fieldKey}:${name}`, event.target.value)
    });

    return (

        <div className="oc-move">

            <input className="oc-maker__input oc-move__name" type="text" placeholder="Move name" aria-label={`${label}: name`} {...field("name")} />

            <div className="oc-move__row">

                <Dropdown
                    ariaLabel={`${label}: category`}
                    placeholder="Category"
                    value={values[`${fieldKey}:cat`] ?? ""}
                    onChange={next => setValue(`${fieldKey}:cat`, next)}
                    options={CATEGORIES}
                />

                <Dropdown
                    ariaLabel={`${label}: type`}
                    placeholder="Type"
                    value={values[`${fieldKey}:type`] ?? ""}
                    onChange={next => setValue(`${fieldKey}:type`, next)}
                    options={TYPE_OPTIONS}
                    renderOption={showType}
                />

                <input className="oc-maker__input" type="number" min={1} placeholder="PP" aria-label={`${label}: PP`} {...field("pp")} />

            </div>

            {/* Solo los tipos que lo tienen activado en el panel (los legendarios). */}
            {
                legendary && (
                    <label className="oc-move__flag">
                        <input
                            type="checkbox"
                            checked={Boolean(values[`${fieldKey}:legendary`])}
                            onChange={event => setValue(`${fieldKey}:legendary`, event.target.checked)}
                        />
                        <span className="character-flag character-flag--legendary">Legendary</span>
                    </label>
                )
            }

        </div>

    );

}
