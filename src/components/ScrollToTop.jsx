import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";


// Al cambiar de página, el navegador no mueve el scroll: es la misma página de
// verdad, solo cambia lo que React pinta dentro. Sin esto, si bajabas 1500px en
// la ficha de un país y pulsabas "Species", aterrizabas 1500px abajo en la
// página de especies.
//
// No pinta nada; va dentro del Layout solo para engancharse a la navegación.
export default function ScrollToTop(){

    const { pathname, hash } = useLocation();

    const navigationType = useNavigationType();


    // useLayoutEffect y no useEffect: así el salto ocurre antes de que el
    // navegador pinte, y no se ve un fotograma de la página nueva a media
    // altura.
    useLayoutEffect(() => {

        // Atrás y adelante se quedan como estaban: ahí el navegador restaura
        // solo la posición que tenías, y forzar el principio sería peor
        // (perderías el sitio cada vez que vuelves).
        if(navigationType === "POP"){
            return;
        }

        // Con ancla (#seccion) manda el ancla: se baja hasta ella en vez de al
        // principio. El hueco para que no quede tapada por la barra pegajosa lo
        // pone el scroll-margin-top de :target, en index.css.
        if(hash){

            const target = document.querySelector(hash);

            if(target){
                target.scrollIntoView();
                return;
            }

        }

        window.scrollTo(0, 0);

    }, [pathname, hash, navigationType]);


    return null;

}
