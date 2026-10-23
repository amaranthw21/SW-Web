// Prefija el base path del sitio (p. ej. "/SW-Web/" en GitHub Pages, "/" en
// desarrollo) a las rutas de assets públicos guardadas en el contenido, para
// que las imágenes funcionen en ambos entornos.
//
// Las rutas en los JSON se escriben desde la raíz ("/gods/chaos.png"); aquí se
// convierten en "/SW-Web/gods/chaos.png" cuando toca. Las URLs absolutas
// (http...) y los data: URI se dejan tal cual.
const BASE = import.meta.env.BASE_URL;

export default function asset(path) {

    if (!path) {
        return path;
    }

    if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) {
        return path;
    }

    // Las imágenes que empaqueta Vite (las de las islas) ya traen el base path
    // puesto; prefijarlo otra vez daría "/SW-Web/SW-Web/...".
    if (BASE !== "/" && path.startsWith(BASE)) {
        return path;
    }

    return BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, "");

}
