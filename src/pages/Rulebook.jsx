import { Link } from "react-router-dom";
import SectionTabs from "../components/SectionTabs";
import rulebook from "../content/rulebook.json";
import useDocumentTitle from "../lib/useDocumentTitle";


// Un botón por apartado (General, Character…) con sus reglas numeradas solas,
// por orden. Los botones llevan la imagen de su apartado tras una diagonal, y
// el de General, el primero, va más grande y encima de los demás.
export default function Rulebook(){

    useDocumentTitle("Rulebook");


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">Rulebook</span>
            </nav>

            <h1 className="page-title">
                Rulebook
            </h1>

            <SectionTabs
                sections={rulebook.sections}
                numbered
                featured
                empty="These rules haven't been written yet."
            />

        </div>

    );

}
