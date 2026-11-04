// Rutas de la Pokédex (ver src/lib/pokedex.js). Las comparten el Worker y el
// backend de `npm run dev` (scripts/panel-dev-api.mjs): cada uno pone dónde se
// guarda (`store`) y cómo se comprueba la sesión (`auth`).
//
//   GET    /dex                 pública: solo lo descubierto
//   GET    /dex/image/<id>      pública si la imagen está descubierta; si no, pide sesión
//   GET    /dex/all             todo, para el panel
//   PUT    /dex/entry/<id>      crea o guarda una entrada
//   DELETE /dex/entry/<id>      la borra, con su imagen
//   PUT    /dex/image/<id>      sube la imagen ({ base64, type })
//   DELETE /dex/image/<id>      quita la imagen
//
// `store` tiene: list() → entradas, get(id), put(entry), remove(id),
// getImage(id) → { bytes, type } | null, putImage(id, bytes, type),
// removeImage(id).
import { ID_PATTERN, IMAGE_TYPES, MAX_IMAGE_BYTES, cleanEntry, compareEntries, publicView } from "../../src/lib/pokedex.js";


export async function dexRoute(request, { store, auth }){

    const url = new URL(request.url);
    const { method } = request;
    const parts = url.pathname.split("/").filter(Boolean);

    if(parts[0] !== "dex"){
        return null;
    }

    const [, kind, id] = parts;

    if(method === "GET" && parts.length === 1){

        const entries = (await store.list()).map(publicView).filter(Boolean).sort(compareEntries);

        return reply({ entries }, 200, { "Cache-Control": "max-age=30" });

    }

    if(method === "GET" && kind === "image"){

        const entry = await store.get(checkId(id));

        // Una imagen aún oculta solo se la damos a un moderador (el panel la
        // pide con fetch y su sesión, no con un <img> suelto).
        const open = entry?.revealed.seen && entry.revealed.image;

        if(!open){
            await auth(request);
        }

        const image = entry?.image && await store.getImage(id);

        if(!image){
            throw fail(404, "No image");
        }

        return new Response(image.bytes, {
            headers: {
                "Content-Type": image.type,
                // La dirección lleva ?v=<versión>: una imagen nueva es otra dirección.
                "Cache-Control": open ? "public, max-age=86400" : "private, no-store"
            }
        });

    }

    const user = await auth(request);

    if(method === "GET" && kind === "all"){
        return reply({ entries: (await store.list()).sort(compareEntries) });
    }

    if(kind === "entry" && method === "PUT"){

        const body = await request.json();
        const stored = await store.get(checkId(id));

        // `updated` es la versión que el moderador abrió. Si otro guardó
        // después, no se pisa su trabajo.
        if(stored && body.updated !== stored.updated){
            throw fail(409, "Someone else changed this entry. Reload it and redo your edit.");
        }

        const entry = {
            ...cleanEntry(body),
            id,
            image: stored?.image ?? null,
            created: stored?.created ?? new Date().toISOString(),
            updated: new Date().toISOString(),
            by: user
        };

        await store.put(entry);

        return reply({ entry });

    }

    if(kind === "entry" && method === "DELETE"){

        await store.removeImage(checkId(id));
        await store.remove(id);

        return reply({ ok: true });

    }

    if(kind === "image" && method === "PUT"){

        const stored = await store.get(checkId(id));

        if(!stored){
            throw fail(404, "Save the entry before adding its picture.");
        }

        const { base64, type } = await request.json();

        if(!IMAGE_TYPES.includes(type)){
            throw fail(400, "Pictures can be PNG, JPEG, WebP, GIF or AVIF.");
        }

        const bytes = Uint8Array.from(atob(String(base64 ?? "")), char => char.charCodeAt(0));

        if(bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES){
            throw fail(400, "The picture must be under 2 MB.");
        }

        await store.putImage(id, bytes, type);

        const entry = { ...stored, image: { type, version: Date.now().toString(36) }, updated: new Date().toISOString(), by: user };

        await store.put(entry);

        return reply({ entry });

    }

    if(kind === "image" && method === "DELETE"){

        const stored = await store.get(checkId(id));

        if(!stored){
            throw fail(404, "Not found");
        }

        await store.removeImage(id);

        const entry = { ...stored, image: null, updated: new Date().toISOString(), by: user };

        await store.put(entry);

        return reply({ entry });

    }

    throw fail(404, "Not found");

}


// El almacén del Worker: el KV `PANEL`, junto a las cuentas. Cada entrada es
// una clave (`dex:<id>`) y cada imagen otra (`dex-image:<id>`, con su tipo en
// los metadatos).
export function kvStore(kv){

    return {

        async list(){

            const keys = [];
            let cursor;

            do {
                const page = await kv.list({ prefix: "dex:", cursor });
                keys.push(...page.keys);
                cursor = page.list_complete ? null : page.cursor;
            } while(cursor);

            const entries = await Promise.all(keys.map(key => kv.get(key.name, "json")));

            return entries.filter(Boolean);

        },

        get: id => kv.get(`dex:${id}`, "json"),

        put: entry => kv.put(`dex:${entry.id}`, JSON.stringify(entry)),

        remove: id => kv.delete(`dex:${id}`),

        async getImage(id){

            const { value, metadata } = await kv.getWithMetadata(`dex-image:${id}`, "arrayBuffer");

            return value ? { bytes: value, type: metadata?.type ?? "application/octet-stream" } : null;

        },

        putImage: (id, bytes, type) => kv.put(`dex-image:${id}`, bytes, { metadata: { type } }),

        removeImage: id => kv.delete(`dex-image:${id}`)

    };

}


function checkId(id){

    if(!ID_PATTERN.test(id ?? "")){
        throw fail(400, "Bad id");
    }

    return id;

}


function reply(data, status = 200, headers = {}){

    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...headers }
    });

}


function fail(status, message){

    return Object.assign(new Error(message), { status });

}
