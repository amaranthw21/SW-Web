import Paragraphs from "./Paragraphs";
import CountryRegions from "./CountryRegions";
import asset from "../lib/asset";
import { CHARACTER_PLACEHOLDER } from "../lib/placeholders";


// El título de un apartado es opcional: es lo que convierte una parte en un
// apartado con nombre ("Innate Powers:") en vez de un párrafo suelto. Va en h3
// porque el bloque que lo contiene ya usa un h2.
//
// Está suelto, y no solo dentro de BlockText, porque en "el texto rodea la
// imagen" el título va por delante de la imagen y el texto por detrás.
function BlockTitle({ title }){

    if(!title?.trim()){

        return null;

    }


    return (

        <h3 className="block-part__title">
            {title}
        </h3>

    );

}


// Los párrafos de un bloque llevan siempre la misma clase.
function BlockText({ title, text }){

    return (

        <>

            <BlockTitle title={title} />

            <Paragraphs text={text} className="country-block__text" />

        </>

    );

}


// `fit` decide qué hacer cuando la caja no tiene la proporción de la imagen:
// "fill" (lo normal) la estira hasta la altura del texto y recorta por los
// lados; "whole" la deja entera con su proporción, centrada, y renuncia a
// igualar la altura. Lo segundo es para mapas y fotos de grupo, que un recorte
// destroza.
// Los tamaños admitidos se listan aquí y no se pega el valor en la clase a
// pelo: el desplegable del panel ya los limita, pero un JSON editado a mano no.
const SIZES = ["small", "medium", "large"];


// Qué parte de la imagen se conserva cuando hay que recortarla: un porcentaje
// por eje, como object-position. 0 es el borde izquierdo (o superior), 50 el
// centro y 100 el derecho (o inferior).
//
// Se eligió porcentaje en vez de una lista de anclajes porque los anclajes solo
// dan nueve puntos, y ajustar un personaje suele pedir algo intermedio. Lo que
// no sea un número se ignora y manda el centro: el panel lo limita, pero un
// JSON editado a mano no.
function percent(value){

    const number = Number(value);

    if(!Number.isFinite(number)){

        return 50;

    }

    return Math.min(100, Math.max(0, number));

}


function BlockImage({ image, caption, fit, size, positionX, positionY }){

    const x = percent(positionX);
    const y = percent(positionY);

    // Centrado es el comportamiento por defecto del CSS: no hace falta escribirlo.
    const position = x === 50 && y === 50
        ? undefined
        : { objectPosition: `${x}% ${y}%` };

    const classes = ["block-figure"];

    if(fit === "whole"){
        classes.push("block-figure--whole");
    }

    if(SIZES.includes(size)){
        classes.push(`block-figure--${size}`);
    }


    return (

        <figure className={classes.join(" ")}>

            {/*
              La imagen va envuelta porque dentro de un "texto + imagen" esa
              caja es la que se estira hasta la altura del texto: la figura
              entera no puede, que también lleva el pie.
            */}
            <span className="block-figure__media">

                <img
                    src={asset(image)}
                    loading="lazy"
                    alt={caption ?? ""}
                    style={position}
                    onError={e => { e.currentTarget.closest("figure").style.display = "none"; }}
                />

            </span>

            {
                caption && (
                    <figcaption>
                        {caption}
                    </figcaption>
                )
            }

        </figure>

    );

}


// Cada parte del bloque se pinta según su tipo. El tipo lo escribe el CMS en la
// clave `type` al elegir "Text", "Text + image" o "Image".
function BlockPart({ part }){

    if(part.type === "text"){

        return <BlockText title={part.title} text={part.text} />;

    }


    if(part.type === "image"){

        if(!part.image?.trim()){
            return null;
        }

        return (
            <BlockImage
                image={part.image}
                caption={part.caption}
                fit={part.fit}
                size={part.size}
                positionX={part.imagePositionX}
                positionY={part.imagePositionY}
            />
        );

    }


    if(part.type === "regions"){

        return <CountryRegions part={part} />;

    }


    // El último apartado de una facción es el equivalente del de regiones de un
    // país, pero con grupos de personajes en lugar de zonas con lugares. Se
    // pinta igual (carrusel + panel que se abre), así que se traduce la forma y
    // se reutiliza el mismo componente.
    if(part.type === "characters"){

        return (
            <CountryRegions
                part={{
                    map: part.image,
                    mapCaption: part.caption,
                    regions: (part.groups ?? []).map(group => ({
                        title: group.title,
                        description: group.description,
                        locations: group.characters
                    }))
                }}
                fallbackImage={CHARACTER_PLACEHOLDER}
            />
        );

    }


    if(part.type === "textImage"){

        // Sin imagen se comporta como una parte de solo texto, para que una
        // parte a medio rellenar no deje un hueco raro.
        if(!part.image?.trim()){
            return <BlockText title={part.title} text={part.text} />;
        }

        const side = part.imageSide === "left" ? "left" : "right";

        // "wrap": en vez de dos columnas, la imagen flota a un lado y el texto
        // la rodea —pega a su costado mientras haya imagen y sigue a ancho
        // completo por debajo—.
        //
        // El orden de los tres importa: un flotante solo aparta lo que viene
        // después de él, así que el título va delante (se queda arriba, a todo
        // lo ancho, con la imagen empezando por debajo) y los párrafos detrás,
        // que son los que tienen que rodearla.
        if(part.layout === "wrap"){

            return (

                <div className={`block-wrap block-wrap--${side}`}>

                    <BlockTitle title={part.title} />

                    <BlockImage
                        image={part.image}
                        caption={part.caption}
                        fit={part.fit}
                        positionX={part.imagePositionX}
                        positionY={part.imagePositionY}
                    />

                    <Paragraphs text={part.text} className="country-block__text" />

                </div>

            );

        }

        return (

            <div className={`block-split block-split--${side}`}>

                {/*
                  El título va dentro de la columna de texto, no encima de las
                  dos: así la imagen queda al lado del apartado completo, título
                  incluido.
                */}
                <div className="block-split__text">
                    <BlockText title={part.title} text={part.text} />
                </div>

                <BlockImage
                    image={part.image}
                    caption={part.caption}
                    fit={part.fit}
                    positionX={part.imagePositionX}
                    positionY={part.imagePositionY}
                />

            </div>

        );

    }


    return null;

}


// Un bloque de contenido: título con icono y una lista de partes. Lo usan tanto
// las fichas de país como las de energía.
export default function ContentBlock({ block }){

    const parts = block.parts ?? [];


    return (

        <section className="country-block" id={block.id}>

            <header className="block-title">

                {
                    block.icon
                        ? <img
                              className="block-title__icon"
                              src={asset(block.icon)}
                              alt=""
                              onError={e => { e.currentTarget.style.visibility = "hidden"; }}
                          />
                        : <span className="block-title__icon block-title__icon--empty" />
                }

                <h2 className="block-title__text">
                    {block.title}
                </h2>

            </header>

            {
                parts.map((part, i) => (

                    <BlockPart key={i} part={part} />

                ))
            }

        </section>

    );

}
