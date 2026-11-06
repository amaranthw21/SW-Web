import { useEffect, useState } from "react";


// Una plantilla para copiar y pegar en Discord. Se enseña tal cual, sin pintar
// el Markdown: lo que importa es que llegue intacto, con sus asteriscos y
// guiones bajos, para que Discord lo formatee al publicarlo.
export default function CopyTemplate({ title, text }){

    const [state, setState] = useState("idle");

    // El aviso de "Copied!" se va solo al rato.
    useEffect(() => {

        if(state === "idle"){
            return undefined;
        }

        const timer = setTimeout(() => setState("idle"), 2000);

        return () => clearTimeout(timer);

    }, [state]);


    async function copy(){

        try {
            await navigator.clipboard.writeText(text);
            setState("copied");
        } catch {
            setState("failed");
        }

    }


    return (

        <div className="copy-template">

            <div className="copy-template__head">

                <h3 className="block-part__title">
                    {title?.trim() || "Template"}
                </h3>

                <button type="button" className="copy-template__button" onClick={copy}>
                    {
                        state === "copied"
                            ? "Copied!"
                            : state === "failed"
                                ? "Couldn't copy"
                                : "Copy"
                    }
                </button>

            </div>

            <pre className="copy-template__text">{text}</pre>

        </div>

    );

}
