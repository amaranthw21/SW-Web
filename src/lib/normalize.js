// Para buscar sin distinguir mayúsculas ni tildes: "pokemon" encuentra
// "Pokémon".
export default function normalize(text){

    return (text ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();

}
