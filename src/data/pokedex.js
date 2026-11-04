// La Pokédex tal como la ven los jugadores: cada enemigo de
// src/content/pokedex/*.json pasado por publicView (lib/pokedex.js), así que
// lo no descubierto llega como null y los no vistos no llegan.
import { compareEntries, publicView } from "../lib/pokedex";

const modules = import.meta.glob("../content/pokedex/*.json", { eager: true, import: "default" });


const pokedex = Object.entries(modules)
    .map(([path, data]) => publicView({ ...data, id: path.split("/").pop().replace(".json", "") }))
    .filter(Boolean)
    .sort(compareEntries);


export default pokedex;
