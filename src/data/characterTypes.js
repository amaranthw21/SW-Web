import content from "../content/character-types.json";
import slug from "../lib/slug";


// Los tipos de personaje de General (Legendary Reincarnations, Commonfolk…).
// Salen de src/content/character-types.json, editable desde el panel. El id de
// cada tipo (y su dirección, /general/character-types/<id>) sale de su título.
export const characterTypesIntro = content.intro ?? "";


const characterTypes = (content.types ?? [])
    .filter(type => type?.title?.trim())
    .map(type => ({
        ...type,
        id: slug(type.title)
    }));


export default characterTypes;
