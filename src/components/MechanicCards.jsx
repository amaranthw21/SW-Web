import { Link } from "react-router-dom";
import Paragraphs from "./Paragraphs";
import islands from "../data/islands";
import { TYPES } from "../data/types";
import asset from "../lib/asset";


// Una mecánica que es una simple lista (Common Abilities, una por tipo): una
// tarjeta por entrada en vez de botones. Si la tarjeta lleva tipo, sale con su
// símbolo (public/types/<tipo>.webp) y se tiñe de su color. Si lleva isla
// (Commonfolk Perks, uno por isla), sale con la imagen de la isla arriba y un
// enlace a su página.
export default function MechanicCards({ cards }){

    const list = (cards ?? []).filter(card => card?.title?.trim() || card?.type);

    if(list.length === 0){

        return null;

    }


    return (

        <div className="mechanic-cards">

            {
                list.map((card, i) => {

                    const color = TYPES.find(type => type.value === card.type)?.color;
                    const island = islands.find(entry => entry.id === card.island);
                    const art = island?.image?.trim();

                    const style = {
                        ...(color ? { "--type": color } : {}),
                        ...(island?.color ? { "--type": island.color } : {}),
                        ...(art ? { "--card-island": `url(${art})` } : {})
                    };

                    return (

                        <article
                            key={i}
                            className={art ? "mechanic-card mechanic-card--island" : "mechanic-card"}
                            style={style}
                        >

                            {art && <div className="mechanic-card__banner" aria-hidden="true" />}

                            <header className="mechanic-card__head">

                                {
                                    card.type && (
                                        <span className="mechanic-card__icon" aria-hidden="true">
                                            <img
                                                src={asset(`/types/${card.type.toLowerCase()}.webp`)}
                                                alt=""
                                                loading="lazy"
                                                onError={e => { e.currentTarget.style.display = "none"; }}
                                            />
                                        </span>
                                    )
                                }

                                <h2 className="mechanic-card__title">
                                    {card.title?.trim() || card.type}
                                </h2>

                            </header>

                            {
                                island && (
                                    <Link className="mechanic-card__island" to={`/bethath/${island.id}`}>
                                        {island.name}
                                    </Link>
                                )
                            }

                            {
                                card.text?.trim()
                                    ? <Paragraphs text={card.text} />
                                    : <p className="mechanic-card__empty">Nothing has been written here yet.</p>
                            }

                        </article>

                    );

                })
            }

        </div>

    );

}
