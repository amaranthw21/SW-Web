// Backend del panel propio (/panel): deja editar el contenido a quien no tiene
// cuenta de GitHub.
//
// Los admins entran con usuario y contraseña y el Worker hace los commits en su
// nombre con un token de GitHub que solo vive aquí. El navegador nunca ve ese
// token: lo único que recibe es una sesión firmada que caduca a las 12 horas.
//
// Las cuentas:
//   - Las dueñas van en el secreto ADMINS ({ "usuario": "pbkdf2$..." }). Se
//     crean una vez desde la terminal y son las únicas que pueden invitar.
//   - El resto entra por invitación: una dueña crea un enlace desde el panel, el
//     admin lo abre y elige su contraseña. Esas cuentas viven en el KV `PANEL`.
//   Nadie conoce la contraseña de otro: solo se guarda su hash.
//
// Solo toca src/content/ y public/, y solo JSON e imágenes. Aunque alguien se
// hiciera con una sesión, no podría cambiar el código ni los workflows.
//
// Configuración (ver worker/README.md):
//   GITHUB_TOKEN    secreto  token fine-grained: Contents y Pull requests (RW) en SW-Web
//   SESSION_SECRET  secreto  cadena larga al azar para firmar las sesiones
//   ADMINS          secreto  las dueñas (worker/hash-password.mjs)
//   PANEL           KV       cuentas e invitaciones
//   REPO, BASE_BRANCH, EDIT_BRANCH, ALLOWED_ORIGINS   en wrangler.toml
//
// Si EDIT_BRANCH es igual que BASE_BRANCH, se guarda directo y se publica en el
// siguiente deploy. Si es otra, los cambios se acumulan en esa rama con una pull
// request abierta, y alguien con GitHub la revisa y la fusiona.

const SESSION_HOURS = 12;
const INVITE_DAYS = 7;
const MIN_PASSWORD = 10;

// 100 000 es el máximo que admite PBKDF2 en Cloudflare Workers.
const ITERATIONS = 100000;

const USER_NAME = /^[a-z0-9][a-z0-9_.-]{1,31}$/;

const ALLOWED_PREFIXES = ["src/content/", "public/"];

const TYPES = {
    json: "application/json; charset=utf-8",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
    svg: "image/svg+xml"
};


export default {

    async fetch(request, env){

        const cors = corsHeaders(request, env);

        if(request.method === "OPTIONS"){
            return new Response(null, { status: 204, headers: cors });
        }

        try {

            const response = await route(request, env);

            for(const [key, value] of Object.entries(cors)){
                response.headers.set(key, value);
            }

            return response;

        } catch(error){

            const status = error.status ?? 500;

            return json({ error: error.message }, status, cors);

        }

    }

};


async function route(request, env){

    const url = new URL(request.url);
    const { method } = request;
    const { pathname } = url;

    if(method === "POST" && pathname === "/login"){
        return login(await request.json(), env);
    }

    // Abrir una invitación no pide sesión: es justo para quien aún no tiene.
    if(method === "GET" && pathname === "/invite"){
        return showInvite(url.searchParams.get("token"), env);
    }

    if(method === "POST" && pathname === "/invite"){
        return acceptInvite(await request.json(), env);
    }

    // Las imágenes van sin sesión: un <img> no puede mandar cabeceras, y el
    // repo es público de todas formas.
    if(method === "GET" && pathname === "/raw"){
        return raw(checkPath(url.searchParams.get("path")), env);
    }

    const user = await authenticate(request, env);

    if(method === "GET" && pathname === "/tree"){
        return tree(env);
    }

    if(method === "GET" && pathname === "/file"){
        return readFile(checkPath(url.searchParams.get("path")), env);
    }

    if(method === "PUT" && pathname === "/file"){
        return writeFile(await request.json(), user, env);
    }

    if(method === "DELETE" && pathname === "/file"){
        return deleteFiles(await request.json(), user, env);
    }

    if(method === "POST" && pathname === "/password"){
        return changePassword(await request.json(), user, env);
    }

    if(pathname.startsWith("/admins")){

        if(!isOwner(env, user)){
            throw httpError(403, "Only the site owners can manage admins");
        }

        if(method === "GET" && pathname === "/admins"){
            return listAdmins(env);
        }

        if(method === "POST" && pathname === "/admins/invite"){
            return createInvite(await request.json(), user, env);
        }

        const [, , kind, id] = pathname.split("/");

        if(method === "DELETE" && kind === "user"){
            return removeUser(decodeURIComponent(id), env);
        }

        if(method === "DELETE" && kind === "invite"){
            await env.PANEL.delete(`invite:${id}`);
            return json({ ok: true });
        }

    }

    throw httpError(404, "Not found");

}


// ───────────────────────── Cuentas ─────────────────────────

// Los nombres se comparan en minúsculas (el login convierte lo que se escribe),
// así que "Belen" en el secreto es la misma cuenta que "belen".
function owners(env){

    return Object.fromEntries(
        Object.entries(JSON.parse(env.ADMINS ?? "{}"))
            .map(([name, hash]) => [cleanName(name), String(hash).trim()])
    );

}


function isOwner(env, user){

    return Object.hasOwn(owners(env), user);

}


// El hash vigente de una cuenta. Si una dueña cambia su contraseña desde el
// panel, la nueva se guarda en el KV y manda sobre la del secreto.
async function currentHash(env, user){

    const stored = await env.PANEL.get(`user:${user}`, "json");

    return stored?.hash ?? (isOwner(env, user) ? owners(env)[user] : null);

}


function cleanName(name){

    return String(name ?? "").trim().toLowerCase();

}


function checkPassword(password){

    if(typeof password !== "string" || password.length < MIN_PASSWORD){
        throw httpError(400, `The password needs at least ${MIN_PASSWORD} characters`);
    }

}


async function login({ user, password }, env){

    const name = cleanName(user);
    const stored = USER_NAME.test(name) ? await currentHash(env, name) : null;

    // Se calcula el hash aunque el usuario no exista, para que tarde lo mismo y
    // no se pueda adivinar qué nombres son válidos por el tiempo de respuesta.
    const ok = await verifyPassword(password ?? "", stored ?? "pbkdf2$100000$AAAA$AAAA");

    if(!stored || !ok){
        throw httpError(401, "Wrong user or password");
    }

    return json(await sessionFor(name, stored, env));

}


async function sessionFor(user, hash, env){

    // `h` es un trozo del hash de la contraseña. Al cambiarla deja de coincidir
    // y todas las sesiones abiertas con la vieja se cierran solas.
    const payload = { u: user, h: hash.slice(-12), exp: Date.now() + SESSION_HOURS * 3600 * 1000 };
    const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));

    return {
        token: `${body}.${b64url(await sign(body, env))}`,
        user,
        owner: isOwner(env, user),
        review: env.EDIT_BRANCH !== env.BASE_BRANCH
    };

}


async function authenticate(request, env){

    const header = request.headers.get("Authorization") ?? "";
    const [body, signature] = header.replace(/^Bearer /, "").split(".");

    if(!body || !signature){
        throw httpError(401, "Not signed in");
    }

    const valid = await crypto.subtle.verify(
        "HMAC", await hmacKey(env), fromB64url(signature), new TextEncoder().encode(body)
    );

    const payload = valid && JSON.parse(new TextDecoder().decode(fromB64url(body)));
    const hash = payload && payload.exp > Date.now() && await currentHash(env, payload.u);

    // Quitar a alguien o cambiar su contraseña le cierra la sesión al momento,
    // sin esperar a que caduque.
    if(!hash || hash.slice(-12) !== payload.h){
        throw httpError(401, "Session expired");
    }

    return payload.u;

}


async function changePassword({ current, password }, user, env){

    if(!await verifyPassword(current ?? "", await currentHash(env, user))){
        throw httpError(400, "The current password isn't right");
    }

    checkPassword(password);

    const hash = await hashPassword(password);
    const old = await env.PANEL.getWithMetadata(`user:${user}`);

    await env.PANEL.put(`user:${user}`, JSON.stringify({ hash }), {
        metadata: old.metadata ?? { created: Date.now(), by: user }
    });

    // Sesión nueva: la de esta pestaña se cerraría con el cambio.
    return json(await sessionFor(user, hash, env));

}


// ───────────────────────── Invitaciones ─────────────────────────

async function createInvite({ user }, by, env){

    const name = cleanName(user);

    if(!USER_NAME.test(name)){
        throw httpError(400, "User names: 2 to 32 characters, lowercase letters, numbers, dots, dashes or underscores");
    }

    if(isOwner(env, name)){
        throw httpError(400, "That's an owner account. Owners change their password from the terminal or the Account page");
    }

    const token = b64url(crypto.getRandomValues(new Uint8Array(24)));
    const expires = Date.now() + INVITE_DAYS * 86400 * 1000;
    const metadata = { user: name, by, expires };

    // KV borra la invitación sola al caducar.
    await env.PANEL.put(`invite:${token}`, JSON.stringify(metadata), {
        expirationTtl: INVITE_DAYS * 86400,
        metadata
    });

    return json({ token, user: name, expires });

}


async function showInvite(token, env){

    const invite = token && await env.PANEL.get(`invite:${token}`, "json");

    if(!invite){
        throw httpError(404, "This invitation doesn't exist, was already used or expired. Ask for a new one.");
    }

    const exists = !!await env.PANEL.get(`user:${invite.user}`);

    return json({ user: invite.user, by: invite.by, reset: exists });

}


// Sirve para las dos cosas: crear la cuenta y, si ya existía, ponerle una
// contraseña nueva (es como se recupera una olvidada).
async function acceptInvite({ token, password }, env){

    const invite = token && await env.PANEL.get(`invite:${token}`, "json");

    if(!invite){
        throw httpError(404, "This invitation doesn't exist, was already used or expired. Ask for a new one.");
    }

    checkPassword(password);

    // Primero se gasta la invitación: el mismo enlace no vale dos veces.
    await env.PANEL.delete(`invite:${token}`);

    const hash = await hashPassword(password);
    const old = await env.PANEL.getWithMetadata(`user:${invite.user}`);

    await env.PANEL.put(`user:${invite.user}`, JSON.stringify({ hash }), {
        metadata: old.metadata ?? { created: Date.now(), by: invite.by }
    });

    return json(await sessionFor(invite.user, hash, env));

}


async function listAll(env, prefix){

    const keys = [];
    let cursor;

    do {
        const page = await env.PANEL.list({ prefix, cursor });
        keys.push(...page.keys);
        cursor = page.list_complete ? null : page.cursor;
    } while(cursor);

    return keys;

}


async function listAdmins(env){

    const users = (await listAll(env, "user:")).map(key => ({
        user: key.name.slice(5),
        created: key.metadata?.created,
        by: key.metadata?.by,
        owner: false
    }));

    const ownerList = Object.keys(owners(env))
        .map(user => ({ user, owner: true }));

    const invites = (await listAll(env, "invite:"))
        .map(key => ({ token: key.name.slice(7), ...key.metadata }))
        .filter(invite => invite.expires > Date.now());

    return json({
        admins: [...ownerList, ...users.filter(item => !isOwner(env, item.user))],
        invites
    });

}


async function removeUser(user, env){

    if(isOwner(env, user)){
        throw httpError(400, "Owners are removed from the ADMINS secret, in the terminal");
    }

    await env.PANEL.delete(`user:${user}`);

    // Y las invitaciones que tuviera pendientes, para que no pueda volver.
    for(const key of await listAll(env, "invite:")){
        if(key.metadata?.user === user){
            await env.PANEL.delete(key.name);
        }
    }

    return json({ ok: true });

}


// ───────────────────────── Contraseñas y firmas ─────────────────────────

async function hmacKey(env){

    return crypto.subtle.importKey(
        "raw", new TextEncoder().encode(env.SESSION_SECRET),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
    );

}


async function sign(body, env){

    return new Uint8Array(
        await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(body))
    );

}


async function pbkdf2(password, salt, iterations){

    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );

    return new Uint8Array(await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256
    ));

}


// Mismo formato que genera worker/hash-password.mjs: pbkdf2$iteraciones$sal$hash.
async function hashPassword(password){

    const salt = crypto.getRandomValues(new Uint8Array(16));

    return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;

}


async function verifyPassword(password, stored){

    if(!stored){
        return false;
    }

    const [, iterations, salt, hash] = stored.split("$");
    const bits = await pbkdf2(password, fromB64(salt), Number(iterations));
    const expected = fromB64(hash);

    if(bits.length !== expected.length){
        return false;
    }

    let diff = 0;

    for(let i = 0; i < bits.length; i++){
        diff |= bits[i] ^ expected[i];
    }

    return diff === 0;

}


// ───────────────────────── Contenido ─────────────────────────

function checkPath(path){

    const ext = path?.split(".").pop().toLowerCase();

    if(
        !path
        || path.includes("..")
        || !ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix))
        || !TYPES[ext]
    ){
        throw httpError(400, "Path not allowed");
    }

    return path;

}


async function tree(env){

    const ref = await readBranch(env);
    const data = await github(env, `/git/trees/${ref}?recursive=1`);

    const paths = data.tree
        .filter(entry => entry.type === "blob")
        .map(entry => entry.path)
        .filter(path => ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix)));

    return json({ paths });

}


async function readFile(path, env){

    const ref = await readBranch(env);
    const data = await github(env, `/contents/${encodePath(path)}?ref=${ref}`);

    return json({ content: new TextDecoder().decode(fromB64(data.content)), sha: data.sha });

}


async function raw(path, env){

    const ref = await readBranch(env);

    const response = await fetch(api(env, `/contents/${encodePath(path)}?ref=${ref}`), {
        headers: { ...githubHeaders(env), Accept: "application/vnd.github.raw" }
    });

    if(!response.ok){
        throw httpError(response.status, "Not found");
    }

    return new Response(response.body, {
        headers: {
            "Content-Type": TYPES[path.split(".").pop().toLowerCase()],
            "Cache-Control": "max-age=60"
        }
    });

}


// `content` es texto (los JSON) y `base64` son bytes (las imágenes): llega uno
// de los dos. `sha` es la versión que el admin abrió; si alguien la cambió
// mientras tanto, GitHub rechaza el commit en vez de pisar su trabajo.
async function writeFile({ path, content, base64, sha, message }, user, env){

    checkPath(path);

    const branch = await prepareEditBranch(env);

    const data = await github(env, `/contents/${encodePath(path)}`, {
        method: "PUT",
        body: JSON.stringify({
            message: `${message || `Update ${path}`} (panel: ${user})`,
            content: base64 ?? b64(new TextEncoder().encode(content)),
            sha: sha || undefined,
            branch,
            author: { name: user, email: `${user}@panel.sw-web` }
        })
    });

    if(branch !== env.BASE_BRANCH){
        await ensurePullRequest(env);
    }

    return json({ sha: data.content.sha });

}


// Borra una entrada: su JSON (el primero de `paths`) y, si vive en su propia
// carpeta, lo que tiene al lado (las imágenes de una isla). Va todo en un solo
// commit con la API de árboles de Git; con la de contenidos sería un commit por
// archivo. Con revisión, el borrado también espera en la pull request.
async function deleteFiles({ paths, sha, message }, user, env){

    if(!Array.isArray(paths) || paths.length === 0){
        throw httpError(400, "Nothing to delete");
    }

    paths.forEach(checkPath);

    const branch = await prepareEditBranch(env);

    // Si alguien cambió la entrada después de que este admin la abriera, no se
    // borra a ciegas: que la recargue y vea qué está borrando.
    const current = await github(env, `/contents/${encodePath(paths[0])}?ref=${branch}`);

    if(sha && current.sha !== sha){
        throw httpError(409, "Someone else changed this entry. Reload it before deleting.");
    }

    const ref = await github(env, `/git/ref/heads/${branch}`);
    const head = await github(env, `/git/commits/${ref.object.sha}`);

    const tree = await github(env, "/git/trees", {
        method: "POST",
        body: JSON.stringify({
            base_tree: head.tree.sha,
            tree: paths.map(path => ({ path, mode: "100644", type: "blob", sha: null }))
        })
    });

    const commit = await github(env, "/git/commits", {
        method: "POST",
        body: JSON.stringify({
            message: `${message || `Delete ${paths[0]}`} (panel: ${user})`,
            tree: tree.sha,
            parents: [head.sha],
            author: { name: user, email: `${user}@panel.sw-web` }
        })
    });

    // Sin force: si la rama avanzó mientras tanto, GitHub lo rechaza en vez de
    // tirar el commit de otro.
    await github(env, `/git/refs/heads/${branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha })
    });

    if(branch !== env.BASE_BRANCH){
        await ensurePullRequest(env);
    }

    return json({ ok: true });

}


// Con revisión, se lee de la rama de edición mientras tenga una pull request
// abierta: así el admin ve lo que ya guardó aunque aún no esté publicado.
async function readBranch(env){

    if(env.EDIT_BRANCH === env.BASE_BRANCH){
        return env.BASE_BRANCH;
    }

    return (await openPullRequest(env)) ? env.EDIT_BRANCH : env.BASE_BRANCH;

}


// Sin pull request abierta (la última ya se fusionó o se cerró), la rama de
// edición se vuelve a poner al día con la base antes de guardar. Si no, la
// siguiente tanda arrastraría cambios viejos o rechazados.
async function prepareEditBranch(env){

    if(env.EDIT_BRANCH === env.BASE_BRANCH || await openPullRequest(env)){
        return env.EDIT_BRANCH;
    }

    const base = await github(env, `/git/ref/heads/${env.BASE_BRANCH}`);
    const sha = base.object.sha;

    try {

        await github(env, `/git/refs/heads/${env.EDIT_BRANCH}`, {
            method: "PATCH",
            body: JSON.stringify({ sha, force: true })
        });

    } catch(error){

        if(error.status !== 422 && error.status !== 404){
            throw error;
        }

        await github(env, "/git/refs", {
            method: "POST",
            body: JSON.stringify({ ref: `refs/heads/${env.EDIT_BRANCH}`, sha })
        });

    }

    return env.EDIT_BRANCH;

}


async function openPullRequest(env){

    const owner = env.REPO.split("/")[0];
    const pulls = await github(env, `/pulls?state=open&head=${owner}:${env.EDIT_BRANCH}`);

    return pulls[0];

}


async function ensurePullRequest(env){

    if(await openPullRequest(env)){
        return;
    }

    await github(env, "/pulls", {
        method: "POST",
        body: JSON.stringify({
            title: "Changes from the editing panel",
            head: env.EDIT_BRANCH,
            base: env.BASE_BRANCH,
            body: "Edits saved from /panel. Each commit says which admin made it. Merge to publish them."
        })
    });

}


// ───────────────────────── GitHub ─────────────────────────

function api(env, path){

    return `https://api.github.com/repos/${env.REPO}${path}`;

}


function githubHeaders(env){

    return {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "sw-web-panel",
        "X-GitHub-Api-Version": "2022-11-28"
    };

}


async function github(env, path, init = {}){

    const response = await fetch(api(env, path), {
        ...init,
        headers: { ...githubHeaders(env), "Content-Type": "application/json" }
    });

    if(!response.ok){

        // 409 y 422 al guardar son casi siempre un sha viejo: otro admin
        // cambió el archivo después de que este lo abriera.
        const message = response.status === 409 || (init.method === "PUT" && response.status === 422)
            ? "Someone else changed this file. Reload it and redo your edit."
            : `GitHub: ${response.status}`;

        throw httpError(response.status, message);

    }

    return response.json();

}


function encodePath(path){

    return path.split("/").map(encodeURIComponent).join("/");

}


// ───────────────────────── Utilidades ─────────────────────────

function corsHeaders(request, env){

    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map(item => item.trim());

    // "http://localhost:*" vale para cualquier puerto: Vite salta al siguiente
    // libre si el 5173 está ocupado. La sesión va en una cabecera y no en una
    // cookie, así que abrir CORS a localhost no le da nada a otra web.
    const matches = allowed.some(item =>
        item.endsWith(":*") ? origin?.startsWith(item.slice(0, -1)) && /^\d+$/.test(origin.slice(item.length - 1)) : item === origin
    );

    if(!origin || !matches){
        return {};
    }

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Vary": "Origin"
    };

}


function json(data, status = 200, headers = {}){

    return new Response(JSON.stringify(data), {
        status,
        headers: { ...headers, "Content-Type": "application/json" }
    });

}


function httpError(status, message){

    return Object.assign(new Error(message), { status });

}


function b64(bytes){

    let binary = "";

    for(let i = 0; i < bytes.length; i += 0x8000){
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    return btoa(binary);

}


function fromB64(text){

    return Uint8Array.from(atob(text.replace(/\s/g, "")), char => char.charCodeAt(0));

}


function b64url(bytes){

    return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

}


function fromB64url(text){

    return fromB64(text.replace(/-/g, "+").replace(/_/g, "/"));

}
