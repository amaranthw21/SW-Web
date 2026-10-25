import { useEffect, useRef } from "react";

import asset from "../lib/asset";


// Visor de imágenes a pantalla completa: la imagen entera, sin recortar, con su
// pie. Lo usan las fichas de personaje para el retrato y la galería.
//
// Es un <dialog> del navegador abierto con showModal(): ya trae cerrar con Esc,
// el fondo oscuro y el foco atrapado dentro, sin tener que programarlo. Se
// cierra también pulsando fuera de la imagen, y con varias imágenes se pasa de
// una a otra con las flechas (botones o teclado).
//
// `index` es la imagen abierta, o null si el visor está cerrado.
export default function Lightbox({ items, index, onClose, onChange }){

    const dialog = useRef(null);
    const open = index !== null && items[index];

    useEffect(() => {

        const element = dialog.current;

        if(open && !element.open){
            element.showModal();
        } else if(!open && element.open){
            element.close();
        }

    }, [open]);

    const many = items.length > 1;
    const step = delta => onChange((index + delta + items.length) % items.length);

    return (

        <dialog
            ref={dialog}
            className="lightbox"
            aria-label="Image viewer"
            onClose={onClose}
            onClick={event => {
                // El clic en el propio <dialog> (no en la imagen ni en un
                // botón) es el fondo: cierra.
                if(event.target === event.currentTarget){
                    onClose();
                }
            }}
            onKeyDown={event => {
                if(many && event.key === "ArrowRight") step(1);
                if(many && event.key === "ArrowLeft") step(-1);
            }}
        >

            {
                open && (
                    <>
                        <figure className="lightbox__figure">
                            <img src={asset(open.image)} alt={open.alt ?? ""} />
                            {(open.caption || many) && (
                                <figcaption>
                                    {open.caption}
                                    {many && <span className="lightbox__count">{index + 1} / {items.length}</span>}
                                </figcaption>
                            )}
                        </figure>

                        <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close">×</button>

                        {many && (
                            <>
                                <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => step(-1)} aria-label="Previous image">‹</button>
                                <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => step(1)} aria-label="Next image">›</button>
                            </>
                        )}
                    </>
                )
            }

        </dialog>

    );

}
