import { useSearchParams } from "react-router-dom";
import ContentBlock from "./ContentBlock";
import CopyTemplate from "./CopyTemplate";
import withBlockIds from "../lib/blocks";
import asset from "../lib/asset";


// Las páginas de General hechas de apartados (Rulebook, Mechanics…): un botón
// por apartado y solo se ven las entradas del que esté pulsado. Cada apartado
// se pinta como un bloque de contenido, igual que las secciones de una isla.
//
// El apartado va en la dirección (?section=combat) para poder enlazar a uno
// concreto y para que el botón de atrás vuelva al anterior.
//
// `numbered` pone [1], [2]… delante de cada entrada, como en las reglas.
// `empty` es lo que dice un apartado que aún no tiene nada escrito.
// `divided` separa cada entrada de la anterior con una raya, para guías largas
// donde cada entrada es una parte distinta (Basics, Personality…).
//
// Un apartado puede acabar en una plantilla (`template`) para copiar y pegar
// en Discord, como las fichas de Character Types. `extra(section)` deja que la
// página añada al final de un apartado algo suyo (el cuestionario del OC Maker).
function sectionBlocks(sections, numbered, empty, extra, divided){

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

            const node = extra?.(section);

            if(node){
                parts.push({ type: "node", node });
            }

            if(section.template?.trim()){
                parts.push({
                    type: "node",
                    node: <CopyTemplate key="template" title={section.templateTitle} text={section.template} />
                });
            }

            // Un apartado aún vacío sale igual, para que se vea que existe.
            if(parts.length === 0){
                parts.push({ type: "text", text: `*${empty}*` });
            }

            return {
                title: section.title,
                parts,
                className: divided ? "country-block--divided" : undefined,
                image: section.image,
                imagePosition: section.imagePosition
            };

        })
    );

}


// Los botones son tarjetas partidas por una diagonal: el texto a la izquierda y
// la imagen del apartado (`image`, del panel) a la derecha. Sin imagen, en su
// lado va un degradado, así que no hace falta subirlas todas a la vez. Con
// `art={false}` vuelven a ser botones planos.
//
// `featured` hace el primer botón más grande y a lo ancho, encima de los demás
// (el General del Rulebook): con cinco apartados, así los otros cuatro llenan
// sus filas y ninguno se queda suelto.
export default function SectionTabs({ sections, numbered = false, empty = "Nothing has been written here yet.", extra, divided = false, featured = false, art = true }){

    const blocks = sectionBlocks(sections, numbered, empty, extra, divided);

    const [params, setParams] = useSearchParams();
    const current = blocks.find(block => block.id === params.get("section"));


    if(blocks.length === 0){

        return <p className="section-tabs__hint">{empty}</p>;

    }


    return (

        <>

            {/* --cols: en ancho, tantas columnas como botones (hasta cuatro),
                para que tres botones no dejen un hueco a la derecha. */}
            <div
                className={featured ? "section-tabs section-tabs--featured" : "section-tabs"}
                style={{ "--cols": Math.min(4, Math.max(1, blocks.length - (featured ? 1 : 0))) }}
                role="group"
                aria-label="Sections"
            >
                {
                    blocks.map((block, i) => (
                        <button
                            key={block.id}
                            type="button"
                            className={`section-tab${art ? " section-tab--art" : ""}${featured && i === 0 ? " section-tab--featured" : ""}${block === current ? " section-tab--on" : ""}`}
                            aria-pressed={block === current}
                            onClick={() => setParams({ section: block.id })}
                        >
                            {
                                art
                                    ? (
                                        <>
                                            <span className="section-tab__label">{block.title}</span>
                                            <span className="section-tab__slash" aria-hidden="true">
                                                <span
                                                    className={block.image?.trim() ? "section-tab__art" : "section-tab__art section-tab__art--empty"}
                                                    style={block.image?.trim() ? {
                                                        backgroundImage: `url(${asset(block.image)})`,
                                                        backgroundPosition: block.imagePosition || "center"
                                                    } : undefined}
                                                />
                                            </span>
                                        </>
                                    )
                                    : block.title
                            }
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
