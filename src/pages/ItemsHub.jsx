import Card from "../components/Card";
import useDocumentTitle from "../lib/useDocumentTitle";


// La entrada a Items: tres listas distintas, cada una con su página. Es como la
// página de Lore de PU-Web, y las tarjetas se escriben aquí porque son fijas: no
// hay colección que añada listas nuevas.
const LISTS = [
    {
        title: "Item list",
        description: "Berries, items, consumables and meals: what they cost, where to find them and what they're crafted from.",
        route: "/items/list"
    },
    {
        title: "Special belongings",
        description: "Objects tied to a specific Pokémon. They can't be bought or sold.",
        route: "/items/belongings"
    },
    {
        title: "Blessings",
        description: "The blessings certain legendaries can grant, and what each one is called.",
        route: "/items/blessings"
    }
];


export default function ItemsHub(){

    useDocumentTitle("Items");


    return (

        <div>

            <h1 className="page-title">
                Items
            </h1>

            <p className="page-intro">
                Everything a character can carry. Pick a list.
            </p>


            <div className="grid card-grid--lore">

                {
                    LISTS.map(list => (

                        <Card

                            key={list.route}

                            title={list.title}

                            description={list.description}

                            link={list.route}

                        />

                    ))
                }

            </div>

        </div>

    );

}
