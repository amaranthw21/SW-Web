import Paragraphs from "./Paragraphs";
import { TYPES } from "../data/types";
import asset from "../lib/asset";


// Una mecánica que es una simple lista (Common Abilities, una por tipo): una
// tarjeta por entrada en vez de botones. Si la tarjeta lleva tipo, sale con su
// símbolo (public/types/<tipo>.webp) y se tiñe de su color.
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

                    return (

                        <article
                            key={i}
                            className="mechanic-card"
                            style={color ? { "--type": color } : undefined}
                        >

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
