import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import characters, { CHARACTER_STATUSES, KINDS } from "../data/characters";
import islands from "../data/islands";
import pokemon from "../data/pokemon";
import ContentBlock from "../components/ContentBlock";
import ContentToc from "../components/ContentToc";
import Lightbox from "../components/Lightbox";
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


// "A", "A & B", "A, B & C".
function joinNames(names){

    return names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names.join("");

}


// Una isla en construcción aún no tiene página: se nombra sin enlace.
function IslandLink({ island }){

    return island.underConstruction
        ? island.name
        : <Link to={`/bethath/${island.id}`}>{island.name}</Link>;

}


// Un personaje puede ser varios en un cuerpo (Malaya y Bailey): cada identidad
// lleva su nombre, su color y su parte de la personalidad. Sin color propio
// toma uno de estos, por orden.
const IDENTITY_COLORS = ["#7dd3fc", "#f0abfc", "#86efac", "#fdba74"];

function identitiesOf(character){

    return filled(character.identities).map((identity, i) => ({
        ...identity,
        name: identity.name.trim(),
        color: identity.color?.trim() || IDENTITY_COLORS[i % IDENTITY_COLORS.length]
    }));

}


// De quién es una entrada, si se dice entre paréntesis al final del título:
// "Cooking (Malaya): …", "Forced inactivity (Both): …", "Claustrophobia
// (Bailey)". Solo cuenta si nombra a una de sus identidades o a todas ("Both",
// "All"); otro paréntesis ("Fear (of the dark)") se queda como está.
const WHO = /^(.*?)\s*\(\s*([^()]+?)\s*\)$/;
const EVERYONE = ["both", "all", "everyone"];

function whoOf(term, identities){

    const match = identities.length > 0 && term.match(WHO);
    const who = match && match[2].toLowerCase();

    if(!who){
        return { term, who: null };
    }

    if(EVERYONE.includes(who)){
        return { term: match[1], who: { name: match[2], color: null } };
    }

    const identity = identities.find(entry => entry.name.toLowerCase() === who);

    return identity ? { term: match[1], who: identity } : { term, who: null };

}


function WhoTag({ who }){

    return (
        <span
            className={`character-who${who.color ? "" : " character-who--all"}`}
            style={who.color ? { "--identity": who.color } : undefined}
        >
            {who.name}
        </span>
    );

}


function Tags({ items }){

    return (
        <ul className="character-tags">
            {items.map(item => <li key={item}>{item}</li>)}
        </ul>
    );

}


// Muchas entradas de gustos y miedos van como "Título: explicación"
// ("Company: Stralende likes the presence…"). Se parte por los primeros dos
// puntos solo si lo de delante es corto, como un título: "Note: see below" sí,
// una frase larga que lleve dos puntos por el medio no.
const TERM = /^([^:]{1,40}):\s+(\S[\s\S]*)$/;

function splitEntry(item, identities){

    const match = item.match(TERM);

    if(!match){
        return { term: "", text: item, who: whoOf(item, identities).who };
    }

    return { ...whoOf(match[1].trim(), identities), text: match[2].trim() };

}


// Una lista "de explicar" (con títulos o con frases largas) no cabe en una
// columna estrecha: va a todo el ancho, con cada entrada en su tarjeta. Las de
// dos o tres palabras ("Sunny days") se quedan en columnas, que es lo que
// mejor les sienta.
function isDetailed(items){

    return items.some(item => TERM.test(item) || item.length > 60);

}


function DetailedList({ title, items, identities }){

    return (
        <div className="character-notes">
            <h3 className="block-part__title">{title}</h3>
            <ul className="character-notes__list">
                {items.map(item => {
                    const { term, text, who } = splitEntry(item, identities);
                    return (
                        <li key={item} className="character-note" style={who?.color ? { "--identity": who.color } : undefined}>
                            {(term || who) && (
                                <span className="character-note__head">
                                    {term && <strong className="character-note__term">{term}</strong>}
                                    {who && <WhoTag who={who} />}
                                </span>
                            )}
                            <span className="character-note__text">{text}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );

}


// La parte de la personalidad de cada identidad, una tarjeta por cabeza con su
// nombre en su color.
function IdentityProfiles({ identities }){

    const described = identities.filter(identity => identity.personality?.trim());

    return described.length > 0 && (
        <div className="character-identities">
            {described.map(identity => (
                <section key={identity.name} className="character-identity" style={{ "--identity": identity.color }}>
                    <h3 className="character-identity__name">{identity.name}</h3>
                    <Paragraphs text={identity.personality} className="country-block__text" />
                </section>
            ))}
        </div>
    );

}


function Personality({ character, identities }){

    const traits = filled(character.traits);

    const lists = [
        { title: "Likes", items: filled(character.likes) },
        { title: "Dislikes", items: filled(character.dislikes) },
        { title: "Fears / phobias", items: filled(character.fears) }
    ].filter(list => list.items.length > 0);

    const compact = lists.filter(list => !isDetailed(list.items));
    const detailed = lists.filter(list => isDetailed(list.items));

    return (

        <>

            {traits.length > 0 && <Tags items={traits} />}

            {
                compact.length > 0 && (
                    <div className="character-lists">
                        {compact.map(list => (
                            <div key={list.title}>
                                <h3 className="block-part__title">{list.title}</h3>
                                <ul className="paragraph-list">
                                    {list.items.map(item => {
                                        const { term, who } = whoOf(item, identities);
                                        return <li key={item}>{term}{who && <> <WhoTag who={who} /></>}</li>;
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                )
            }

            {detailed.map(list => <DetailedList key={list.title} title={list.title} items={list.items} identities={identities} />)}

            {
                character.personality?.trim() && (
                    <Paragraphs text={character.personality} className="country-block__text" />
                )
            }

            <IdentityProfiles identities={identities} />

        </>

    );

}


function LockIcon(){

    return (
        <svg className="character-flag__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
    );

}


// Las etiquetas opcionales que comparten habilidades y movimientos. Legendary y
// Custom solo las tienen los movimientos, pero no estorba mirarlas igual.
function Flags({ entry }){

    return (
        <>
            {entry.locked && <span className="character-flag character-flag--locked"><LockIcon />Locked</span>}
            {entry.item && <span className="character-flag character-flag--item">Item</span>}
            {entry.legendary && <span className="character-flag character-flag--legendary">Legendary</span>}
            {entry.custom && <span className="character-flag character-flag--custom">Custom</span>}
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
                            <div key={`${ability.slot}-${ability.name}`} className={`character-ability${ability.locked ? " is-locked" : ""}`}>
                                <div className="character-ability__head">
                                    {ability.slot?.trim() && <p className="character-ability__slot">{ability.slot}</p>}
                                    <p className="character-ability__name">{ability.name}</p>
                                    {(ability.locked || ability.item) && (
                                        <span className="character-ability__flags"><Flags entry={ability} /></span>
                                    )}
                                </div>
                                <div className="character-ability__body">
                                    <Paragraphs text={ability.description} className="character-ability__text" />
                                </div>
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
                                <li key={move.name} className={`character-move${move.locked ? " is-locked" : ""}`}>
                                    {/* Una columna, tres filas: nombre, datos (categoría,
                                        tipo, PP) y descripción. */}
                                    <span className="character-move__name">{move.name}</span>
                                    <span className="character-move__tags">
                                        {move.category && (
                                            <span className={`character-move__cat character-move__cat--${move.category.toLowerCase()}`}>
                                                {move.category}
                                            </span>
                                        )}
                                        {move.type && <TypeBadge type={move.type} />}
                                        {move.pp != null && <span className="character-move__pp">{move.pp} PP</span>}
                                        <Flags entry={move} />
                                    </span>
                                    <div className="character-move__body">
                                        <Paragraphs text={move.description} className="character-move__text" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )
            }

        </>

    );

}


function Gallery({ items, onOpen }){

    return (
        <div className="character-gallery">
            {items.map((item, i) => (
                <figure key={i} className="character-gallery__item">
                    {/* Aquí se ve recortada; al pulsarla se abre entera en el visor. */}
                    <button type="button" className="zoomable" onClick={() => onOpen(i)} aria-label={`View picture ${i + 1} larger`}>
                        <img src={asset(item.image)} alt="" loading="lazy" />
                    </button>
                    {item.credit?.trim() && <figcaption>{item.credit}</figcaption>}
                </figure>
            ))}
        </div>
    );

}


// Las secciones de la ficha, en el orden del documento de personaje. Una que
// esté vacía no sale, ni en la página ni en el índice.
function characterBlocks(character, identities, openImage){

    const blocks = [];

    const hasPersonality = filled(character.traits).length || filled(character.likes).length
        || filled(character.dislikes).length || filled(character.fears).length
        || character.personality?.trim() || identities.some(identity => identity.personality?.trim());

    if(hasPersonality){
        blocks.push({
            title: "Personality",
            parts: [{ type: "node", node: <Personality character={character} identities={identities} /> }]
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
            parts: [{ type: "node", node: <Gallery items={character.gallery} onOpen={openImage} /> }]
        });
    }

    return withBlockIds(blocks);

}


function Infobox({ character, identities, island, guarded, species, onOpenPortrait }){

    // Los Amalgama tienen un tercer tipo propio (y ningún tipo oculto).
    const types = [character.type1, character.type2, character.type3].filter(type => type?.trim());
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
        ["Identities", identities.length > 1 && (
            <span className="character-whos">{identities.map(identity => <WhoTag key={identity.name} who={identity} />)}</span>
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
        ["Guardian of", guarded.length > 0 && (
            <>
                {guarded.map(entry => (
                    <span key={entry.id} className="infobox__line"><IslandLink island={entry} /></span>
                ))}
            </>
        )],
        // Su isla, si no es ya una de las que guarda (no se repite).
        ["Island", island && !character.guardianOf.includes(island.id) && <IslandLink island={island} />]
    ].filter(([, value]) => value);

    return (

        <aside className="infobox">

            <h2 className="infobox__title">{character.name}</h2>

            {
                character.image?.trim()
                    ? (
                        <button type="button" className="zoomable character-portrait-button" onClick={onOpenPortrait} aria-label="View portrait larger">
                            <img
                                className="infobox__flag character-portrait"
                                src={asset(character.image)}
                                alt=""
                                onError={e => { e.currentTarget.src = asset(CHARACTER_PLACEHOLDER); }}
                            />
                        </button>
                    )
                    : <img className="infobox__flag character-portrait" src={asset(CHARACTER_PLACEHOLDER)} alt="" />
            }

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
    const guarded = (character?.guardianOf ?? [])
        .map(id => islands.find(entry => entry.id === id))
        .filter(Boolean);

    // Imagen abierta en el visor (null: cerrado). El retrato y la galería van en
    // el mismo visor, así se puede pasar de uno a otras con las flechas.
    const [viewing, setViewing] = useState(null);

    // De qué isla toma el fondo: la suya, o si no tiene, la primera que guarda.
    const home = island ?? guarded[0];

    useDocumentTitle(character?.name ?? "Character not found");

    // Como en las islas: la página toma el fondo y el color de su isla, para
    // que se note de dónde es.
    usePageAccent(
        home ? home.background?.trim() || home.image : undefined,
        home?.color?.trim() || undefined
    );

    if(!character){
        return <NotFound title="Character not found" />;
    }

    const species = speciesOf(character);
    const identities = identitiesOf(character);

    const pictures = [
        ...(character.image?.trim() ? [{ image: character.image, caption: character.imageCredit?.trim(), alt: character.name }] : []),
        ...character.gallery.map(item => ({ image: item.image, caption: item.credit?.trim(), alt: character.name }))
    ];
    const galleryStart = character.image?.trim() ? 1 : 0;

    const blocks = characterBlocks(character, identities, i => setViewing(galleryStart + i));

    // La línea bajo el título: fusión, especies e isla, lo que lo sitúa de un
    // vistazo. Lo que falte se omite.
    const tagline = [
        character.fusionName?.trim(),
        species.map(entry => entry.name).join(" × "),
        guarded.length > 0 ? `Guardian of ${joinNames(guarded.map(entry => entry.name))}` : island?.name
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

                <Infobox
                    character={character}
                    identities={identities}
                    island={island}
                    guarded={guarded}
                    species={species}
                    onOpenPortrait={() => setViewing(0)}
                />

            </div>

            <div className="country-body">
                {blocks.map(block => <ContentBlock key={block.id} block={block} />)}
            </div>

            <Lightbox items={pictures} index={viewing} onClose={() => setViewing(null)} onChange={setViewing} />

        </div>

    );

}
