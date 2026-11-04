import TypeBadge from "./TypeBadge";
import { sizeLabel } from "../lib/pokedex";


const UNKNOWN = "???";


function Unknown({ children = UNKNOWN }){

    return <span className="dex-unknown">{children}</span>;

}


function dexNumber(number){

    return number === null || number === undefined ? "#???" : `#${String(number).padStart(3, "0")}`;

}


// La ficha de un enemigo tal como la ven los jugadores: lo descubierto y
// "???" en lo demás. Recibe la vista pública (publicView en lib/pokedex.js),
// así que no puede enseñar nada oculto aunque quisiera. El panel la usa
// también como vista previa.
export default function DexCard({ entry, image }){

    const boss = entry.kind === "boss";

    return (

        <article className={`dex-card${boss ? " dex-card--boss" : ""}`}>

            <header className="dex-card__head">
                <span className="dex-card__number">{dexNumber(entry.number)}</span>
                <h3 className="dex-card__name">{entry.name ?? <Unknown />}</h3>
                <span className="dex-card__kind">{sizeLabel(entry.size)}</span>
            </header>

            <div className="dex-card__art">
                {image ? <img src={image} alt={entry.name ?? "Unknown enemy"} loading="lazy" /> : <span aria-hidden="true">?</span>}
            </div>

            <dl className="dex-card__facts">

                <dt>Types</dt>
                <dd className="dex-card__types">
                    {entry.types.length === 0 && <Unknown />}
                    {entry.types.map((type, i) => type ? <TypeBadge key={i} type={type} /> : <Unknown key={i} />)}
                </dd>

                {boss && (
                    <>
                        <dt>Hidden type</dt>
                        <dd className="dex-card__types">{entry.hiddenType ? <TypeBadge type={entry.hiddenType} /> : <Unknown />}</dd>
                    </>
                )}

                <dt>Ability</dt>
                <dd>
                    {entry.ability
                        ? <><strong>{entry.ability}</strong>{entry.abilityText && <span className="dex-card__note">{entry.abilityText}</span>}</>
                        : <Unknown />}
                </dd>

                <dt>Moves</dt>
                <dd>
                    {entry.moves.length === 0
                        ? <Unknown />
                        : (
                            <ol className="dex-card__moves">
                                {entry.moves.map((move, i) => <li key={i}>{move ?? <Unknown />}</li>)}
                            </ol>
                        )}
                </dd>

                <dt>Dungeon</dt>
                <dd>{entry.dungeons ? (entry.dungeons.length ? entry.dungeons.join(", ") : "—") : <Unknown />}</dd>

            </dl>

            <p className="dex-card__text">
                {entry.description ?? <Unknown>Not yet discovered.</Unknown>}
            </p>

        </article>

    );

}
