// Las bendiciones que dan ciertos legendarios. El contenido vive en
// src/content/blessings/*.json (editable desde el CMS; se importó del Excel con
// scripts/import-excel.py).
const modules = import.meta.glob("../content/blessings/*.json", { eager: true });


const blessings = Object.entries(modules)
    .map(([path, mod]) => {
        const id = path.split("/").pop().replace(".json", "");
        return { id, ...(mod.default ?? mod) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));


export default blessings;
