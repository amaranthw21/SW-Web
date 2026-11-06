import { Link, useParams } from "react-router-dom";
import OcMaker from "../components/OcMaker";
import Paragraphs from "../components/Paragraphs";
import SectionTabs from "../components/SectionTabs";
import characterTypes from "../data/characterTypes";
import useDocumentTitle from "../lib/useDocumentTitle";
import NotFound from "./NotFound";


// Un tipo de personaje: un botón por versión (Full Version, Slice of Life
// Version, OC Maker…), como en Changes & Bans, y solo se ve la pulsada. El
// apartado marcado como OC Maker lleva el cuestionario hecho con las plantillas
// de los demás.
export default function CharacterType(){

    const { typeId } = useParams();

    const type = characterTypes.find(entry => entry.id === typeId);

    // Mismo texto que el <NotFound> de abajo (ver useDocumentTitle).
    useDocumentTitle(type?.title ?? "Page not found");


    if(!type){

        return <NotFound />;

    }


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <Link to="/general/character-types">Character Types</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{type.title}</span>
            </nav>

            <h1 className="page-title">
                {type.title}
            </h1>

            {
                type.intro?.trim() && (

                    <div className="page-intro">
                        <Paragraphs text={type.intro} />
                    </div>

                )
            }

            <SectionTabs
                sections={type.sections}
                extra={section => section.maker && (
                    <OcMaker
                        key="oc-maker"
                        storageKey={`oc-maker:${type.id}`}
                        typeId={type.id}
                        versions={(type.sections ?? []).filter(version => !version.maker && version.template?.trim())}
                    />
                )}
            />

        </div>

    );

}
