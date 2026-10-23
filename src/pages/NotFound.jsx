import { Link } from "react-router-dom";
import useDocumentTitle from "../lib/useDocumentTitle";


// Lo que se ve cuando la dirección no lleva a ninguna parte. Cubre dos casos:
// una ruta que no existe (la ruta comodín de App.jsx) y una que sí existe pero
// cuya entrada no está (un id mal escrito, o una entrada que un mod ha borrado
// mientras alguien tenía el enlace guardado). En ese segundo caso las páginas
// pasan su propio `title`, p. ej. "God not found".
export default function NotFound({ title = "Page not found", children }){

    useDocumentTitle(title);

    return (

        <div>

            <h1 className="page-title">
                {title}
            </h1>

            <p className="page-intro">

                {
                    children ?? "The address doesn't lead anywhere. It may be misspelled, or the entry may have been renamed or removed."
                }

            </p>

            <p className="not-found__back">
                <Link to="/">Back to the archive</Link>
            </p>

        </div>

    );

}
