import { Link, useParams } from "react-router-dom";
import BlessingsMechanic from "../components/BlessingsMechanic";
import MechanicCards from "../components/MechanicCards";
import Paragraphs from "../components/Paragraphs";
import SectionTabs from "../components/SectionTabs";
import mechanics from "../data/mechanics";
import useDocumentTitle from "../lib/useDocumentTitle";
import NotFound from "./NotFound";


// Una mecánica: un botón por apartado, como en Changes & Bans, y solo se ve el
// pulsado. Puede llevar además tarjetas (`cards`, para las que son una simple
// lista, como Common Abilities) y la marcada con `blessings` enseña las
// bendiciones con sus etapas. Un apartado también puede llevar tarjetas, que
// salen en fila con su imagen al lado (Weather & Terrain).
export default function Mechanic(){

    const { mechanicId } = useParams();

    const mechanic = mechanics.find(entry => entry.id === mechanicId);

    // Mismo texto que el <NotFound> de abajo (ver useDocumentTitle).
    useDocumentTitle(mechanic?.title ?? "Page not found");


    if(!mechanic){

        return <NotFound />;

    }


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <Link to="/general/mechanics">Mechanics</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{mechanic.title}</span>
            </nav>

            <h1 className="page-title">
                {mechanic.title}
            </h1>

            {
                mechanic.intro?.trim() && (

                    <div className="page-intro">
                        <Paragraphs text={mechanic.intro} />
                    </div>

                )
            }

            {/* Los botones de apartados salen siempre, salvo en una mecánica
                que ya tiene otra cosa (tarjetas o bendiciones) y ningún
                apartado: ahí sobraría el "aún no hay nada". */}
            {
                (mechanic.sections?.length > 0 || !(mechanic.blessings || mechanic.cards?.length > 0)) && (
                    <SectionTabs
                        sections={mechanic.sections}
                        divided
                        extra={section => section.cards?.length > 0 && (
                            <MechanicCards key="cards" cards={section.cards} rows />
                        )}
                    />
                )
            }

            <MechanicCards cards={mechanic.cards} />

            {mechanic.blessings && <BlessingsMechanic />}

        </div>

    );

}
