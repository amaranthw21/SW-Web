import content from "../content/lore.json";
import slug from "../lib/slug";


// Las historias del Lore. Cada una es un libro de la estantería
// (/general/lore) con su propia página (/general/lore/<id>), donde se lee por
// capítulos. Salen de src/content/lore.json, editable desde el panel; el id de
// cada libro sale de su título, y el de cada capítulo del suyo.
export const loreIntro = content.intro ?? "";


// Los lomos sin color propio toman uno de estos, por orden: tonos oscuros y
// apagados, que en la estantería parecen cuero y no plástico.
const SPINES = ["#5b2333", "#1f3b5c", "#2f4a2c", "#5a3a1e", "#3c2f5c", "#1e4a4a", "#6b3a1f", "#3a3a44"];


// Lo largo que es un libro, en caracteres: de ahí sale el grosor de su lomo.
function lengthOf(book){

    return (book.chapters ?? []).reduce(
        (total, chapter) => total + (chapter?.text?.length ?? 0),
        book.summary?.length ?? 0
    );

}


// Un número fijo por título, para que la altura de cada lomo sea siempre la
// misma (y no cambie cada vez que se recarga la página).
function hashOf(text){

    let hash = 0;

    for(const char of text){
        hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    }

    return hash;

}


const books = (content.books ?? [])
    // Los marcados como ocultos en el panel no salen hasta que estén listos.
    .filter(book => book?.title?.trim() && !book.hidden)
    .map((book, i) => {

        const id = slug(book.title);

        const chapters = (book.chapters ?? [])
            .filter(chapter => chapter?.title?.trim() || chapter?.text?.trim())
            .map((chapter, j) => ({
                ...chapter,
                title: chapter.title?.trim() || `Chapter ${j + 1}`,
                id: slug(chapter.title) || `chapter-${j + 1}`
            }));

        // Grosor entre 34 y 72 px: crece con la historia, pero con tope, que
        // un libro enorme no puede ocupar media balda.
        const thickness = Math.round(34 + Math.min(38, Math.sqrt(lengthOf(book)) / 6));

        // Altura entre el 80 y el 100 % de la balda, para que la fila no
        // salga recortada con regla.
        const height = 80 + (hashOf(id) % 21);

        return {
            ...book,
            id,
            chapters,
            spine: book.color || SPINES[i % SPINES.length],
            thickness,
            height
        };

    });


export default books;
