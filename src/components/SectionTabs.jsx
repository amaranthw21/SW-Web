import { useSearchParams } from "react-router-dom";
import ContentBlock from "./ContentBlock";
import withBlockIds from "../lib/blocks";


// Las páginas de General hechas de apartados (Rulebook, Mechanics…): un botón
// por apartado y solo se ven las entradas del que esté pulsado. Cada apartado
// se pinta como un bloque de contenido, igual que las secciones de una isla.
//
// El apartado va en la dirección (?section=combat) para poder enlazar a uno
// concreto y para que el botón de atrás vuelva al anterior.
//
// `numbered` pone [1], [2]… delante de cada entrada, como en las reglas.
// `empty` es lo que dice un apartado que aún no tiene nada escrito.
function sectionBlocks(sections, numbered, empty){

    return withBlockIds(
        (sections ?? []).map(section => {

            const entries = (section.entries ?? []).filter(entry => entry?.title?.trim());

            const parts = [
                { type: "text", text: section.intro },
                ...entries.map((entry, i) => ({
                    type: "text",
                    title: numbered ? `[${i + 1}] ${entry.title}` : entry.title,
                    text: entry.text
                })),
                { type: "text", text: section.outro }
            ].filter(part => part.title || part.text?.trim());

            // Un apartado aún vacío sale igual, para que se vea que existe.
            if(parts.length === 0){
                parts.push({ type: "text", text: `*${empty}*` });
            }

            return { title: section.title, parts };

        })
    );

}


export default function SectionTabs({ sections, numbered = false, empty = "Nothing has been written here yet." }){

    const blocks = sectionBlocks(sections, numbered, empty);

    const [params, setParams] = useSearchParams();
    const current = blocks.find(block => block.id === params.get("section"));


    if(blocks.length === 0){

        return <p className="section-tabs__hint">{empty}</p>;

    }


    return (

        <>

            <div className="section-tabs" role="group" aria-label="Sections">
                {
                    blocks.map(block => (
                        <button
                            key={block.id}
                            type="button"
                            className={`section-tab${block === current ? " section-tab--on" : ""}`}
                            aria-pressed={block === current}
                            onClick={() => setParams({ section: block.id })}
                        >
                            {block.title}
                        </button>
                    ))
                }
            </div>

            {
                current
                    ? <ContentBlock key={current.id} block={current} />
                    : <p className="section-tabs__hint">Pick a section to read it.</p>
            }

        </>

    );

}
