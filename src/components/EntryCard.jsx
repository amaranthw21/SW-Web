import { useState } from "react";
import { Link } from "react-router-dom";
import asset from "../lib/asset";


// `link` es opcional: una sección de Lore puede no tener página todavía, y en
// ese caso la tarjeta se pinta igual pero sin ser un enlace, en vez de llevar a
// ninguna parte.
//
// `fallbackImage` (opcional) sustituye a la inicial magenta cuando no hay
// imagen o no carga; los NPCs lo usan para su silueta genérica.
export default function EntryCard({ name, subtitle, image, imagePosition, imageZoom, link, fallbackImage }) {

    // Si la imagen no existe / falla al cargar, pasamos a `fallbackImage` y,
    // si tampoco hay o también falla, al placeholder magenta.
    const [failed, setFailed] = useState([]);

    const candidates = [image?.trim(), fallbackImage].filter(
        src => src && !failed.includes(src)
    );

    const current = candidates[0];

    const isFallback = current === fallbackImage && current !== image?.trim();

    const showImage = Boolean(current);


    const classes = showImage ? "entry-card" : "entry-card entry-card--empty";

    const Tag = link ? Link : "div";


    return (

        <Tag
            {...(link ? { to: link } : {})}
            className={classes}
        >

            {
                showImage
                    ? <img
                          className="entry-card__img"
                          src={asset(current)}
                          loading="lazy"
                          alt={name}
                          onError={() => setFailed(prev => [...prev, current])}
                          // El encuadre y el zoom son de la imagen propia, no de la silueta.
                          style={isFallback ? undefined : {
                              objectPosition: imagePosition || "center",
                              transform: imageZoom ? `scale(${imageZoom})` : undefined,
                              transformOrigin: imagePosition || "center"
                          }}
                      />
                    : <span className="entry-card__placeholder">
                          {name.charAt(0)}
                      </span>
            }


            <div className="entry-card__body">

                <h3>
                    {name}
                </h3>

                {
                    subtitle && (
                        <p>
                            {subtitle}
                        </p>
                    )
                }

            </div>

        </Tag>

    );

}
