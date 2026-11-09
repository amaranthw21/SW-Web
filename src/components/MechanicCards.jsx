import { Link } from "react-router-dom";
import Paragraphs from "./Paragraphs";
import TypeBadge from "./TypeBadge";
import islands from "../data/islands";
import { TYPES } from "../data/types";
import asset from "../lib/asset";


const colorOf = type => TYPES.find(option => option.value === type)?.color;


function TypeIcon({ type }){

    return (
        <img
            src={asset(`/types/${type.toLowerCase()}.webp`)}
            alt=""
            loading="lazy"
            onError={e => { e.currentTarget.style.display = "none"; }}
        />
    );

}


// Las líneas de tipos de una fila: a los que favorece y a los que perjudica.
function TypeLine({ label, types, tone }){

    if(!types?.length){

        return null;

    }

    return (

        <div className={`mechanic-row__types mechanic-row__types--${tone}`}>
            <span className="mechanic-row__label">{label}</span>
            <span className="mechanic-row__badges">
                {types.map(type => <TypeBadge key={type} type={type} />)}
            </span>
        </div>

    );

}


// Una tarjeta en fila (Weather & Terrain): la imagen a la izquierda y la
// información a la derecha. Arriba su origen (Canon, Server) y su restricción
// (Only Groudon), luego los tipos a los que favorece y perjudica, y los efectos.
function MechanicRow({ card }){

    const favours = card.favours ?? [];
    const lead = favours[0] ?? card.hinders?.[0];
    const color = colorOf(card.type) ?? colorOf(lead);
    const image = card.image?.trim();

    return (

        <article className="mechanic-row" style={color ? { "--type": color } : undefined}>

            <div className="mechanic-row__media" aria-hidden="true">
                {
                    image
                        ? <img src={asset(image)} alt="" loading="lazy" style={card.imagePosition ? { objectPosition: card.imagePosition } : undefined} />
                        : (
                            <span className="mechanic-row__placeholder">
                                {
                                    card.type || lead
                                        ? <TypeIcon type={card.type || lead} />
                                        : (card.title?.trim() ?? "?").charAt(0)
                                }
                            </span>
                        )
                }
            </div>

            <div className="mechanic-row__body">

                {
                    (card.origin || card.restriction?.trim()) && (
                        <div className="mechanic-row__tags">
                            {card.origin && <span className={`mechanic-row__tag mechanic-row__tag--${card.origin.toLowerCase()}`}>{card.origin}</span>}
                            {card.restriction?.trim() && <span className="mechanic-row__tag mechanic-row__tag--only">{card.restriction}</span>}
                        </div>
                    )
                }

                <h3 className="mechanic-row__title">{card.title?.trim() || card.type}</h3>

                <TypeLine label="Favours" types={favours} tone="up" />
                <TypeLine label="Hinders" types={card.hinders} tone="down" />

                {
                    card.text?.trim()
                        ? <div className="mechanic-row__text"><Paragraphs text={card.text} /></div>
                        : <p className="mechanic-card__empty">Nothing has been written here yet.</p>
                }

            </div>

        </article>

    );

}


// Las tarjetas de una mecánica. Sueltas (Common Abilities, Commonfolk Perks)
// van en rejilla: si llevan tipo salen con su símbolo y su color, y si llevan
// isla con la imagen de la isla arriba y un enlace a su página.
//
// Dentro de un apartado (`rows`, Weather & Terrain) van una debajo de otra, con
// la imagen al lado y los tipos a los que afecta.
export default function MechanicCards({ cards, rows = false }){

    const list = (cards ?? []).filter(card => card?.title?.trim() || card?.type);

    if(list.length === 0){

        return null;

    }


    if(rows){

        return (
            <div className="mechanic-rows">
                {list.map((card, i) => <MechanicRow key={i} card={card} />)}
            </div>
        );

    }


    return (

        <div className="mechanic-cards">

            {
                list.map((card, i) => {

                    const color = colorOf(card.type);
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
                                            <TypeIcon type={card.type} />
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
