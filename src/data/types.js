// Los colores de siempre de cada tipo. Tiñen la pastilla del tipo en la tabla;
// el icono va en public/types/<tipo>.webp.
//
// Va aparte de data/pokemon.js porque ese trae los mil JSON de Pokémon, y la
// insignia de tipo sale también en páginas que no los necesitan (Mechanics).
export const TYPES = [
    { value: "Normal",   color: "#a8a77a" },
    { value: "Fire",     color: "#ee8130" },
    { value: "Water",    color: "#6390f0" },
    { value: "Electric", color: "#f7d02c" },
    { value: "Grass",    color: "#7ac74c" },
    { value: "Ice",      color: "#96d9d6" },
    { value: "Fighting", color: "#c22e28" },
    { value: "Poison",   color: "#a33ea1" },
    { value: "Ground",   color: "#e2bf65" },
    { value: "Flying",   color: "#a98ff3" },
    { value: "Psychic",  color: "#f95587" },
    { value: "Bug",      color: "#a6b91a" },
    { value: "Rock",     color: "#b6a136" },
    { value: "Ghost",    color: "#735797" },
    { value: "Dragon",   color: "#6f35fc" },
    { value: "Dark",     color: "#705746" },
    { value: "Steel",    color: "#b7b7ce" },
    { value: "Fairy",    color: "#d685ad" },
    { value: "Stellar",  color: "#40b5a5" },
    { value: "Shadow",   color: "#4b4a8c" },
    { value: "Radiant",  color: "#e9a23b" }
].map(type => ({ ...type, label: type.value }));
