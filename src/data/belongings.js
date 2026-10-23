// Las pertenencias especiales: objetos ligados a un Pokémon concreto. El
// contenido vive en src/content/belongings/*.json (editable desde el CMS; se
// importó del Excel con scripts/import-excel.py).
const modules = import.meta.glob("../content/belongings/*.json", { eager: true });


// Las que todavía no tienen objeto escrito llevan este texto en el Excel. La
// página las distingue (y deja filtrarlas) en vez de enseñarlo como si fuera
// una descripción.
export const PENDING_TEXT = "TO BE DEVELOPED";

export function isPending(belonging){

    return !belonging.description?.trim()
        || belonging.description.trim().toUpperCase() === PENDING_TEXT;

}


// Por el Pokémon y, si no lo tiene, por su propio nombre: es lo que se busca.
const belongings = Object.entries(modules)
    .map(([path, mod]) => {
        const id = path.split("/").pop().replace(".json", "");
        return { id, ...(mod.default ?? mod) };
    })
    .sort((a, b) =>
        (a.pokemon || a.name).localeCompare(b.pokemon || b.name)
    );


export default belongings;
