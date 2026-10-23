// Las islas de Bethath. Cada una vive en su propia carpeta, con su JSON y sus
// imágenes juntos (editable desde el CMS, en "Islands"):
//
//     src/content/islands/sleighbell-island/sleighbell-island.json
//     src/content/islands/sleighbell-island/Lugia-Ho-oh-bg.jpg
//
// El id de la isla (y su dirección, /bethath/<id>) es el nombre de la carpeta.
const modules = import.meta.glob("../content/islands/*/*.json", { eager: true });

// Las imágenes de dentro de las carpetas las empaqueta Vite, que devuelve su
// dirección final (ya con el base path y el hash del build).
const images = import.meta.glob(
    "../content/islands/*/*.{png,jpg,jpeg,webp,avif,gif}",
    { eager: true, query: "?url", import: "default" }
);


function folderOf(path){

    return path.split("/").at(-2);

}


// El campo `image` del JSON es el nombre de un archivo de la carpeta de la
// isla. Si no está ahí, se deja tal cual: así una ruta pública ("/islands/x.png")
// o una dirección externa siguen funcionando.
function resolveImage(id, image){

    const name = image?.trim();

    if(!name){
        return name;
    }

    return images[`../content/islands/${id}/${name.replace(/^\.?\//, "")}`] ?? name;

}


// Las listas de lugares, NPCs y personajes también guardan solo el nombre de
// su imagen, así que se resuelven igual.
function withImages(id, entries){

    return (entries ?? []).map(entry => ({
        ...entry,
        image: resolveImage(id, entry?.image)
    }));

}


const islands = Object.entries(modules)
    .map(([path, mod]) => {
        const id = folderOf(path);
        const data = mod.default ?? mod;
        return {
            ...data,
            id,
            image: resolveImage(id, data.image),
            background: resolveImage(id, data.background),
            territories: (data.territories ?? []).map(territory => ({
                ...territory,
                safeZones: withImages(id, territory.safeZones),
                dungeons: withImages(id, territory.dungeons)
            })),
            npcs: withImages(id, data.npcs),
            characters: withImages(id, data.characters)
        };
    })
    .sort((a, b) =>
        (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name)
    );


export default islands;
