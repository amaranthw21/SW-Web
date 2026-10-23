import { useEffect } from "react";
import asset from "./asset";


// Mientras se está en una ficha, el fondo de la página es el arte de su entrada
// y el color de acento (marco, título, infobox...) el suyo. Al salir —o al pasar
// a otra entrada— se restaura lo que hubiera antes, que no siempre es "nada":
// por eso se guardan los valores previos en vez de borrarlos a secas.
//
// Esto estaba copiado tal cual en las cinco fichas que lo hacen (dioses, items,
// especies, países y subfacciones). Lo único que cambiaba entre ellas era de
// dónde sale la imagen —unas la traen en `image` y otras en `background`—, así
// que el hook recibe los dos valores ya resueltos en lugar de la entrada entera.
export default function usePageAccent(background, accent){

    useEffect(() => {

        if(!background && !accent){
            return;
        }

        const body = document.body;
        const prevBg = body.style.getPropertyValue("--page-bg");
        const prevAccent = body.style.getPropertyValue("--accent");

        if(background){
            body.style.setProperty("--page-bg", `url(${asset(background)})`);
        }

        if(accent){
            body.style.setProperty("--accent", accent);
        }

        return () => {

            if(prevBg){
                body.style.setProperty("--page-bg", prevBg);
            } else {
                body.style.removeProperty("--page-bg");
            }

            if(prevAccent){
                body.style.setProperty("--accent", prevAccent);
            } else {
                body.style.removeProperty("--accent");
            }

        };

    }, [background, accent]);

}
