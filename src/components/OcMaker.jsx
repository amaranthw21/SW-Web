import { useEffect, useMemo, useState } from "react";
import CopyTemplate from "./CopyTemplate";
import { fillTemplate, parseTemplate } from "../lib/ocTemplate";


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
export default function OcMaker({ versions, storageKey }){

    const [state, setState] = useState(() => load(storageKey));

    useEffect(() => save(storageKey, state), [storageKey, state]);


    const current = versions.find(version => version.title === state.version) ?? versions[0];
    const values = state.values?.[current?.title] ?? {};
    const extras = state.extras ?? [];

    const tokens = useMemo(() => parseTemplate(current?.template), [current]);


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

                        const label = totals[token.label] > 1
                            ? `${token.label} #${seen[token.label]}`
                            : token.label;

                        const id = `oc-${token.key}`;
                        const nested = (token.indent?.length ?? 0) > 1;

                        return (

                            <div key={token.key} className={`oc-maker__field${nested ? " oc-maker__field--nested" : ""}`}>

                                <label htmlFor={id}>{label}</label>

                                {
                                    token.long && token.line !== null && (
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
                                    token.long
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
                    Anything else you want to add: family, friends, quirks… Each one goes at the end of the sheet.
                </p>

                {
                    extras.map((extra, i) => (

                        <div key={i} className="oc-maker__extra">

                            <div className="oc-maker__extra-head">

                                <input
                                    className="oc-maker__input"
                                    type="text"
                                    placeholder="Title, e.g. Family"
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


            <CopyTemplate title="Your finished sheet" text={fillTemplate(tokens, values, extras)} />

        </div>

    );

}
