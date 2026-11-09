import Card from "../components/Card";
import general from "../data/general";
import useDocumentTitle from "../lib/useDocumentTitle";


// La entrada a General: una tarjeta por página, como la de Items.
export default function GeneralHub(){

    useDocumentTitle("General");


    return (

        <div>

            <h1 className="page-title">
                General
            </h1>

            <p className="page-intro">
                The rules, the systems and the story behind the server. Pick a page.
            </p>


            <div className="grid card-grid--lore">

                {
                    general.map(page => (

                        <Card

                            key={page.id}

                            title={page.title}

                            description={page.description}

                            link={`/general/${page.id}`}

                        />

                    ))
                }

            </div>

        </div>

    );

}
