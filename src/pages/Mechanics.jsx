import { Link } from "react-router-dom";
import Card from "../components/Card";
import Paragraphs from "../components/Paragraphs";
import mechanics, { mechanicsIntro } from "../data/mechanics";
import useDocumentTitle from "../lib/useDocumentTitle";


// Mechanics de General: el menú intermedio. Una tarjeta por mecánica, como en
// Items, y cada una lleva a su página con sus propios botones.
export default function Mechanics(){

    useDocumentTitle("Mechanics");


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">Mechanics</span>
            </nav>

            <h1 className="page-title">
                Mechanics
            </h1>

            {
                mechanicsIntro.trim()
                    ? (
                        <div className="page-intro">
                            <Paragraphs text={mechanicsIntro} />
                        </div>
                    )
                    : (
                        <p className="page-intro">
                            How the different systems of the server work. Pick one.
                        </p>
                    )
            }


            {
                mechanics.length > 0
                    ? (
                        <div className="grid card-grid--lore">

                            {
                                mechanics.map(mechanic => (

                                    <Card
                                        key={mechanic.id}
                                        title={mechanic.title}
                                        description={mechanic.summary}
                                        image={mechanic.image}
                                        imagePosition={mechanic.imagePosition}
                                        link={`/general/mechanics/${mechanic.id}`}
                                    />

                                ))
                            }

                        </div>
                    )
                    : (
                        <p className="page-intro">
                            <em>Nothing here yet.</em>
                        </p>
                    )
            }

        </div>

    );

}
