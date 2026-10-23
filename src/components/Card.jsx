import { Link } from "react-router-dom";
import Paragraphs from "./Paragraphs";
import asset from "../lib/asset";


// Tarjeta de texto. Con imagen, el arte entra por la derecha y se desvanece
// hacia el texto: el degradado va POR ENCIMA de la imagen (no es una máscara),
// así que la mitad izquierda sigue siendo el panel de siempre y el texto se lee
// igual de bien con cualquier arte.
//
// Sin imagen se queda exactamente como estaba.
export default function Card({ title, description, link, image, imagePosition }) {

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
