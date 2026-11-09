import { Link, useParams } from "react-router-dom";
import BlessingsMechanic from "../components/BlessingsMechanic";
import Paragraphs from "../components/Paragraphs";
import SectionTabs from "../components/SectionTabs";
import mechanics from "../data/mechanics";
import useDocumentTitle from "../lib/useDocumentTitle";
import NotFound from "./NotFound";


// Una mecánica: un botón por apartado, como en Changes & Bans, y solo se ve el
// pulsado. La marcada con `blessings` enseña además las bendiciones con sus
// etapas (y los apartados, solo si tiene alguno).
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

            {
                mechanic.blessings
                    ? (
                        <>
                            {mechanic.sections?.length > 0 && <SectionTabs sections={mechanic.sections} divided />}
                            <BlessingsMechanic />
                        </>
                    )
                    : <SectionTabs sections={mechanic.sections} divided />
            }

        </div>

    );

}
