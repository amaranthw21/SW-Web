// Las plantillas de Character Types (Markdown de Discord) leídas como un
// cuestionario, para el OC Maker. No hace falta escribir el cuestionario
// aparte: sale de la plantilla misma, así que cambiar la plantilla en el panel
// cambia también las preguntas.
//
// Lo que se reconoce, línea a línea:
//
//   " - Name:"                 → pregunta corta ("Name").
//   " - Common Talent:"        → pregunta larga, si la línea siguiente es
//   "> Insert text here"         "> Insert text here".
//   " - Species:"              → no es pregunta sino un grupo, si las líneas
//   "  - Fusion Name:"           de debajo están más metidas.
//   "**BACKSTORY**"            → un título; un "> Insert text here" justo
//   "> Insert text here"         debajo es una pregunta larga con ese nombre.
//
// Todo lo demás (separadores, líneas en blanco) se copia tal cual.

const INSERT = /^>\s*insert text here\s*$/i;
const ITEM = /^(\s*)-\s+(.*?)\s*$/;
const HEADING = /^\s*(#+\s|[_*])/;
const SEPARATOR = /^\s*(><\s*)+$/;


// "__**BASICS**__" → "BASICS"; "## LEGENDARY OC" → "LEGENDARY OC".
function headingText(line){

    return line.trim().replace(/^#+\s*/, "").replace(/^[_*\s]+|[_*:\s]+$/g, "");

}


function indentOf(line){

    return line.match(/^\s*/)[0].length;

}


// Devuelve la plantilla troceada: líneas que se copian tal cual, títulos,
// grupos y preguntas. Cada pregunta lleva una clave (su número de línea) para
// que dos iguales —los seis "Move (Type/PP)"— no se pisen.
export function parseTemplate(template){

    const lines = (template ?? "").replace(/\r\n?/g, "\n").split("\n");
    const tokens = [];
    let heading = "";

    for(let i = 0; i < lines.length; i += 1){

        const line = lines[i];
        const item = line.match(ITEM);

        if(item){

            const label = item[2].replace(/:$/, "").trim();
            const next = lines[i + 1] ?? "";
            const nextItem = next.match(ITEM);

            if(nextItem && indentOf(next) > indentOf(line)){
                tokens.push({ type: "group", line, label });
                continue;
            }

            const long = INSERT.test(next);

            tokens.push({
                type: "field",
                key: `l${i}`,
                line,
                placeholder: long ? next : null,
                indent: item[1],
                label,
                long
            });

            if(long){
                i += 1;
            }

            continue;

        }


        if(INSERT.test(line)){

            tokens.push({ type: "field", key: `l${i}`, line: null, placeholder: line, label: heading || "Text", long: true });
            continue;

        }


        if(HEADING.test(line) && headingText(line)){

            heading = headingText(line);
            tokens.push({ type: "heading", line, label: heading, top: /^\s*#/.test(line) });
            continue;

        }


        tokens.push({ type: "line", line, separator: SEPARATOR.test(line) });

    }

    return tokens;

}


// Un texto largo, citado línea a línea como lo espera Discord.
function quote(text){

    return text.split("\n").map(line => `> ${line}`.trimEnd()).join("\n");

}


// La plantilla con las respuestas puestas. Lo que se deja sin contestar sale
// como en la plantilla original, para completarlo después en Discord.
//
// `extras` es una lista de { title, text } que se añade al final, en su propio
// apartado, separado con el mismo separador que use la plantilla.
export function fillTemplate(tokens, values, extras = []){

    const out = [];

    for(const token of tokens){

        if(token.type !== "field"){
            out.push(token.line);
            continue;
        }

        const value = (values[token.key] ?? "").trim();

        if(token.long){

            // Las largas con nombre (" - Move (Type/PP):") admiten además una
            // respuesta corta en su propia línea: el nombre del movimiento.
            if(token.line !== null){
                const inline = (values[`${token.key}:inline`] ?? "").trim();
                out.push(inline ? `${token.indent}- ${token.label}: ${inline}` : token.line);
            }

            out.push(value ? quote(value) : token.placeholder);
            continue;

        }

        out.push(value ? `${token.indent}- ${token.label}: ${value}` : token.line);

        // Una respuesta corta puede llevar debajo una explicación citada (un
        // mundo de origen inventado y su descripción).
        const note = (values[`${token.key}:quote`] ?? "").trim();

        if(note){
            out.push(quote(note));
        }

    }


    const filled = extras
        .map(extra => ({ title: extra.title?.trim() ?? "", text: extra.text?.trim() ?? "" }))
        .filter(extra => extra.title || extra.text);

    if(filled.length > 0){

        while(out.length > 0 && !out.at(-1).trim()){
            out.pop();
        }

        const separator = tokens.find(token => token.separator)?.line;

        if(separator){
            out.push("", separator);
        }

        out.push("", "__**EXTRAS**__");

        for(const extra of filled){
            out.push(` - ${extra.title || "Extra"}:`);
            if(extra.text){
                out.push(quote(extra.text));
            }
        }

    }

    return out.join("\n");

}
