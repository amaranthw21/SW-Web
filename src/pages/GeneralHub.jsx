import Card from "../components/Card";
import general from "../data/general";
import useDocumentTitle from "../lib/useDocumentTitle";


// La que va arriba, a lo ancho y más grande: es la que todo el mundo tiene que
// leer primero.
const FEATURED = "rulebook";


// Cuánto ocupa cada tarjeta de debajo en una rejilla de 6 columnas: de tres en
// tres, y la última fila se reparte el ancho entre las que queden (dos a la
// mitad, una entera), para que ninguna se quede suelta. En pantallas medianas
// van de dos en dos y lo resuelve el CSS (la última impar, entera).
function spanOf(index, count){

    const leftover = count % 3;
    const lastRow = index >= count - leftover;

    return lastRow ? 6 / leftover : 2;

}


// La entrada a General: el Rulebook destacado arriba y una tarjeta por página
// debajo.
export default function GeneralHub(){

    useDocumentTitle("General");

    const featured = general.find(page => page.id === FEATURED);
    const rest = general.filter(page => page !== featured);


    return (

        <div>

            <h1 className="page-title">
                General
            </h1>

            <p className="page-intro">
                The rules, the systems and the story behind the server. Pick a page.
            </p>


            <div className="general-grid">

                {
                    featured && (

                        <div className="general-grid__featured">
                            <Card
                                title={featured.title}
                                description={featured.description}
                                link={`/general/${featured.id}`}
                            />
                        </div>

                    )
                }

                {
                    rest.map((page, i) => (

                        <div
                            key={page.id}
                            className="general-grid__item"
                            style={{ "--span": spanOf(i, rest.length) }}
                        >
                            <Card
                                title={page.title}
                                description={page.description}
                                link={`/general/${page.id}`}
                            />
                        </div>

                    ))
                }

            </div>

        </div>

    );

}
