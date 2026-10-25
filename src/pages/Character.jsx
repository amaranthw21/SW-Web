import { Link, useParams } from "react-router-dom";

import characters, { CHARACTER_STATUSES, KINDS } from "../data/characters";
import islands from "../data/islands";
import pokemon from "../data/pokemon";
import ContentBlock from "../components/ContentBlock";
import ContentToc from "../components/ContentToc";
import Paragraphs from "../components/Paragraphs";
import TypeBadge from "../components/TypeBadge";
import NotFound from "./NotFound";
import asset from "../lib/asset";
import labelOf from "../lib/labelOf";
import { CHARACTER_PLACEHOLDER } from "../lib/placeholders";
import useDocumentTitle from "../lib/useDocumentTitle";
import usePageAccent from "../lib/usePageAccent";
import withBlockIds from "../lib/blocks";


// Las listas del panel llegan con filas a medio rellenar: fuera las vacías.
function filled(list){

    return (list ?? []).filter(item => typeof item === "string" ? item.trim() : item?.name?.trim());

}


// Las especies se eligen de la lista de Pokémon (se guarda su id, "necrozma"),
// así que de allí salen el nombre y la imagen. Un id que ya no existe se salta.
function speciesOf(character){

    return [character.species1, character.species2]
        .filter(Boolean)
        .map(id => pokemon.find(entry => entry.id === id))
        .filter(Boolean);

}


function Tags({ items }){

    return (
        <ul className="character-tags">
            {items.map(item => <li key={item}>{item}</li>)}
        </ul>
    );

}


function Personality({ character }){

    const traits = filled(character.traits);

    const lists = [
        { title: "Likes", items: filled(character.likes) },
        { title: "Dislikes", items: filled(character.dislikes) },
        { title: "Fears / phobias", items: filled(character.fears) }
    ].filter(list => list.items.length > 0);

    return (

        <>

            {traits.length > 0 && <Tags items={traits} />}

            {
                lists.length > 0 && (
                    <div className="character-lists">
                        {lists.map(list => (
                            <div key={list.title}>
                                <h3 className="block-part__title">{list.title}</h3>
                                <ul className="paragraph-list">
                                    {list.items.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                )
            }

            {
                character.personality?.trim() && (
                    <Paragraphs text={character.personality} className="country-block__text" />
                )
            }

        </>

    );

}


function AbilitiesAndMoves({ abilities, moves }){

    return (

        <>

            {
                abilities.length > 0 && (
                    <div className="character-abilities">
                        {abilities.map(ability => (
                            <div key={`${ability.slot}-${ability.name}`} className="character-ability">
                                {ability.slot?.trim() && <p className="character-ability__slot">{ability.slot}</p>}
                                <p className="character-ability__name">{ability.name}</p>
                                <Paragraphs text={ability.description} className="character-ability__text" />
                            </div>
                        ))}
                    </div>
                )
            }

            {
                moves.length > 0 && (
                    <>
                        <h3 className="block-part__title">Moves</h3>
                        <ul className="character-moves">
                            {moves.map(move => (
                                <li key={move.name} className="character-move">
                                    <div className="character-move__head">
                                        <span className="character-move__name">{move.name}</span>
                                        {move.category && (
                                            <span className={`character-move__cat character-move__cat--${move.category.toLowerCase()}`}>
                                                {move.category}
                                            </span>
                                        )}
                                        {move.type && <TypeBadge type={move.type} />}
                                        {move.pp != null && <span className="character-move__pp">{move.pp} PP</span>}
                                    </div>
                                    <Paragraphs text={move.description} className="character-move__text" />
                                </li>
                            ))}
                        </ul>
                    </>
                )
            }

        </>

    );

}


function Gallery({ items }){

    return (
        <div className="character-gallery">
            {items.map((item, i) => (
                <figure key={i} className="character-gallery__item">
                    {/* Abre la imagen entera en otra pestaña: aquí se ve recortada. */}
                    <a href={asset(item.image)} target="_blank" rel="noreferrer">
                        <img src={asset(item.image)} alt="" loading="lazy" />
                    </a>
                    {item.credit?.trim() && <figcaption>{item.credit}</figcaption>}
                </figure>
            ))}
        </div>
    );

}


// Las secciones de la ficha, en el orden del documento de personaje. Una que
// esté vacía no sale, ni en la página ni en el índice.
function characterBlocks(character){

    const blocks = [];

    const hasPersonality = filled(character.traits).length || filled(character.likes).length
        || filled(character.dislikes).length || filled(character.fears).length
        || character.personality?.trim();

    if(hasPersonality){
        blocks.push({
            title: "Personality",
            parts: [{ type: "node", node: <Personality character={character} /> }]
        });
    }

    const abilities = filled(character.abilities);
    const moves = filled(character.moves);

    if(abilities.length || moves.length){
        blocks.push({
            title: "Abilities & Moves",
            parts: [{ type: "node", node: <AbilitiesAndMoves abilities={abilities} moves={moves} /> }]
        });
    }

    // La historia respeta los saltos de línea: a veces va en verso.
    if(character.backstory?.trim()){
        blocks.push({
            title: "Backstory",
            parts: [{ type: "node", node: <Paragraphs text={character.backstory} className="country-block__text" lineBreaks /> }]
        });
    }

    if(character.gallery.length > 0){
        blocks.push({
            title: "Appearance",
            parts: [{ type: "node", node: <Gallery items={character.gallery} /> }]
        });
    }

    return withBlockIds(blocks);

}


function Infobox({ character, island, species }){

    const types = [character.type1, character.type2].filter(type => type?.trim());
    const status = character.kind === "player" && character.status && character.status !== "available"
        ? labelOf(CHARACTER_STATUSES, character.status)
        : "";

    const rows = [
        ["Name", character.name && (
            <>
                {character.name}
                {character.nameOrigin?.trim() && <span className="character-origin">{character.nameOrigin}</span>}
            </>
        )],
        ["Kind", labelOf(KINDS, character.kind)],
        ["Status", status && [status, character.player?.trim() && `played by ${character.player.trim()}`].filter(Boolean).join(", ")],
        ["Gender", character.gender?.trim()],
        ["Age", character.age?.toString().trim()],
        ["Fusion", character.fusionName?.trim()],
        ["Species", species.length > 0 && (
            <ul className="character-species">
                {species.map(entry => (
                    <li key={entry.id}>
                        <Link to={`/pokemon?q=${encodeURIComponent(entry.name)}`}>
                            {entry.image && <img src={asset(entry.image)} alt="" loading="lazy" />}
                            {[entry.name, entry.form].filter(part => part?.trim()).join(" ")}
                        </Link>
                    </li>
                ))}
            </ul>
        )],
        ["Type", types.length > 0 && <span className="type-badges">{types.map(type => <TypeBadge key={type} type={type} />)}</span>],
        ["Hidden type", character.hiddenType?.trim() && <TypeBadge type={character.hiddenType} />],
        [character.guardian ? "Guardian of" : "Island", island && (
            island.underConstruction
                ? island.name
                : <Link to={`/bethath/${island.id}`}>{island.name}</Link>
        )]
    ].filter(([, value]) => value);

    return (

        <aside className="infobox">

            <h2 className="infobox__title">{character.name}</h2>

            <img
                className="infobox__flag character-portrait"
                src={asset(character.image?.trim() || CHARACTER_PLACEHOLDER)}
                alt=""
                onError={e => { e.currentTarget.src = asset(CHARACTER_PLACEHOLDER); }}
            />

            {character.image && character.imageCredit?.trim() && (
                <p className="character-credit">{character.imageCredit}</p>
            )}

            <table className="infobox__table">
                <tbody>
                    {rows.map(([label, value]) => (
                        <tr key={label}>
                            <th scope="row">{label}</th>
                            <td>{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </aside>

    );

}


// La ficha de un personaje: el infobox con lo básico y debajo sus secciones.
export default function Character(){

    const { characterId } = useParams();

    const character = characters.find(entry => entry.id === characterId);
    const island = islands.find(entry => entry.id === character?.island);

    useDocumentTitle(character?.name ?? "Character not found");

    // Como en las islas: la página toma el fondo y el color de su isla, para
    // que se note de dónde es.
    usePageAccent(
        island ? island.background?.trim() || island.image : undefined,
        island?.color?.trim() || undefined
    );

    if(!character){
        return <NotFound title="Character not found" />;
    }

    const species = speciesOf(character);
    const blocks = characterBlocks(character);

    // La línea bajo el título: fusión, especies e isla, lo que lo sitúa de un
    // vistazo. Lo que falte se omite.
    const tagline = [
        character.fusionName?.trim(),
        species.map(entry => entry.name).join(" × "),
        island && (character.guardian ? `Guardian of ${island.name}` : island.name)
    ].filter(Boolean).join(" · ");

    return (

        <div>

            <nav className="breadcrumb">
                <Link to="/characters">Characters</Link>
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{character.name}</span>
            </nav>

            <h1 className="page-title">
                {character.name}
                <span className={`character-kind character-kind--${character.kind}`}>{labelOf(KINDS, character.kind)}</span>
            </h1>

            <div className="country-layout">

                <div className="country-layout__top">

                    {tagline && <p className="character-tagline">{tagline}</p>}

                    {character.summary?.trim() && (
                        <Paragraphs text={character.summary} className="detail-intro" />
                    )}

                    <ContentToc sections={blocks} />

                </div>

                <Infobox character={character} island={island} species={species} />

            </div>

            <div className="country-body">
                {blocks.map(block => <ContentBlock key={block.id} block={block} />)}
            </div>

        </div>

    );

}
