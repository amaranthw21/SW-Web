import { useState } from "react";
import { Link } from "react-router-dom";
import Paragraphs from "../components/Paragraphs";
import books, { loreIntro } from "../data/lore";
import useDocumentTitle from "../lib/useDocumentTitle";


// Si un color de lomo es claro, el título va en oscuro; si no, en claro. Con
// el umbral de luminancia de siempre (ITU-R BT.601), que basta para esto.
function inkOf(hex){

    const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");

    if(!match){
        return "#f5ecd7";
    }

    const n = parseInt(match[1], 16);
    const luma = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;

    return luma > 0.6 ? "#2a1d10" : "#f5ecd7";

}


// Lore de General: una estantería con un libro por historia. Al pasar por un
// lomo (o al llegar a él con el teclado) sale debajo de qué va, y al pulsarlo
// se abre su página (/general/lore/<id>).
export default function Lore(){

    useDocumentTitle("Lore");

    const [featuredId, setFeaturedId] = useState(books[0]?.id);

    const featured = books.find(book => book.id === featuredId) ?? books[0];


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">Lore</span>
            </nav>

            <h1 className="page-title">
                Lore
            </h1>

            {
                loreIntro.trim()
                    ? (
                        <div className="page-intro">
                            <Paragraphs text={loreIntro} />
                        </div>
                    )
                    : (
                        <p className="page-intro">
                            The stories of the world, one book each. Pick one from the shelf.
                        </p>
                    )
            }


            {
                books.length > 0
                    ? (
                        <>

                            <div className="lore-shelf">

                                {
                                    books.map(book => (

                                        <div key={book.id} className="lore-shelf__slot">

                                            <Link
                                                to={`/general/lore/${book.id}`}
                                                className={`lore-spine${book.id === featured?.id ? " lore-spine--on" : ""}`}
                                                style={{
                                                    "--spine": book.spine,
                                                    "--ink": inkOf(book.spine),
                                                    width: `${book.thickness}px`,
                                                    height: `${book.height}%`
                                                }}
                                                aria-label={book.title}
                                                onMouseEnter={() => setFeaturedId(book.id)}
                                                onFocus={() => setFeaturedId(book.id)}
                                            >
                                                <span className="lore-spine__title">
                                                    {book.title}
                                                </span>
                                            </Link>

                                        </div>

                                    ))
                                }

                            </div>


                            {
                                featured && (

                                    <Link to={`/general/lore/${featured.id}`} className="lore-blurb">

                                        <span className="lore-blurb__swatch" style={{ "--spine": featured.spine }} aria-hidden="true" />

                                        <span className="lore-blurb__body">

                                            <span className="lore-blurb__title">
                                                {featured.title}
                                            </span>

                                            {
                                                featured.summary?.trim() && (
                                                    <span className="lore-blurb__summary">
                                                        {featured.summary}
                                                    </span>
                                                )
                                            }

                                            <span className="lore-blurb__meta">
                                                {
                                                    featured.chapters.length === 1
                                                        ? "1 chapter"
                                                        : `${featured.chapters.length} chapters`
                                                }
                                                {" · Open the book →"}
                                            </span>

                                        </span>

                                    </Link>

                                )
                            }

                        </>
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
