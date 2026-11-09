import menu from "../content/general-menu.json";


// Las páginas de General. Son fijas, así que se escriben aquí en vez de salir
// de una colección: de esta lista tiran la portada de la sección, la barra
// lateral y la ruta /general/:pageId.
const general = [
    {
        id: "rulebook",
        title: "Rulebook",
        description: "The rules of the server: how to play, how to behave and what's expected of everyone."
    },
    {
        id: "mechanics",
        title: "Mechanics",
        description: "How battles, training and the rest of the systems work."
    },
    {
        id: "character-types",
        title: "Character Types",
        description: "The kinds of characters you can play and what sets each one apart."
    },
    {
        id: "changes-and-bans",
        title: "Changes & Bans",
        description: "What can't be used, and what has been changed from the original games."
    },
    {
        id: "lore",
        title: "Lore",
        description: "The story of the world and the forces that shape it."
    },
    {
        id: "timeline",
        title: "Timeline",
        description: "The events of the world, in order."
    }
];


// La imagen de cada tarjeta del menú de General sale del panel
// (src/content/general-menu.json, "General menu"): las páginas son fijas, pero
// sus imágenes no.
const withImages = general.map(page => {

    const card = (menu.cards ?? []).find(entry => entry?.page === page.id);

    return card ? { ...page, image: card.image, imagePosition: card.imagePosition } : page;

});


export default withImages;
