// Las fichas de las mazmorras (src/content/dungeons/*.json, colección
// "dungeons" de config.yml): nombre, gimmick, peligros posibles, climas y
// terrenos, eventos únicos, mini jefe y jefe. El generador las usa para
// cargar todo eso solo al elegir la mazmorra.
//
// Aquí van las del build; el generador lee además de GitHub las creadas o
// cambiadas después del último deploy.
export const DEFINITIONS_FOLDER = "src/content/dungeons";

const modules = import.meta.glob("../../content/dungeons/*.json", { eager: true, import: "default" });


export const BUNDLED_DEFINITIONS = Object.fromEntries(
    Object.entries(modules).map(([path, data]) => [`${DEFINITIONS_FOLDER}/${path.split("/").pop()}`, data])
);


// La lista de objetos guarda las mazmorras en mayúsculas ("INFERNO CAVE"); la
// ficha, como se lee. Se comparan sin mayúsculas ni espacios de más.
export function placeKey(name){

    return String(name ?? "").trim().toUpperCase();

}


export function definitionFor(place, definitions){

    if(!place){
        return null;
    }

    return Object.values(definitions).find(data => placeKey(data?.name) === placeKey(place)) ?? null;

}


// Deja una ficha con la forma esperada aunque falten campos.
export function cleanDefinition(data){

    const list = value => (Array.isArray(value) ? value : []);

    return {
        name: data?.name ?? "",
        gimmick: data?.gimmick ?? "",
        gimmickText: data?.gimmickText ?? "",
        hazards: list(data?.hazards).filter(Boolean),
        conditions: list(data?.conditions).map(String).map(item => item.trim()).filter(Boolean),
        events: list(data?.events).filter(event => event?.name),
        miniboss: data?.miniboss ?? "",
        boss: data?.boss ?? ""
    };

}
