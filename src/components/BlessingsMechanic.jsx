import { Link, useSearchParams } from "react-router-dom";
import Paragraphs from "./Paragraphs";
import mechanicBlessings, { mechanicBlessingsIntro } from "../data/mechanicBlessings";
import asset from "../lib/asset";


// El encuadre del dibujo del objeto, ajustable desde el panel: zoom y cuánto se
// mueve hacia los lados y en vertical (en % de su tamaño). Sale centrado por
// defecto; esto es para los dibujos que no lo están.
function iconFraming(blessing){

    const number = (value, fallback) => (Number.isFinite(Number(value)) && value !== "" && value !== null ? Number(value) : fallback);

    return {
        "--icon-zoom": number(blessing.iconZoom, 1),
        "--icon-x": `${number(blessing.iconX, 0)}%`,
        "--icon-y": `${number(blessing.iconY, 0)}%`
    };

}


// El dibujo de la bendición en los botones y en la cabecera: el del objeto, y
// si aún no tiene, la inicial en un rombo.
function Sigil({ blessing, size }){

    const image = blessing.item?.image?.trim();

    return (

        <span className={`blessing-sigil blessing-sigil--${size}`} style={iconFraming(blessing)} aria-hidden="true">
            {
                image
                    ? <img src={asset(image)} alt="" loading="lazy" />
                    : <span className="blessing-sigil__letter">{blessing.name.charAt(0)}</span>
            }
        </span>

    );

}


// El símbolo de una etapa, a la derecha: el que se suba en el panel o, mientras
// no haya, un rombo con el número de la etapa.
function StageEmblem({ stage, index }){

    return (

        <span className="blessing-stage__emblem">
            {
                stage.symbol?.trim()
                    ? <img src={asset(stage.symbol)} alt="" loading="lazy" />
                    : <span className="blessing-stage__numeral"><span>{index + 1}</span></span>
            }
        </span>

    );

}


function BlessingDetail({ blessing }){

    return (

        <article className="blessing-detail">

            <header className="blessing-detail__head">

                <Sigil blessing={blessing} size="large" />

                <div>
                    <h2 className="blessing-detail__name">{blessing.name}</h2>
                    {blessing.summary?.trim() && <Paragraphs text={blessing.summary} />}
                </div>

            </header>


            <div className="blessing-detail__links">

                <div className="blessing-link">
                    <span className="blessing-link__label">Granted by</span>
                    {
                        blessing.npc
                            ? (
                                <Link className="blessing-link__body" to={`/characters/${blessing.npc.id}`}>
                                    <span className="blessing-link__portrait">
                                        {blessing.npc.thumb && <img src={blessing.npc.thumb} alt="" loading="lazy" />}
                                    </span>
                                    {blessing.npc.name}
                                </Link>
                            )
                            : <span className="blessing-link__body blessing-link__body--empty">Unknown</span>
                    }
                </div>

                <div className="blessing-link">
                    <span className="blessing-link__label">Related item</span>
                    {
                        blessing.item
                            ? (
                                <Link className="blessing-link__body" to="/items/blessings">
                                    <span className="blessing-link__portrait blessing-link__portrait--item" style={iconFraming(blessing)}>
                                        {blessing.item.image?.trim() && <img src={asset(blessing.item.image)} alt="" loading="lazy" />}
                                    </span>
                                    {blessing.item.name}
                                </Link>
                            )
                            : <span className="blessing-link__body blessing-link__body--empty">None</span>
                    }
                </div>

            </div>


            {
                blessing.howToGet?.trim() && (
                    <section className="blessing-detail__section">
                        <h3 className="blessing-detail__heading">How to get it</h3>
                        <Paragraphs text={blessing.howToGet} />
                    </section>
                )
            }


            <section className="blessing-detail__section">

                <h3 className="blessing-detail__heading">Stages</h3>

                {
                    blessing.stages.length > 0
                        ? (
                            <ol className="blessing-stages">
                                {
                                    blessing.stages.map((stage, index) => (

                                        <li key={index} className="blessing-stage">

                                            <div className="blessing-stage__body">
                                                <h4 className="blessing-stage__title">
                                                    {stage.title?.trim() || `Stage ${index + 1}`}
                                                </h4>
                                                {
                                                    stage.text?.trim()
                                                        ? <Paragraphs text={stage.text} />
                                                        : <p className="blessing-stage__empty">Nothing has been written here yet.</p>
                                                }
                                            </div>

                                            <StageEmblem stage={stage} index={index} />

                                        </li>

                                    ))
                                }
                            </ol>
                        )
                        : <p className="blessing-stage__empty">Nothing has been written here yet.</p>
                }

            </section>

        </article>

    );

}


// Las bendiciones de Mechanics: un botón por bendición, con su objeto y su NPC
// debajo del nombre, y al pulsarlo su ficha con las etapas. La elegida va en
// la dirección (?blessing=tidal-blessing), igual que los apartados.
export default function BlessingsMechanic(){

    const [params, setParams] = useSearchParams();
    const current = mechanicBlessings.find(blessing => blessing.id === params.get("blessing"));


    if(mechanicBlessings.length === 0){

        return <p className="section-tabs__hint">Nothing has been written here yet.</p>;

    }


    return (

        <div className="blessings-mechanic">

            {
                mechanicBlessingsIntro.trim() && (
                    <div className="page-intro">
                        <Paragraphs text={mechanicBlessingsIntro} />
                    </div>
                )
            }

            <div className="blessing-picker" role="group" aria-label="Blessings">
                {
                    mechanicBlessings.map(blessing => (

                        <button
                            key={blessing.id}
                            type="button"
                            className={`blessing-tile${blessing === current ? " blessing-tile--on" : ""}`}
                            style={blessing.color ? { "--blessing": blessing.color } : undefined}
                            aria-pressed={blessing === current}
                            onClick={() => setParams({ blessing: blessing.id }, { preventScrollReset: true })}
                        >
                            <Sigil blessing={blessing} size="small" />
                            <span className="blessing-tile__text">
                                <span className="blessing-tile__name">{blessing.name.replace(/\s+Blessing$/i, "")}</span>
                                {blessing.npc && <span className="blessing-tile__npc">{blessing.npc.name}</span>}
                            </span>
                        </button>

                    ))
                }
            </div>

            {
                current
                    ? (
                        <div style={current.color ? { "--blessing": current.color } : undefined}>
                            <BlessingDetail key={current.id} blessing={current} />
                        </div>
                    )
                    : <p className="section-tabs__hint">Pick a blessing to see its stages.</p>
            }

        </div>

    );

}
