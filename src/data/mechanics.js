import content from "../content/mechanics.json";
import slug from "../lib/slug";


// Las mecánicas de General. No tienen relación entre sí, así que cada una es su
// propia página (/general/mechanics/<id>) y la de Mechanics es solo el menú que
// lleva a ellas. Salen de src/content/mechanics.json, editable desde el panel;
// el id de cada una sale de su título.
export const mechanicsIntro = content.intro ?? "";


const mechanics = (content.pages ?? [])
    // Las marcadas como ocultas en el panel no salen hasta que estén listas.
    .filter(page => page?.title?.trim() && !page.hidden)
    .map(page => ({
        ...page,
        id: slug(page.title)
    }));


export default mechanics;
