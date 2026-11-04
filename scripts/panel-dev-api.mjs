// Backend del panel para `npm run dev`: las mismas rutas que el Worker
// (worker/src/index.js), pero leyendo y escribiendo los archivos del repo en
// este ordenador en vez de hacer commits: se edita en local y luego se hace el
// commit a mano.
//
// Entra cualquier nombre con la contraseña "dev", como dueña. Las invitaciones
// y las cuentas que se crean con ellas se guardan en memoria y se pierden al
// parar el servidor: están para probar el flujo, no para usarse. Solo existe en
// el servidor de desarrollo (apply: "serve"); el build no lo incluye.
import { readFile, writeFile, readdir, mkdir, rm, rmdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { randomBytes } from "node:crypto";

import { dexRoute } from "../worker/src/dex.js";

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


function checkPath(path){

    const ext = path?.split(".").pop().toLowerCase();

    if(!path || path.includes("..") || !ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix)) || !TYPES[ext]){
        throw Object.assign(new Error("Path not allowed"), { status: 400 });
    }

    return path;

}


async function walk(root, dir){

    const entries = await readdir(join(root, dir), { withFileTypes: true });

    const nested = await Promise.all(entries.map(entry => {
        const path = `${dir}/${entry.name}`;
        return entry.isDirectory() ? walk(root, path) : [path];
    }));

    return nested.flat();

}


async function rawBody(req){

    const chunks = [];

    for await (const chunk of req){
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);

}


async function body(req){

    return JSON.parse((await rawBody(req)).toString("utf8"));

}


// La Pokédex en local: en archivos de .dev-pokedex/ (fuera de git) en vez del
// KV del Worker. Las rutas son las mismas, las de worker/src/dex.js.
function fileStore(dir){

    const index = join(dir, "entries.json");
    const image = id => join(dir, "images", id);

    const read = async () => JSON.parse(await readFile(index, "utf8").catch(() => "{}"));

    const write = async entries => {
        await mkdir(dir, { recursive: true });
        await writeFile(index, JSON.stringify(entries, null, 2));
    };

    return {
        list: async () => Object.values(await read()),
        get: async id => (await read())[id] ?? null,
        put: async entry => write({ ...await read(), [entry.id]: entry }),
        remove: async id => {
            const { [id]: _removed, ...rest } = await read();
            await write(rest);
        },
        getImage: async id => {
            try {
                return { bytes: await readFile(image(id)), type: await readFile(`${image(id)}.type`, "utf8") };
            } catch {
                return null;
            }
        },
        putImage: async (id, bytes, type) => {
            await mkdir(join(dir, "images"), { recursive: true });
            await writeFile(image(id), bytes);
            await writeFile(`${image(id)}.type`, type);
        },
        removeImage: async id => {
            await rm(image(id), { force: true });
            await rm(`${image(id)}.type`, { force: true });
        }
    };

}


function devAuth(request){

    const user = request.headers.get("authorization")?.replace(/^Bearer local\./, "");

    if(!user || user.startsWith("Bearer")){
        throw Object.assign(new Error("Not signed in"), { status: 401 });
    }

    return user;

}


// Cuentas e invitaciones de prueba. En local la contraseña se guarda tal cual:
// es memoria del servidor de desarrollo y desaparece al pararlo.
const users = new Map();
const invites = new Map();

const fail = (status, message) => Object.assign(new Error(message), { status });


function session(user){

    return { token: `local.${user}`, user, owner: !users.has(user), review: false };

}


function checkPassword(password){

    if(typeof password !== "string" || password.length < 10){
        throw fail(400, "The password needs at least 10 characters");
    }

}


function send(res, status, data){

    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));

}


export default function panelDevApi(){

    let root;

    return {

        name: "panel-dev-api",
        apply: "serve",

        configResolved(config){
            root = config.root;
        },

        configureServer(server){

            server.middlewares.use("/__panel", async (req, res) => {

                const url = new URL(req.url, "http://localhost");

                try {

                    if(req.method === "POST" && url.pathname === "/login"){
                        const { user, password } = await body(req);
                        const name = String(user ?? "").trim().toLowerCase();
                        const ok = users.has(name) ? users.get(name) === password : password === "dev";
                        if(!name || !ok){
                            return send(res, 401, { error: "Local mode: use any name and the password \"dev\"" });
                        }
                        return send(res, 200, session(name));
                    }

                    if(url.pathname === "/invite"){
                        const data = req.method === "POST" ? await body(req) : { token: url.searchParams.get("token") };
                        const invite = invites.get(data.token);
                        if(!invite){
                            throw fail(404, "This invitation doesn't exist, was already used or expired. Ask for a new one.");
                        }
                        if(req.method === "GET"){
                            return send(res, 200, { user: invite.user, by: invite.by, reset: users.has(invite.user) });
                        }
                        checkPassword(data.password);
                        invites.delete(data.token);
                        users.set(invite.user, data.password);
                        return send(res, 200, session(invite.user));
                    }

                    if(url.pathname.startsWith("/dex")){
                        const request = new Request(url, {
                            method: req.method,
                            headers: Object.entries(req.headers).filter(([, value]) => typeof value === "string"),
                            body: ["GET", "HEAD"].includes(req.method) ? undefined : await rawBody(req)
                        });
                        const response = await dexRoute(request, { store: fileStore(join(root, ".dev-pokedex")), auth: devAuth });
                        res.statusCode = response.status;
                        response.headers.forEach((value, key) => res.setHeader(key, value));
                        return res.end(Buffer.from(await response.arrayBuffer()));
                    }

                    if(req.method === "GET" && url.pathname === "/raw"){
                        const path = checkPath(url.searchParams.get("path"));
                        res.setHeader("Content-Type", TYPES[path.split(".").pop().toLowerCase()]);
                        return res.end(await readFile(join(root, path)));
                    }

                    const user = req.headers.authorization?.replace(/^Bearer local\./, "");

                    if(!user){
                        return send(res, 401, { error: "Not signed in" });
                    }

                    if(req.method === "POST" && url.pathname === "/password"){
                        const { current, password } = await body(req);
                        if(current !== (users.get(user) ?? "dev")){
                            throw fail(400, "The current password isn't right");
                        }
                        checkPassword(password);
                        users.set(user, password);
                        return send(res, 200, session(user));
                    }

                    if(url.pathname.startsWith("/admins")){

                        if(users.has(user)){
                            throw fail(403, "Only the site owners can manage admins");
                        }

                        if(req.method === "GET"){
                            return send(res, 200, {
                                admins: [{ user, owner: true }, ...[...users.keys()].map(name => ({ user: name, owner: false, by: user }))],
                                invites: [...invites].map(([token, invite]) => ({ token, ...invite }))
                            });
                        }

                        if(req.method === "POST"){
                            const name = String((await body(req)).user ?? "").trim().toLowerCase();
                            if(!/^[a-z0-9][a-z0-9_.-]{1,31}$/.test(name)){
                                throw fail(400, "User names: 2 to 32 characters, lowercase letters, numbers, dots, dashes or underscores");
                            }
                            const token = randomBytes(24).toString("base64url");
                            const invite = { user: name, by: user, expires: Date.now() + 7 * 86400 * 1000 };
                            invites.set(token, invite);
                            return send(res, 200, { token, ...invite });
                        }

                        const [, , kind, id] = url.pathname.split("/");
                        if(kind === "user"){
                            users.delete(decodeURIComponent(id));
                        } else {
                            invites.delete(id);
                        }
                        return send(res, 200, { ok: true });

                    }

                    if(req.method === "GET" && url.pathname === "/tree"){
                        const paths = (await Promise.all(["src/content", "public"].map(dir => walk(root, dir))))
                            .flat()
                            .filter(path => !path.endsWith(".DS_Store"));
                        return send(res, 200, { paths });
                    }

                    if(req.method === "GET" && url.pathname === "/file"){
                        const path = checkPath(url.searchParams.get("path"));
                        return send(res, 200, { content: await readFile(join(root, path), "utf8"), sha: "local" });
                    }

                    if(req.method === "PUT" && url.pathname === "/file"){
                        const { path, content, base64 } = await body(req);
                        const target = join(root, checkPath(path));
                        await mkdir(dirname(target), { recursive: true });
                        await writeFile(target, base64 ? Buffer.from(base64, "base64") : content);
                        server.config.logger.info(`[panel] wrote ${relative(root, target)}`);
                        return send(res, 200, { sha: "local" });
                    }

                    if(req.method === "DELETE" && url.pathname === "/file"){
                        const { paths } = await body(req);
                        for(const path of paths ?? []){
                            await rm(join(root, checkPath(path)));
                            server.config.logger.info(`[panel] deleted ${path}`);
                        }
                        // La carpeta de una isla se queda vacía: fuera también.
                        await rmdir(dirname(join(root, paths[0]))).catch(() => {});
                        return send(res, 200, { ok: true });
                    }

                    send(res, 404, { error: "Not found" });

                } catch(error){

                    send(res, error.status ?? (error.code === "ENOENT" ? 404 : 500), { error: error.message });

                }

            });

        }

    };

}
