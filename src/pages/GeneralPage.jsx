import { Link, useParams } from "react-router-dom";
import SectionTabs from "../components/SectionTabs";
import changesAndBans from "../content/changes-and-bans.json";
import characterCreation from "../content/character-creation.json";
import characterTypes from "../content/character-types.json";
import mechanics from "../content/mechanics.json";
import general from "../data/general";
import useDocumentTitle from "../lib/useDocumentTitle";
import NotFound from "./NotFound";


// Las páginas de General que ya tienen contenido, hecho de apartados con un
// botón cada uno (como el Rulebook, que tiene su propia ruta).
const CONTENT = {
    "mechanics": mechanics,
    "character-types": characterTypes,
    "changes-and-bans": changesAndBans,
    "character-creation": characterCreation
};


// Una página de General (Mechanics, Lore…). Las que aún no tienen contenido
// enseñan solo el título y la entradilla.
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

            {
                CONTENT[page.id]
                    ? <SectionTabs sections={CONTENT[page.id].sections} />
                    : (
                        <p className="page-intro">
                            {page.description}
                        </p>
                    )
            }

        </div>

    );

}
