// Tabla de contenidos de una ficha. No se escribe a mano: recibe las secciones
// que la propia página va a pintar (los bloques de contenido), así que se
// mantiene sola. Mientras no haya bloques, no se muestra.
export default function ContentToc({ sections }){

    const entries = (sections ?? []).filter(
        section => section?.id && section?.title
    );

    if(entries.length === 0){

        return null;

    }


    return (

        <nav className="country-toc" aria-label="Contents">

            <h2 className="country-toc__title">
                Contents
            </h2>

            <ol className="country-toc__list">

                {
                    entries.map(section => (

                        <li key={section.id}>

                            <a href={`#${section.id}`}>
                                {section.title}
                            </a>

                        </li>

                    ))
                }

            </ol>

        </nav>

    );

}
