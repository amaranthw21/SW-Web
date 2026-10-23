import region, { regionName } from "../data/region";
import islands from "../data/islands";
import EntryCard from "../components/EntryCard";
import Paragraphs from "../components/Paragraphs";
import useDocumentTitle from "../lib/useDocumentTitle";


// La página de la región: su nombre y una tarjeta por isla, cada una con su página.
// Las tarjetas son las de los dioses de PU-Web en su variante ancha (una por
// fila, como un banner) y salen de la colección, así que una isla nueva
// publicada desde el panel aparece aquí sola.
export default function Region(){

    useDocumentTitle(regionName);


    return (

        <div>

            <h1 className="page-title">
                {regionName}
            </h1>

            {
                region.intro?.trim() && (

                    <div className="page-intro">
                        <Paragraphs text={region.intro} />
                    </div>

                )
            }


            <hr className="section-divider" />


            <div className="grid card-grid card-grid--wide">

                {
                    islands.map(island => (

                        <EntryCard

                            key={island.id}

                            name={island.name}

                            subtitle={
                                island.underConstruction
                                    ? "Under construction"
                                    : island.summary
                            }

                            image={island.image}

                            imagePosition={island.imagePosition}

                            // Una isla en construcción se ve pero no se abre:
                            // sin `link`, EntryCard la pinta como un <div>.
                            link={island.underConstruction ? undefined : `/bethath/${island.id}`}

                        />

                    ))
                }

            </div>

        </div>

    );

}
