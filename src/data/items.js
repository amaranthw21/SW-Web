// El contenido vive en src/content/items/*.json (editable desde el CMS; se
// importó del Excel con scripts/import-excel.py). Aquí solo lo cargamos, le
// añadimos el id (= nombre del archivo) y lo ordenamos.
import RARITIES from "./rarities";

const modules = import.meta.glob("../content/items/*.json", { eager: true });


// Mismo criterio que en pokemon.js: se guarda el valor del Excel y `label` es
// cómo se lee en la página. Las pertenencias especiales y las bendiciones eran
// tipos de esta lista; ahora tienen su propia página (belongings.js y
// blessings.js).
export const ITEM_TYPES = [
    { value: "ITEM",              label: "Item" },
    { value: "CONSUMABLE/HELD",   label: "Consumable / Held" },
    { value: "BERRY",             label: "Berry" },
    { value: "MEAL",              label: "Meal" }
];

export const HOW_TO_GET = [
    { value: "FIND",    label: "Find" },
    { value: "CRAFT",   label: "Craft" },
    { value: "SPECIAL", label: "Special" }
];


const RARITY_ORDER = RARITIES.map(rarity => rarity.value);


// Por rareza y, dentro de cada una, por nombre: es como se buscan en el Excel.
const items = Object.entries(modules)
    .map(([path, mod]) => {
        const id = path.split("/").pop().replace(".json", "");
        return { id, ...(mod.default ?? mod) };
    })
    .sort((a, b) =>
        RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
        || a.name.localeCompare(b.name)
    );


// Los lugares, para el filtro: salen de los propios objetos, así que uno nuevo
// escrito en el panel aparece solo. Las instrucciones ("ASK THE CC") también
// cuentan como lugar; es lo que pone en esa columna.
export const LOCATIONS = [...new Set(items.flatMap(item => item.locations ?? []))]
    .sort()
    .map(location => ({ value: location, label: location }));


export default items;
