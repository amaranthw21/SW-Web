import { Link } from "react-router-dom";
import Card from "../components/Card";
import Paragraphs from "../components/Paragraphs";
import characterTypes, { characterTypesIntro } from "../data/characterTypes";
import useDocumentTitle from "../lib/useDocumentTitle";


// Character Types de General: una tarjeta por tipo, como las de General e
// Items. Cada una lleva a la página del tipo, que tiene sus propios botones
// (Full Version, Slice of Life Version, OC Maker…).
export default function CharacterTypes(){

    useDocumentTitle("Character Types");


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">Character Types</span>
            </nav>

            <h1 className="page-title">
                Character Types
            </h1>

            {
                characterTypesIntro.trim() && (

                    <div className="page-intro">
                        <Paragraphs text={characterTypesIntro} />
                    </div>

                )
            }


            <div className="grid card-grid--lore">

                {
                    characterTypes.map(type => (

                        <Card
                            key={type.id}
                            title={type.title}
                            description={type.summary}
                            image={type.image}
                            imagePosition={type.imagePosition}
                            link={`/general/character-types/${type.id}`}
                        />

                    ))
                }

            </div>

        </div>

    );

}
