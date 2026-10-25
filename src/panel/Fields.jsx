import { useId, useMemo, useState } from "react";

import Paragraphs from "../components/Paragraphs";

import { uploadFile, rawUrl } from "./api";
import {
    bundledPaths, bundledData, defaultValue, emptyObject, entriesOf, fillTemplate,
    imagePath, isRequired, uploadTarget
} from "./schema";


// Un campo de config.yml convertido en formulario. `ctx` lleva lo que algunos
// widgets necesitan aparte de su valor: la sesión (para subir imágenes), dónde
// está la entrada y la configuración completa.
//
// Cubre los widgets que usa config.yml. Uno desconocido se edita como texto,
// para que al menos no se pierda.
export default function Field({ field, value, onChange, ctx }){

    const Widget = WIDGETS[field.widget] ?? StringWidget;
    const id = useId();

    // Una lista se pinta con su propio encabezado y botones; el resto, con su
    // etiqueta encima.
    if(field.widget === "list"){
        return <Widget field={field} value={value} onChange={onChange} ctx={ctx} />;
    }

    return (

        <div className="panel-field">

            <label className="panel-field__label" htmlFor={id}>
                {field.label}
                {isRequired(field) && field.widget !== "boolean" && <span className="panel-field__req"> *</span>}
            </label>

            <Widget id={id} field={field} value={value} onChange={onChange} ctx={ctx} />

            {field.hint && <p className="panel-field__hint">{field.hint}</p>}

        </div>

    );

}


export function Fields({ fields, value, onChange, ctx }){

    // `parent` es el objeto entero al que pertenecen estos campos: el encuadre
    // necesita ver la imagen y el zoom, que son campos hermanos suyos.
    const inner = { ...ctx, parent: value };

    return fields.map(field => (
        <Field
            key={field.name}
            field={field}
            value={value?.[field.name]}
            onChange={next => onChange({ ...value, [field.name]: next })}
            ctx={inner}
        />
    ));

}


function StringWidget({ id, value, onChange }){

    return (
        <input
            id={id}
            className="panel-input"
            type="text"
            value={value ?? ""}
            onChange={event => onChange(event.target.value)}
        />
    );

}


function TextWidget({ id, value, onChange }){

    return (
        <textarea
            id={id}
            className="panel-input panel-input--area"
            rows={4}
            value={value ?? ""}
            onChange={event => onChange(event.target.value)}
        />
    );

}


// El sitio solo pinta cuatro cosas (ver components/Paragraphs.jsx), así que en
// vez de un editor visual hay una caja de texto con una vista previa al lado
// hecha con el mismo componente que usa la web: lo que se ve es lo que saldrá.
function RichTextWidget({ id, value, onChange }){

    const [preview, setPreview] = useState(false);

    return (

        <div className="panel-rich">

            <div className="panel-rich__tabs">
                <button type="button" className={preview ? "" : "is-active"} onClick={() => setPreview(false)}>Write</button>
                <button type="button" className={preview ? "is-active" : ""} onClick={() => setPreview(true)}>Preview</button>
                <span className="panel-rich__help">**bold** · *italic* · [text](/link) · - list · blank line = new paragraph</span>
            </div>

            {preview
                ? <div className="panel-rich__preview"><Paragraphs text={value ?? ""} /></div>
                : <TextWidget id={id} value={value} onChange={onChange} />}

        </div>

    );

}


function NumberWidget({ id, field, value, onChange }){

    return (
        <input
            id={id}
            className="panel-input panel-input--short"
            type="number"
            min={field.min}
            max={field.max}
            step={field.value_type === "int" ? 1 : "any"}
            value={value ?? ""}
            onChange={event => {
                const text = event.target.value;
                if(text === ""){
                    onChange(null);
                } else {
                    onChange(field.value_type === "int" ? parseInt(text, 10) : Number(text));
                }
            }}
        />
    );

}


function BooleanWidget({ id, value, onChange }){

    return (
        <label className="panel-switch">
            <input id={id} type="checkbox" checked={!!value} onChange={event => onChange(event.target.checked)} />
            <span>{value ? "Yes" : "No"}</span>
        </label>
    );

}


function SelectWidget({ id, field, value, onChange }){

    const options = field.options.map(option =>
        typeof option === "object" ? option : { label: option, value: option }
    );

    return (
        <select id={id} className="panel-input" value={value ?? ""} onChange={event => onChange(event.target.value)}>
            {(!isRequired(field) || !value) && <option value="">—</option>}
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            {/* Un valor que ya no está en la lista se conserva en vez de borrarse. */}
            {value && !options.some(option => option.value === value) && <option value={value}>{value}</option>}
        </select>
    );

}


function ColorWidget({ id, value, onChange }){

    return (
        <div className="panel-row">
            <input type="color" className="panel-color" value={value || "#d4a537"} onChange={event => onChange(event.target.value)} />
            <input id={id} className="panel-input panel-input--short" type="text" placeholder="Empty = site gold" value={value ?? ""} onChange={event => onChange(event.target.value)} />
            {value && <button type="button" className="panel-btn panel-btn--ghost" onClick={() => onChange("")}>Clear</button>}
        </div>
    );

}


function ImageWidget({ id, value, onChange, ctx }){

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const path = imagePath(value, ctx.entryPath);
    const src = path ? rawUrl(path) : value;

    // Las islas guardan sus imágenes en su propia carpeta, que depende del nombre
    // de la isla: hasta que no se guarda la primera vez no se sabe cuál es.
    const relative = (ctx.collection?.media_folder ?? ctx.config.media_folder) === "";
    const blocked = relative && !ctx.saved;

    async function upload(file){

        setBusy(true);
        setError("");

        try {

            let target = uploadTarget(ctx.config, ctx.collection, ctx.entryPath, file.name);

            // No se pisa una imagen que ya existe: se le añade un número.
            for(let n = 2; ctx.paths.includes(target.path); n++){
                const dot = file.name.lastIndexOf(".");
                target = uploadTarget(ctx.config, ctx.collection, ctx.entryPath, `${file.name.slice(0, dot)}-${n}${file.name.slice(dot)}`);
            }

            await uploadFile(ctx.session, target.path, file, `Upload ${target.path.split("/").pop()}`);

            ctx.addPath(target.path);
            onChange(target.value);

        } catch(err){

            setError(err.message);

        } finally {

            setBusy(false);

        }

    }

    return (

        <div className="panel-image">

            <div className="panel-image__thumb">
                {value ? <img src={src} alt="" /> : <span>No image</span>}
            </div>

            <div className="panel-image__side">

                <input id={id} className="panel-input" type="text" value={value ?? ""} placeholder="File name or path" onChange={event => onChange(event.target.value)} />

                <div className="panel-row">
                    <label className={`panel-btn ${blocked || busy ? "is-disabled" : ""}`}>
                        {busy ? "Uploading…" : "Upload…"}
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={blocked || busy}
                            onChange={event => event.target.files[0] && upload(event.target.files[0])}
                        />
                    </label>
                    {value && <button type="button" className="panel-btn panel-btn--ghost" onClick={() => onChange("")}>Remove</button>}
                </div>

                {blocked && <p className="panel-field__hint">Save the entry once to be able to upload pictures.</p>}
                {error && <p className="panel-error">{error}</p>}

            </div>

        </div>

    );

}


// El encuadre de una imagen en su tarjeta: se pulsa en la imagen el punto que
// tiene que quedar a la vista (la cara, normalmente) y al lado se ve la tarjeta
// tal como saldrá. Se guarda como object-position ("50% 20%").
//
// En config.yml: `image_field` es el campo hermano con la imagen y `zoom_field`
// (opcional) el del zoom, que la vista previa también aplica.
function FocusWidget({ field, value, onChange, ctx }){

    const image = ctx.parent?.[field.image_field ?? "image"];
    const zoom = Number(ctx.parent?.[field.zoom_field]) || 1;

    if(!image?.trim()){
        return <p className="panel-field__hint">Add a picture first; then click on it here to choose what the card shows.</p>;
    }

    const path = imagePath(image, ctx.entryPath);
    const src = path ? rawUrl(path) : image;
    const position = value?.trim() || "50% 50%";
    const [x, y] = position.split(/\s+/).map(part => parseFloat(part));

    function pick(event){
        const box = event.currentTarget.getBoundingClientRect();
        const px = Math.round(((event.clientX - box.left) / box.width) * 100);
        const py = Math.round(((event.clientY - box.top) / box.height) * 100);
        onChange(`${Math.min(100, Math.max(0, px))}% ${Math.min(100, Math.max(0, py))}%`);
    }

    return (

        <div className="panel-focus">

            <div className="panel-focus__pick">
                <button type="button" className="panel-focus__image" onClick={pick} aria-label="Click the part of the picture the card should show">
                    <img src={src} alt="" />
                    <span className="panel-focus__marker" style={{ left: `${x}%`, top: `${y}%` }} />
                </button>
                <div className="panel-row">
                    <span className="panel-muted">{value?.trim() ? `Focus: ${position}` : "Centered (default)"}</span>
                    {value?.trim() && <button type="button" className="panel-btn panel-btn--ghost" onClick={() => onChange("")}>Center</button>}
                </div>
            </div>

            {/* Los dos sitios donde sale: el círculo de la página de personajes
                (con zoom) y la miniatura del carrusel de la isla (sin él). */}
            <div className="panel-focus__preview">
                <span className="panel-muted">Characters page</span>
                <div className="panel-focus__circle">
                    <img
                        src={src}
                        alt=""
                        style={{ objectPosition: position, transform: zoom !== 1 ? `scale(${zoom})` : undefined, transformOrigin: position }}
                    />
                </div>
                <span className="panel-muted">Island carousel</span>
                <div className="panel-focus__thumb">
                    <img src={src} alt="" style={{ objectPosition: position }} />
                </div>
            </div>

        </div>

    );

}


// Elige entradas de otra colección (las islas eligen sus legendarios entre los
// Pokémon). Las opciones salen del contenido del último build.
function RelationWidget({ id, field, value, onChange, ctx }){

    const [query, setQuery] = useState("");

    const options = useMemo(() => {

        const target = ctx.config.collections.find(collection => collection.name === field.collection);
        const display = field.display_fields?.[0] ?? `{{${target.identifier_field ?? "title"}}}`;

        return entriesOf(target, bundledPaths).map(entry => {
            const data = bundledData(entry.path);
            return {
                value: field.value_field === "{{slug}}" ? entry.slug : data?.[field.value_field],
                label: fillTemplate(display, data)
            };
        });

    }, [ctx.config, field]);

    const selected = field.multiple ? (value ?? []) : (value ? [value] : []);
    const labelOf = id => options.find(option => option.value === id)?.label ?? id;

    const matches = query.trim()
        ? options
            .filter(option => !selected.includes(option.value) && option.label.toLowerCase().includes(query.trim().toLowerCase()))
            .slice(0, 8)
        : [];

    function add(id){
        onChange(field.multiple ? [...selected, id] : id);
        setQuery("");
    }

    function remove(id){
        onChange(field.multiple ? selected.filter(item => item !== id) : "");
    }

    return (

        <div className="panel-relation">

            {selected.length > 0 && (
                <div className="panel-chips">
                    {selected.map(id => (
                        <span key={id} className="panel-chip">
                            {labelOf(id)}
                            <button type="button" aria-label={`Remove ${labelOf(id)}`} onClick={() => remove(id)}>×</button>
                        </span>
                    ))}
                </div>
            )}

            {(field.multiple || selected.length === 0) && (
                <input id={id} className="panel-input" type="search" placeholder="Search…" value={query} onChange={event => setQuery(event.target.value)} />
            )}

            {matches.length > 0 && (
                <ul className="panel-relation__options">
                    {matches.map(option => (
                        <li key={option.value}>
                            <button type="button" onClick={() => add(option.value)}>{option.label}</button>
                        </li>
                    ))}
                </ul>
            )}

        </div>

    );

}


// Tres formas, como en config.yml: con `fields` es una lista de objetos, con
// `field` una lista de valores sueltos (p. ej. lugares) y sin nada, de textos.
function ListWidget({ field, value, onChange, ctx }){

    const items = Array.isArray(value) ? value : [];
    const single = field.field ?? (field.fields ? null : { name: "value", label: field.label_singular ?? "Item", widget: "string" });

    // Las entradas no tienen id, así que se les da uno aquí para que al
    // moverlas no se mezclen cuáles están abiertas.
    const [ids, setIds] = useState(() => items.map(() => crypto.randomUUID()));
    const [open, setOpen] = useState(() => new Set());

    if(ids.length !== items.length){
        setIds(items.map((_, index) => ids[index] ?? crypto.randomUUID()));
    }

    function update(next, nextIds){
        setIds(nextIds);
        onChange(next);
    }

    function add(){
        const id = crypto.randomUUID();
        setOpen(new Set(open).add(id));
        update([...items, single ? defaultValue(single) : emptyObject(field.fields)], [...ids, id]);
    }

    function move(index, delta){
        const next = [...items];
        const nextIds = [...ids];
        [next[index], next[index + delta]] = [next[index + delta], next[index]];
        [nextIds[index], nextIds[index + delta]] = [nextIds[index + delta], nextIds[index]];
        update(next, nextIds);
    }

    function remove(index){
        update(items.filter((_, i) => i !== index), ids.filter((_, i) => i !== index));
    }

    function toggle(id){
        const next = new Set(open);
        next.has(id) ? next.delete(id) : next.add(id);
        setOpen(next);
    }

    const singular = field.label_singular ?? "item";

    return (

        <fieldset className="panel-list">

            <legend className="panel-field__label">{field.label} <span className="panel-count">{items.length}</span></legend>

            {field.hint && <p className="panel-field__hint">{field.hint}</p>}

            {items.map((item, index) => {

                const id = ids[index];

                const controls = (
                    <span className="panel-list__controls">
                        <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">↑</button>
                        <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down">↓</button>
                        <button type="button" onClick={() => remove(index)} aria-label="Remove">✕</button>
                    </span>
                );

                const change = next => onChange(items.map((old, i) => i === index ? next : old));

                if(single){
                    const Single = WIDGETS[single.widget] ?? StringWidget;
                    return (
                        <div key={id} className="panel-list__row">
                            <div className="panel-list__grow">
                                <Single field={single} value={item} onChange={change} ctx={ctx} />
                            </div>
                            {controls}
                        </div>
                    );
                }

                const title = (field.summary ? fillTemplate(field.summary, item) : item?.[field.fields[0].name]) || `New ${singular.toLowerCase()}`;

                return (
                    <div key={id} className={`panel-list__item ${open.has(id) ? "is-open" : ""}`}>
                        <div className="panel-list__head">
                            <button type="button" className="panel-list__toggle" onClick={() => toggle(id)}>
                                <span className="panel-list__caret">{open.has(id) ? "▾" : "▸"}</span> {title}
                            </button>
                            {controls}
                        </div>
                        {open.has(id) && (
                            <div className="panel-list__body">
                                <Fields fields={field.fields} value={item} onChange={change} ctx={ctx} />
                            </div>
                        )}
                    </div>
                );

            })}

            <button type="button" className="panel-btn panel-btn--ghost" onClick={add}>+ Add {singular.toLowerCase()}</button>

        </fieldset>

    );

}


const WIDGETS = {
    string: StringWidget,
    text: TextWidget,
    richtext: RichTextWidget,
    markdown: RichTextWidget,
    number: NumberWidget,
    boolean: BooleanWidget,
    select: SelectWidget,
    color: ColorWidget,
    image: ImageWidget,
    relation: RelationWidget,
    focus: FocusWidget,
    list: ListWidget
};
