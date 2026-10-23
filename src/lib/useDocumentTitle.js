import { useEffect } from "react";


const SITE = "SW-Web";


// Pone el título de la pestaña. Hasta ahora todas las páginas se llamaban igual
// ("SW-Web"), así que con varias pestañas abiertas, en el historial o
// en un favorito no había manera de distinguirlas.
//
// Sin texto (o con texto vacío) deja solo el nombre del sitio: es lo que quiere
// la portada.
//
// Ojo al orden si alguna vez se anida: React ejecuta los efectos de los hijos
// ANTES que los del padre, así que el del padre es el que manda. Por eso las
// fichas pasan el mismo texto que le dan a <NotFound> cuando la entrada no
// existe; si pasaran nada, el padre borraría el título que puso el hijo.
export default function useDocumentTitle(title){

    useEffect(() => {

        document.title = title?.trim()
            ? `${title} · ${SITE}`
            : SITE;

    }, [title]);

}
