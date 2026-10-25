// Lee src/panel/config.yml y saca de ahí las colecciones y sus campos. Así hay
// un solo sitio donde se definen los formularios: un campo nuevo añadido allí
// aparece en el panel.
import { parse } from "yaml";

import slug from "../lib/slug";

// Va dentro del bundle del panel (?raw lo trae como texto): no hay que pedirlo
// aparte ni publicarlo en public/.
import configText from "./config.yml?raw";


export async function loadConfig(){

    return parse(configText);

}


// El contenido tal como quedó en el último build. Solo se usa para los
// resúmenes de las listas y las opciones de los campos `relation`: leer los mil
// Pokémon uno a uno desde GitHub tardaría un minuto. Lo que se abre para editar
// se pide siempre fresco.
const bundled = Object.fromEntries(
    Object.entries(import.meta.glob("../content/**/*.json", { eager: true, import: "default" }))
        .map(([path, data]) => [path.replace("../", "src/"), data])
);


export const bundledPaths = Object.keys(bundled);


export function bundledData(path){

    return bundled[path];

}


function escape(text){

    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

}


// Las colecciones de carpeta guardan un archivo por entrada, en
// `<folder>/<path>.<extension>` (por defecto `path` es "{{slug}}"; las islas
// usan "{{slug}}/{{slug}}", una carpeta cada una).
function folderPattern(collection){

    const template = escape(collection.path ?? "{{slug}}").replaceAll("\\{\\{slug\\}\\}", "([^/]+)");

    return new RegExp(`^${escape(collection.folder)}/${template}\\.${collection.extension ?? "json"}$`);

}


export function entriesOf(collection, paths){

    if(collection.files){
        return collection.files.map(file => ({
            path: file.file,
            slug: file.name,
            label: file.label,
            fields: file.fields
        }));
    }

    const pattern = folderPattern(collection);

    return paths
        .map(path => path.match(pattern) && { path, slug: path.match(pattern)[1], fields: collection.fields })
        .filter(Boolean);

}


// Qué se borra con una entrada: su JSON y, si cada entrada tiene su carpeta
// (las islas), todo lo que hay en ella. El JSON va primero: el backend
// comprueba con él que nadie la cambió mientras tanto.
export function entryFiles(collection, path, paths){

    if(!(collection.path ?? "").includes("/")){
        return [path];
    }

    const folder = path.split("/").slice(0, -1).join("/") + "/";

    return [path, ...paths.filter(item => item !== path && item.startsWith(folder))];

}


export function newEntryPath(collection, data){

    const name = slug(String(data[collection.identifier_field ?? "title"] ?? ""));

    if(!name){
        return null;
    }

    return `${collection.folder}/${(collection.path ?? "{{slug}}").replaceAll("{{slug}}", name)}.${collection.extension ?? "json"}`;

}


// "{{fields.order}} · {{fields.name}}" o "{{name}} {{form}}": las dos formas
// que usa config.yml. Lo que falte se queda vacío.
export function fillTemplate(template, data){

    return template
        .replace(/\{\{\s*(?:fields\.)?([\w]+)\s*\}\}/g, (_, key) => data?.[key] ?? "")
        .replace(/\s+([·—→])\s*$/, "")
        .replace(/\s{2,}/g, " ")
        .trim();

}


export function summaryOf(collection, entry, data){

    if(entry.label){
        return entry.label;
    }

    if(!data){
        return entry.slug;
    }

    return collection.summary
        ? fillTemplate(collection.summary, data)
        : data[collection.identifier_field ?? "title"] ?? entry.slug;

}


export function isRequired(field){

    return field.required !== false;

}


// Valor inicial de un campo en una entrada nueva, con la misma forma que los
// JSON que ya existen: "" para textos, null para números, [] para listas.
export function defaultValue(field){

    if(field.default !== undefined){
        return field.default;
    }

    switch(field.widget){
        case "boolean": return false;
        case "number": return null;
        case "list": return [];
        case "object": return emptyObject(field.fields);
        case "relation": return field.multiple ? [] : "";
        default: return "";
    }

}


export function emptyObject(fields = []){

    return Object.fromEntries(fields.map(field => [field.name, defaultValue(field)]));

}


// Lo que falta por rellenar, como lista de etiquetas ("Territories › Name").
export function missingFields(fields, data, prefix = ""){

    return fields.flatMap(field => {

        const value = data?.[field.name];
        const label = prefix + field.label;

        if(field.widget === "list" && field.fields && Array.isArray(value)){
            return value.flatMap((item, index) =>
                missingFields(field.fields, item, `${label} ${index + 1} › `)
            );
        }

        if(field.widget === "boolean" || !isRequired(field)){
            return [];
        }

        const empty = value === undefined || value === null || value === ""
            || (Array.isArray(value) && value.length === 0);

        return empty ? [label] : [];

    });

}


// ───────────────────────── Imágenes ─────────────────────────

function dirname(path){

    return path.split("/").slice(0, -1).join("/");

}


// Dónde vive el archivo de una imagen guardada en un campo. Hay dos formas en
// el contenido: una ruta desde la raíz ("/items/x.webp", que está en public/) y
// solo el nombre ("Zero-bg.webp"), que es un archivo al lado del JSON (islas).
export function imagePath(value, entryPath){

    if(!value || /^(https?:)?\/\//.test(value) || value.startsWith("data:")){
        return null;
    }

    if(value.startsWith("/")){
        return `public${value}`;
    }

    return `${dirname(entryPath)}/${value}`;

}


// Dónde se sube una imagen nueva y qué se escribe en el campo. Sigue
// media_folder y public_folder de la colección (o los globales): "" significa
// "en la carpeta de la entrada".
export function uploadTarget(config, collection, entryPath, fileName){

    const media = collection?.media_folder ?? config.media_folder ?? "public";
    const publicFolder = collection?.public_folder ?? config.public_folder ?? "/";

    const dot = fileName.lastIndexOf(".");
    const name = `${slug(fileName.slice(0, dot))}${fileName.slice(dot).toLowerCase()}`;

    if(media === ""){
        return { path: `${dirname(entryPath)}/${name}`, value: name };
    }

    return {
        path: `${media.replace(/^\//, "").replace(/\/$/, "")}/${name}`,
        value: `${publicFolder.replace(/\/$/, "")}/${name}`
    };

}
