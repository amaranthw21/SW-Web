import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Paragraphs from "../components/Paragraphs";
import characters from "../data/characters";
import books, { SHELVES } from "../data/lore";
import asset from "../lib/asset";
import useDocumentTitle from "../lib/useDocumentTitle";
import NotFound from "./NotFound";


// Un libro del Lore, abierto a doble página: a la izquierda la portada, el
// resumen y el índice; a la derecha el capítulo que toca. El capítulo va en la
// dirección (?chapter=<id>), así que se puede enlazar uno en concreto. En el
// móvil las dos páginas van una debajo de la otra.
export default function LoreBook(){

    const { bookId } = useParams();

    const [params] = useSearchParams();

    const book = books.find(entry => entry.id === bookId);

    useDocumentTitle(book?.title ?? "Page not found");

    const chapters = book?.chapters ?? [];

    const index = Math.max(0, chapters.findIndex(chapter => chapter.id === params.get("chapter")));

    const chapter = chapters[index];

    const pageRef = useRef(null);

    const firstRender = useRef(true);


    // Al cambiar de capítulo, la página derecha vuelve a su principio. Al entrar
    // no: ahí la página ya empieza arriba del todo.
    useEffect(() => {

        if(firstRender.current){
            firstRender.current = false;
            return;
        }

        const page = pageRef.current;

        if(page && page.getBoundingClientRect().top < 0){
            page.scrollIntoView({ behavior: "smooth", block: "start" });
        }

    }, [index]);


    if(!book){

        return <NotFound />;

    }


    const linkTo = i => `/general/lore/${book.id}?chapter=${chapters[i].id}`;

    const shelf = SHELVES.find(entry => entry.kind === book.kind);

    // El personaje en cuya voz está escrita la historia (solo en las de los
    // miembros). Si se borró, se queda solo el nombre de quien la escribió.
    const character = book.kind === "story" && book.character
        ? characters.find(entry => entry.id === book.character)
        : null;

    const author = book.kind === "story" ? book.author : "";


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <Link to="/general/lore">Lore</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{book.title}</span>
            </nav>

            <div className={`lore-book lore-book--${book.kind}`} style={{ "--spine": book.spine }}>

                <section className="lore-book__page lore-book__page--left">

                    {
                        book.cover
                            ? (
                                <div
                                    className="lore-book__cover"
                                    style={{
                                        backgroundImage: `url(${asset(book.cover)})`,
                                        backgroundPosition: book.coverPosition || "center center"
                                    }}
                                    role="img"
                                    aria-label={book.title}
                                />
                            )
                            : <div className="lore-book__cover lore-book__cover--plain" aria-hidden="true" />
                    }

                    <p className={`lore-book__kind lore-book__kind--${book.kind}`}>
                        {book.kind === "story" ? "✎" : "✦"} {shelf.label}
                    </p>

                    <h1 className="lore-book__title">
                        {book.title}
                    </h1>

                    {
                        (character || author) && (

                            <p className="lore-book__byline">

                                {
                                    character && (
                                        <>
                                            In the words of{" "}
                                            <Link to={`/characters/${character.id}`}>{character.name}</Link>
                                        </>
                                    )
                                }

                                {character && author && " · "}

                                {author && `by ${author}`}

                            </p>

                        )
                    }

                    {
                        book.summary?.trim() && (
                            <div className="lore-book__summary">
                                <Paragraphs text={book.summary} />
                            </div>
                        )
                    }

                    {
                        chapters.length > 1 && (

                            <nav className="lore-book__toc" aria-label="Chapters">

                                <ol>

                                    {
                                        chapters.map((entry, i) => (

                                            <li key={entry.id}>

                                                <Link
                                                    to={linkTo(i)}
                                                    className={i === index ? "lore-book__toc-link lore-book__toc-link--on" : "lore-book__toc-link"}
                                                    aria-current={i === index ? "page" : undefined}
                                                    replace
                                                >
                                                    <span className="lore-book__toc-num">{i + 1}</span>
                                                    {entry.title}
                                                </Link>

                                            </li>

                                        ))
                                    }

                                </ol>

                            </nav>

                        )
                    }

                </section>


                <section className="lore-book__page lore-book__page--right" ref={pageRef}>

                    {
                        chapter
                            ? (
                                // La key reinicia la animación de pasar página.
                                <article key={chapter.id} className="lore-book__chapter">

                                    <h2 className="lore-book__chapter-title">
                                        {chapter.title}
                                    </h2>

                                    <div className="lore-book__text">
                                        <Paragraphs text={chapter.text} />
                                    </div>

                                </article>
                            )
                            : (
                                <p className="lore-book__empty">
                                    <em>This story hasn't been written yet.</em>
                                </p>
                            )
                    }

                    {
                        chapters.length > 1 && (

                            <footer className="lore-book__turn">

                                {
                                    index > 0
                                        ? <Link to={linkTo(index - 1)} replace>← {chapters[index - 1].title}</Link>
                                        : <span />
                                }

                                <span className="lore-book__folio">
                                    {index + 1} / {chapters.length}
                                </span>

                                {
                                    index < chapters.length - 1
                                        ? <Link to={linkTo(index + 1)} replace>{chapters[index + 1].title} →</Link>
                                        : <span />
                                }

                            </footer>

                        )
                    }

                </section>

            </div>

            <p className="lore-back">
                <Link to="/general/lore">← Back to the shelf</Link>
            </p>

        </div>

    );

}
