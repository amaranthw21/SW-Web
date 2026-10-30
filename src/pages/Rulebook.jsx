import { Link, useSearchParams } from "react-router-dom";
import ContentBlock from "../components/ContentBlock";
import rulebook from "../content/rulebook.json";
import withBlockIds from "../lib/blocks";
import useDocumentTitle from "../lib/useDocumentTitle";


// Cada apartado del Rulebook (General, Character…) se pinta como un bloque de
// contenido, igual que las secciones de una isla: así trae su ancla para la
// tabla de contenidos. Las reglas se numeran solas, por orden.
function rulebookBlocks(){

    return withBlockIds(
        (rulebook.sections ?? []).map(section => {

            const rules = (section.rules ?? []).filter(rule => rule?.title?.trim());

            const parts = [
                { type: "text", text: section.intro },
                ...rules.map((rule, i) => ({
                    type: "text",
                    title: `[${i + 1}] ${rule.title}`,
                    text: rule.text
                })),
                { type: "text", text: section.outro }
            ].filter(part => part.title || part.text?.trim());

            // Un apartado aún sin reglas sale igual, para que se vea que existe.
            if(parts.length === 0){
                parts.push({ type: "text", text: "*These rules haven't been written yet.*" });
            }

            return { title: section.title, parts };

        })
    );

}


export default function Rulebook(){

    useDocumentTitle("Rulebook");

    const blocks = rulebookBlocks();

    // Un botón por apartado; solo se ven las reglas del que esté pulsado. Va en
    // la dirección (?section=combat) para poder enlazar a un apartado concreto
    // y para que el botón de atrás vuelva al anterior.
    const [params, setParams] = useSearchParams();
    const current = blocks.find(block => block.id === params.get("section"));


    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/general">General</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">Rulebook</span>
            </nav>

            <h1 className="page-title">
                Rulebook
            </h1>

            <div className="rulebook-tabs" role="group" aria-label="Rule sections">
                {
                    blocks.map(block => (
                        <button
                            key={block.id}
                            type="button"
                            className={`rulebook-tab${block === current ? " rulebook-tab--on" : ""}`}
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
                    : <p className="rulebook-hint">Pick a section to read its rules.</p>
            }

        </div>

    );

}
