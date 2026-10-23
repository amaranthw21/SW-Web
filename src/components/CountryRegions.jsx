import { useState } from "react";
import Paragraphs from "./Paragraphs";
import asset from "../lib/asset";


// Estado de un personaje de facción: si un jugador ya lo ha pedido o lo lleva.
// "available" (o vacío) no pinta nada, para no llenar el carrusel de iconos;
// solo se marcan los que ya no están libres. Las zonas de los países no tienen
// este campo, así que nunca llevan icono.
const STATUSES = {
    reserved: { label: "Reserved", icon: "clock" },
    taken:    { label: "In use",   icon: "check" }
};

function StatusIcon({ icon }){

    if(icon === "check"){
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7.5V12l3 2" />
        </svg>
    );

}


// Una zona del carrusel: imagen + nombre. Solo es pulsable si tiene
// descripción; si no, no hay nada que desplegar y se pinta como una tarjeta
// normal (así no se ofrece un clic que no hace nada).
//
// `fallbackImage` (opcional) se usa cuando la zona no tiene imagen o la suya no
// carga; los personajes de las facciones lo usan para su silueta genérica.
function Location({ location, isOpen, onToggle, fallbackImage }){

    const canExpand = Boolean(location.description?.trim());

    const image = location.image?.trim() || fallbackImage;

    const status = STATUSES[location.status];
    const player = location.player?.trim();

    // "In use · Played by X": sale al pasar el ratón y lo lee el lector de
    // pantalla, también en las tarjetas sin descripción que no se abren.
    const statusText = status && [status.label, player && `Played by ${player}`]
        .filter(Boolean)
        .join(" · ");

    const inner = (

        <>
            <span className="region-loc__frame">
            {
                image
                    ? <img
                          className="region-loc__img"
                          src={asset(image)}
                          loading="lazy"
                          alt={location.name ?? ""}
                          onError={e => {
                              const fallback = fallbackImage && asset(fallbackImage);
                              if(fallback && !e.currentTarget.src.endsWith(fallback)){
                                  e.currentTarget.src = fallback;
                              } else {
                                  e.currentTarget.style.visibility = "hidden";
                              }
                          }}
                      />
                    : <span className="region-loc__img region-loc__img--empty" />
            }

            {
                status && (
                    <span
                        className={`region-loc__status region-loc__status--${location.status}`}
                        role="img"
                        aria-label={statusText}
                    >
                        <StatusIcon icon={status.icon} />
                    </span>
                )
            }
            </span>

            <span className="region-loc__name">
                {location.name}
            </span>
        </>

    );


    if(!canExpand){

        return (
            <div className="region-loc" title={statusText || undefined}>
                {inner}
            </div>
        );

    }


    return (

        <button
            type="button"
            className={isOpen ? "region-loc region-loc--open" : "region-loc"}
            onClick={onToggle}
            aria-expanded={isOpen}
            title={statusText || undefined}
        >
            {inner}
        </button>

    );

}


function Region({ region, fallbackImage }){

    // Qué zona está desplegada. null = ninguna.
    const [openIndex, setOpenIndex] = useState(null);

    // Se descartan las zonas vacías del todo (fila a medio rellenar en el CMS).
    const locations = (region.locations ?? []).filter(
        location => location?.name?.trim() || location?.image?.trim()
    );

    const open = openIndex === null ? null : locations[openIndex];


    return (

        <div className="region">

            {
                region.title && (
                    <h3 className="region__title">
                        {region.title}
                    </h3>
                )
            }

            <Paragraphs text={region.description} className="region__desc" />

            {
                locations.length > 0 && (

                    <>
                        {/* El carrusel scrollea dentro de sí mismo, así que la
                            página nunca se desplaza en horizontal. */}
                        <div className="region__carousel">

                            {
                                locations.map((location, i) => (

                                    <Location
                                        key={i}
                                        location={location}
                                        isOpen={openIndex === i}
                                        fallbackImage={fallbackImage}
                                        onToggle={() => setOpenIndex(
                                            openIndex === i ? null : i
                                        )}
                                    />

                                ))
                            }

                        </div>

                        {
                            open && (

                                <div className="region__panel">

                                    <h4 className="region__panel-title">
                                        {open.name}
                                    </h4>

                                    {
                                        STATUSES[open.status] && (
                                            <p className={`region__panel-status region__panel-status--${open.status}`}>
                                                {STATUSES[open.status].label}
                                                {open.player?.trim() && ` · Played by ${open.player.trim()}`}
                                            </p>
                                        )
                                    }

                                    <Paragraphs
                                        text={open.description}
                                        className="region__panel-text"
                                    />

                                </div>

                            )
                        }
                    </>

                )
            }

        </div>

    );

}


// Una imagen de cabecera opcional (el mapa del país) y debajo los bloques con
// su carrusel. Las facciones reutilizan esto para su apartado de personajes:
// ContentBlock traduce grupos/personajes a regiones/zonas antes de llegar aquí.
export default function CountryRegions({ part, fallbackImage }){

    const regions = (part.regions ?? []).filter(
        region => region?.title?.trim() || (region?.locations ?? []).length > 0
    );


    return (

        <div className="regions">

            {
                part.map?.trim() && (

                    <figure className="block-figure regions__map">

                        <img
                            src={asset(part.map)}
                            loading="lazy"
                            alt={part.mapCaption ?? "Map"}
                            onError={e => { e.currentTarget.closest("figure").style.display = "none"; }}
                        />

                        {
                            part.mapCaption && (
                                <figcaption>
                                    {part.mapCaption}
                                </figcaption>
                            )
                        }

                    </figure>

                )
            }

            {
                regions.map((region, i) => (

                    <Region key={i} region={region} fallbackImage={fallbackImage} />

                ))
            }

        </div>

    );

}
