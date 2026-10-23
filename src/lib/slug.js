// Convierte un título en un id apto para anclas (#scenario, #regions...).
// Lo usan los bloques de la ficha de país y la tabla de contenidos, para que
// ambos generen exactamente el mismo id y los enlaces no se rompan.
export default function slug(text) {

    return (text ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}
