import { Link } from "react-router-dom";
import ContentBlock from "../components/ContentBlock";
import ContentToc from "../components/ContentToc";
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

            <ContentToc sections={blocks} />

            {
                blocks.map(block => (

                    <ContentBlock key={block.id} block={block} />

                ))
            }

        </div>

    );

}
