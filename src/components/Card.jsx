import { Link } from "react-router-dom";
import Paragraphs from "./Paragraphs";
import asset from "../lib/asset";


// Tarjeta de texto. Con imagen, el arte entra por la derecha y se desvanece
// hacia el texto: el degradado va POR ENCIMA de la imagen (no es una máscara),
// así que la mitad izquierda sigue siendo el panel de siempre y el texto se lee
// igual de bien con cualquier arte.
//
// Sin imagen se queda exactamente como estaba.
//
// Con `slash` (los menús de General y Mechanics) la tarjeta va partida por una
// diagonal como los botones de los apartados: el texto a la izquierda y la
// imagen a la derecha, o un degradado mientras no haya imagen.
export default function Card({ title, description, link, image, imagePosition, slash = false }) {

    if(slash){

        return (

            <div className="card card--slash">

                <div className="card__text">

                    <h2>
                        {title}
                    </h2>

                    <Paragraphs text={description} />

                    {
                        link && (
                            <Link to={link} className="card__link">
                                Explore →
                            </Link>
                        )
                    }

                </div>

                <span className="card__slash" aria-hidden="true">
                    <span
                        className={image?.trim() ? "card__slash-art" : "card__slash-art card__slash-art--empty"}
                        style={image?.trim() ? {
                            backgroundImage: `url(${asset(image)})`,
                            backgroundPosition: imagePosition || "center"
                        } : undefined}
                    />
                </span>

                {/* Toda la tarjeta lleva al enlace, no solo el "Explore". */}
                {link && <Link to={link} className="card__cover" aria-hidden="true" tabIndex={-1} />}

            </div>

        );

    }


    // Solo se pasa la imagen y su encuadre. El degradado lo pone el CSS: en
    // ancho entra por la derecha y en un móvil por abajo, y esa decisión es de
    // la hoja de estilos, no de aquí.
    const art = image?.trim()
        ? {
              "--card-art": `url(${asset(image)})`,
              "--card-art-position": imagePosition || "center"
          }
        : undefined;


    return (

        <div className={image?.trim() ? "card card--art" : "card"} style={art}>

            <h2>
                {title}
            </h2>


            <Paragraphs text={description} />


            {
                link && (

                    <Link to={link}>
                        Explore →
                    </Link>

                )
            }

        </div>

    );

}
