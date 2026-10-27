import { Link, useParams } from "react-router-dom";
import general from "../data/general";
import useDocumentTitle from "../lib/useDocumentTitle";
import NotFound from "./NotFound";


// Una página de General (Rulebook, Mechanics…). De momento solo el título y la
// entradilla: el contenido de cada una llegará después.
export default function GeneralPage(){

    const { pageId } = useParams();

    const page = general.find(entry => entry.id === pageId);

    // Mismo texto que el <NotFound> de abajo, o el título de la pestaña se
    // queda en "General".
    useDocumentTitle(page?.title ?? "Page not found");


    if(!page){

        return <NotFound />;

    }


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{page.title}</span>
            </nav>

            <h1 className="page-title">
                {page.title}
            </h1>

            <p className="page-intro">
                {page.description}
            </p>

        </div>

    );

}
