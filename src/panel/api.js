// Habla con el backend del panel. En producción es el Worker de Cloudflare
// (worker/), cuya dirección va en VITE_PANEL_API (.env.production); en
// `npm run dev` es el middleware de scripts/panel-dev-api.mjs, que lee y escribe
// los archivos del propio repo. Los dos entienden las mismas rutas.
export const API = import.meta.env.VITE_PANEL_API
    || (import.meta.env.DEV ? "/__panel" : "");

const KEY = "sw-panel-session";


export function loadSession(){

    try {
        return JSON.parse(localStorage.getItem(KEY));
    } catch {
        return null;
    }

}


export function saveSession(session){

    try {
        if(session){
            localStorage.setItem(KEY, JSON.stringify(session));
        } else {
            localStorage.removeItem(KEY);
        }
    } catch {
        // Sin almacenamiento (ventana privada): la sesión dura lo que la pestaña.
    }

}


export class ApiError extends Error {

    constructor(status, message){
        super(message);
        this.status = status;
    }

}


async function request(session, path, init = {}){

    const response = await fetch(API + path, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.token}` } : {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if(!response.ok){
        throw new ApiError(response.status, data.error ?? `Error ${response.status}`);
    }

    return data;

}


export function login(user, password){

    return request(null, "/login", {
        method: "POST",
        body: JSON.stringify({ user, password })
    });

}


export function getInvite(token){

    return request(null, `/invite?token=${encodeURIComponent(token)}`);

}


// Crea la cuenta (o le pone contraseña nueva) y devuelve ya la sesión.
export function acceptInvite(token, password){

    return request(null, "/invite", {
        method: "POST",
        body: JSON.stringify({ token, password })
    });

}


export function changePassword(session, current, password){

    return request(session, "/password", {
        method: "POST",
        body: JSON.stringify({ current, password })
    });

}


export function listAdmins(session){

    return request(session, "/admins");

}


export function createInvite(session, user){

    return request(session, "/admins/invite", {
        method: "POST",
        body: JSON.stringify({ user })
    });

}


export function removeAdmin(session, user){

    return request(session, `/admins/user/${encodeURIComponent(user)}`, { method: "DELETE" });

}


export function cancelInvite(session, token){

    return request(session, `/admins/invite/${token}`, { method: "DELETE" });

}


export function inviteLink(token){

    return `${window.location.origin}${import.meta.env.BASE_URL}panel?invite=${token}`;

}


export async function listFiles(session){

    return (await request(session, "/tree")).paths;

}


export async function readJson(session, path){

    const { content, sha } = await request(session, `/file?path=${encodeURIComponent(path)}`);

    return { data: JSON.parse(content), sha };

}


// Mismo formato que dejaba Sveltia (dos espacios y salto de línea al final),
// para que un guardado sin cambios no salga como diff.
export function writeJson(session, path, data, sha, message){

    return request(session, "/file", {
        method: "PUT",
        body: JSON.stringify({ path, content: JSON.stringify(data, null, 2) + "\n", sha, message })
    });

}


export async function uploadFile(session, path, file, message){

    const bytes = new Uint8Array(await file.arrayBuffer());

    let binary = "";

    for(let i = 0; i < bytes.length; i += 0x8000){
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    return request(session, "/file", {
        method: "PUT",
        body: JSON.stringify({ path, base64: btoa(binary), message })
    });

}


export function rawUrl(path){

    return `${API}/raw?path=${encodeURIComponent(path)}`;

}
