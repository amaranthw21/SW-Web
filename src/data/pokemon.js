// El contenido vive en src/content/pokemon/*.json (editable desde el CMS; se
// importó del Excel con scripts/import-excel.py). Aquí solo lo cargamos, le
// añadimos el id (= nombre del archivo) y lo ordenamos.
const modules = import.meta.glob("../content/pokemon/*.json", { eager: true });


// Las opciones de cada columna, en el orden de la pestaña VALUES del Excel. Lo
// guardado es el valor tal cual (en mayúsculas, como en el Excel y en los
// desplegables del panel); `label` es solo cómo se lee en la página.
export const STATUSES = [
    { value: "OPEN",           label: "Open",           tone: "open" },
    { value: "PENDING",        label: "Pending",        tone: "pending" },
    { value: "RESERVED (1ST)", label: "Reserved (1st)", tone: "reserved" },
    { value: "RESERVED (>1)",  label: "Reserved (>1)",  tone: "reserved" },
    { value: "CLOSED",         label: "Closed",         tone: "closed" }
];

export const LINE_STATUSES = [
    { value: "OPEN",            label: "Open" },
    { value: "LINE RESERVED",   label: "Line reserved" },
    { value: "CAN'T EVOLVE",    label: "Can't evolve" },
    { value: "FINAL EVOLUTION", label: "Final evolution" },
    { value: "DOESN'T EVOLVE",  label: "Doesn't evolve" }
];

export const STAGES = [
    { value: "NO EVOLUTION", label: "No evolution" },
    { value: "1|2",          label: "1 / 2" },
    { value: "2|2",          label: "2 / 2" },
    { value: "1|3",          label: "1 / 3" },
    { value: "2|3",          label: "2 / 3" },
    { value: "3|3",          label: "3 / 3" },
    { value: "1|2 // 1|3",   label: "1 / 2 · 1 / 3" }
];

export const CLASSIFICATIONS = [
    { value: "NORMAL",             label: "Normal" },
    { value: "MAN-MADE",           label: "Man-made" },
    { value: "PARADOX",            label: "Paradox" },
    { value: "MAJOR LEGENDARY",    label: "Major legendary" },
    { value: "MINOR LEGENDARY",    label: "Minor legendary" },
    { value: "MAN-MADE LEGENDARY", label: "Man-made legendary" },
    { value: "ULTRABEAST",         label: "Ultra Beast" }
];

export const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(gen => ({
    value: String(gen),
    label: `Gen ${gen}`
}));

// Los tipos viven en su propio archivo (data/types.js) para que quien solo
// necesite sus colores no se traiga la lista entera de Pokémon.
export { TYPES } from "./types";


// Por `order`, que es el número del Excel: así cada forma (Corsola y Corsola de
// Galar) va justo detrás de la suya. Los Fakemon tienen números negativos y van
// al final.
const pokemon = Object.entries(modules)
    .map(([path, mod]) => {
        const id = path.split("/").pop().replace(".json", "");
        return { id, ...(mod.default ?? mod) };
    })
    .sort((a, b) =>
        (a.fakemon === b.fakemon ? 0 : a.fakemon ? 1 : -1)
        || Math.abs(a.order ?? 0) - Math.abs(b.order ?? 0)
    );


export default pokemon;
