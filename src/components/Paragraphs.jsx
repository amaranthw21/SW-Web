import { Link } from "react-router-dom";


// Pinta un texto del CMS. Lo usan todos los campos de texto del sitio, así que
// lo que se soporte aquí se soporta en todas partes.
//
// Los bloques se separan por una línea en blanco: los que empiezan por "- " se
// pintan como lista y el resto como párrafo. Dentro de cada línea se admiten
// cuatro cosas, y solo cuatro:
//
//     **negrita**            *cursiva*
//     - viñeta               [texto](/ruta)
//
// La viñeta vale con "-", "*" o "+", que son los tres que usa markdown: el
// editor del panel escribe uno u otro según le parece, y una lista hecha con su
// botón tiene que salir como lista igual.
//
// No es markdown entero a propósito. Una librería (react-markdown + remark) son
// unos 45 kB comprimidos sobre un bundle de 104 kB, y traería tablas, código y
// encabezados que aquí no se usan —los encabezados ya los pone el título de cada
// parte—. Esto son unas ochenta líneas que devuelven elementos de React, así que
// no hay HTML que inyectar ni nada que sanear: lo que no encaje con la sintaxis
// se queda tal cual está escrito.
//
// La cursiva solo va con asteriscos, no con guiones bajos: los guiones bajos
// aparecen en nombres de archivo de imágenes y no queremos que una ruta escrita
// en un texto acabe en cursiva.


// El orden de las alternativas importa: la negrita va antes que la cursiva, o
// "**algo**" se leería como una cursiva vacía seguida de otra.
//
// Se recorre con matchAll y no con exec en un bucle: exec guarda la posición
// dentro de la propia expresión, y como inline() se llama a sí misma para el
// contenido de una negrita o de un enlace, la llamada de dentro le pisaría la
// posición a la de fuera y el recorrido no avanzaría nunca. matchAll trabaja
// sobre una copia, así que la recursión es segura.
const INLINE = /\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;


// El espacio detrás del marcador es lo que distingue una viñeta de una cursiva
// al principio de la línea: "* item" es viñeta, "*item*" es cursiva.
const BULLET = /^[-*+] +/;


function Anchor({ href, children }){

    // Interno (/lore/gods/chaos) o externo. El interno va por el router: con un
    // <a> normal el navegador recargaría el sitio entero.
    if(href.startsWith("/")){

        return <Link to={href}>{children}</Link>;

    }

    return (
        <a href={href} target="_blank" rel="noreferrer">
            {children}
        </a>
    );

}


// Convierte una línea en una lista de nodos. Se llama a sí misma para el texto
// de un enlace, así que "[**algo**](/x)" funciona.
function inline(line){

    const nodes = [];

    let last = 0;

    for(const match of line.matchAll(INLINE)){

        if(match.index > last){
            nodes.push(line.slice(last, match.index));
        }

        const [full, bold, italic, label, href] = match;

        if(bold !== undefined){
            nodes.push(<strong key={match.index}>{inline(bold)}</strong>);
        } else if(italic !== undefined){
            nodes.push(<em key={match.index}>{inline(italic)}</em>);
        } else {
            nodes.push(
                <Anchor key={match.index} href={href}>
                    {inline(label)}
                </Anchor>
            );
        }

        last = match.index + full.length;

    }

    if(last < line.length){
        nodes.push(line.slice(last));
    }

    return nodes;

}


export default function Paragraphs({ text, className }){

    return (text ?? "")
        .split(/\n\s*\n/)
        .map(block => block.trim())
        .filter(Boolean)
        .flatMap((block, i) => {

            // Un bloque no es siempre una sola cosa: lo normal al escribir es
            // una frase de entrada y debajo sus viñetas. Así que el bloque se
            // parte en tramos —líneas seguidas de viñeta por un lado, líneas
            // normales por otro— y cada tramo se pinta como lo que es.
            const chunks = [];

            block
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .forEach(line => {

                    const kind = BULLET.test(line) ? "list" : "text";
                    const open = chunks[chunks.length - 1];

                    if(open?.kind === kind){
                        open.lines.push(line);
                    } else {
                        chunks.push({ kind, lines: [line] });
                    }

                });

            return chunks.map((chunk, j) => {

                if(chunk.kind === "list"){

                    return (

                        <ul
                            key={`${i}-${j}`}
                            className={className ? `${className} paragraph-list` : "paragraph-list"}
                        >

                            {
                                chunk.lines.map((line, k) => (

                                    <li key={k}>
                                        {inline(line.replace(BULLET, ""))}
                                    </li>

                                ))
                            }

                        </ul>

                    );

                }

                return (

                    <p
                        key={`${i}-${j}`}
                        className={className ? `paragraph ${className}` : "paragraph"}
                    >
                        {inline(chunk.lines.join(" "))}
                    </p>

                );

            });

        });

}
