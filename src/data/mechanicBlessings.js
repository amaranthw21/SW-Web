import content from "../content/mechanic-blessings.json";
import blessingItems from "./blessings";
import characters from "./characters";
import slug from "../lib/slug";


// Las bendiciones de Mechanics (Rainbow Blessing, Tidal Blessing…), con sus
// etapas. Salen de src/content/mechanic-blessings.json, editable desde el
// panel. Cada una apunta a su objeto (la colección de Items › Blessings) y al
// NPC que la concede (la de Characters); aquí se cambian esos ids por las
// fichas enteras para que la página no tenga que buscarlas.
export const mechanicBlessingsIntro = content.intro ?? "";


const mechanicBlessings = (content.blessings ?? [])
    .filter(blessing => blessing?.name?.trim())
    .map(blessing => ({
        ...blessing,
        id: slug(blessing.name),
        item: blessingItems.find(item => item.id === blessing.item) ?? null,
        npc: characters.find(character => character.id === blessing.npc) ?? null,
        stages: (blessing.stages ?? []).filter(stage => stage?.title?.trim() || stage?.text?.trim() || stage?.symbol?.trim())
    }));


export default mechanicBlessings;
