import { Fragment } from "react";
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
// Y por líneas, para textos largos que piden algo de estructura (las guías de
// Character Types, con un campo de la ficha detrás de otro):
//
//     ### Subtítulo          #### Sub-subtítulo
//     > Nota o ejemplo, en una caja aparte
//
// Son los que escriben los botones de encabezado y de cita del editor del
// panel. "#", "##" y "###" salen igual: el título de cada parte ya es un h3,
// así que debajo solo caben dos niveles.
//
// Una dirección suelta (https://…) también sale como enlace: copiarla y
// pegarla es lo que hace todo el mundo, y no se le puede pedir a quien edita
// que la envuelva en [texto](url).
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
// Además, `entre comillas invertidas` se resalta: las fichas de personaje lo
// usan para los números de las habilidades y los movimientos (`[-25%]`).
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
// La dirección suelta no se come el punto o la coma que la cierran: "mira
// https://x.com." enlaza a https://x.com.
const INLINE = /\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|(https?:\/\/[^\s<>]*[^\s<>.,;:!?'")])/g;


// El espacio detrás del marcador es lo que distingue una viñeta de una cursiva
// al principio de la línea: "* item" es viñeta, "*item*" es cursiva.
const BULLET = /^[-*+] +/;

const HEADING = /^(#{1,6}) +/;

const QUOTE = /^> ?/;


// Cómo se lee una línea suelta: cada encabezado va solo, y las viñetas, las
// citas y el texto normal se agrupan con sus vecinas del mismo tipo.
function kindOf(line){

    if(HEADING.test(line)){
        return "heading";
    }

    if(QUOTE.test(line)){
        return "quote";
    }

    return BULLET.test(line) ? "list" : "text";

}


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

        const [full, bold, italic, label, href, stat, url] = match;

        if(url !== undefined){
            // Sin "https://" ni la barra final, que solo ocupan sitio.
            nodes.push(
                <Anchor key={match.index} href={url}>
                    {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </Anchor>
            );
        } else if(stat !== undefined){
            nodes.push(<span key={match.index} className="paragraph-stat">{stat}</span>);
        } else if(bold !== undefined){
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


// `lineBreaks` respeta los saltos de línea sueltos dentro de un párrafo (sin
// él se juntan con un espacio, que es lo normal en un texto). Lo usa la
// historia de los personajes, que a veces va en verso.
export default function Paragraphs({ text, className, lineBreaks }){

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

                    const kind = kindOf(line);
                    const open = chunks[chunks.length - 1];

                    if(open?.kind === kind && kind !== "heading"){
                        open.lines.push(line);
                    } else {
                        chunks.push({ kind, lines: [line] });
                    }

                });

            return chunks.map((chunk, j) => {

                if(chunk.kind === "heading"){

                    const line = chunk.lines[0];
                    const Tag = line.match(HEADING)[1].length > 3 ? "h5" : "h4";

                    return (
                        <Tag
                            key={`${i}-${j}`}
                            className={Tag === "h4" ? "paragraph-heading" : "paragraph-subheading"}
                        >
                            {inline(line.replace(HEADING, ""))}
                        </Tag>
                    );

                }

                // Lo de dentro de la caja es un texto más (con sus viñetas y sus
                // párrafos): una línea que solo tiene ">" separa párrafos, que es
                // como el editor escribe una cita de varios. Dentro se respetan los
                // saltos de línea, para que una primera línea en negrita haga de
                // título de la caja.
                if(chunk.kind === "quote"){

                    return (
                        <blockquote key={`${i}-${j}`} className="paragraph-note">
                            <Paragraphs
                                text={chunk.lines.map(line => line.replace(QUOTE, "")).join("\n")}
                                className={className}
                                lineBreaks
                            />
                        </blockquote>
                    );

                }

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
                        {
                            lineBreaks
                                ? chunk.lines.map((line, k) => (
                                      <Fragment key={k}>
                                          {k > 0 && <br />}
                                          {inline(line)}
                                      </Fragment>
                                  ))
                                : inline(chunk.lines.join(" "))
                        }
                    </p>

                );

            });

        });

}
