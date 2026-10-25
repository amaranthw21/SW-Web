import characters, { CHARACTER_STATUSES, islandsOf } from "../data/characters";
import islands from "../data/islands";
import { regionName } from "../data/region";
import EntryCard from "../components/EntryCard";
import { FilterBar, FilterSelect } from "../components/FilterBar";
import { CHARACTER_PLACEHOLDER } from "../lib/placeholders";
import labelOf from "../lib/labelOf";
import normalize from "../lib/normalize";
import useDocumentTitle from "../lib/useDocumentTitle";
import useFilters from "../lib/useFilters";


const FILTERS = ["q", "island", "status"];


// La página va en dos apartados: los NPCs y los personajes de jugadores. Hacen
// de filtro por tipo, así que ese desplegable ya no hace falta.
const SECTIONS = [
    { kind: "npc", title: "NPCs" },
    { kind: "player", title: "Characters" }
];

// Solo las islas que tienen algún personaje: un filtro que no devuelve nada
// no ayuda.
const ISLANDS = islands
    .filter(island => characters.some(character => islandsOf(character).includes(island.id)))
    .map(island => ({ value: island.id, label: island.name }));


function matches(character, { q, island, status }){

    const text = [character.name, character.fusionName, character.player, character.nameOrigin].join(" ");

    return (!q || normalize(text).includes(normalize(q)))
        && (!island || islandsOf(character).includes(island))
        && (!status || (character.kind === "player" && (character.status || "available") === status));

}


// La línea pequeña de cada tarjeta: qué es y, si es de jugador, si está libre.
function subtitleOf(character){

    if(character.kind === "player"){
        const status = labelOf(CHARACTER_STATUSES, character.status || "available");
        const player = character.player?.trim();
        return [status, player && `played by ${player}`].filter(Boolean).join(" · ");
    }

    const guarded = character.guardianOf
        .map(id => islands.find(entry => entry.id === id)?.name)
        .filter(Boolean);

    return guarded.length > 0 ? `Guardian of ${guarded.join(", ")}` : "NPC";

}


export default function Characters(){

    useDocumentTitle("Characters");

    const { values, set, clear, active } = useFilters(FILTERS);

    const shown = characters.filter(character => matches(character, values));

    return (

        <div>

            <h1 className="page-title">
                Characters
            </h1>

            <p className="page-intro">
                The NPCs of {regionName} and the characters players can take.
                Each one also shows up on its island's page.
            </p>

            <FilterBar
                search={values.q}
                onSearch={value => set("q", value)}
                placeholder="Search by name, fusion or player…"
                shown={shown.length}
                total={characters.length}
                active={active}
                onClear={clear}
            >

                <FilterSelect label="Island" value={values.island} options={ISLANDS} onChange={value => set("island", value)} />
                <FilterSelect label="Status" value={values.status} options={CHARACTER_STATUSES} onChange={value => set("status", value)} />

            </FilterBar>

            {
                shown.length === 0 && <p className="data-table__empty">No characters match these filters.</p>
            }

            {
                SECTIONS.map(section => {

                    const list = shown.filter(character => character.kind === section.kind);

                    // Un apartado que se queda vacío (por los filtros, o porque
                    // aún no hay ninguno) no sale.
                    if(list.length === 0){
                        return null;
                    }

                    return (
                        <section key={section.kind} className="characters-section">
                            <h2 className="characters-section__title">
                                {section.title}
                                <span className="characters-section__count">{list.length}</span>
                            </h2>
                            <div className="grid card-grid">
                                {list.map(character => (
                                    <EntryCard
                                        key={character.id}
                                        name={character.name}
                                        subtitle={subtitleOf(character)}
                                        image={character.image}
                                        link={`/characters/${character.id}`}
                                        fallbackImage={CHARACTER_PLACEHOLDER}
                                    />
                                ))}
                            </div>
                        </section>
                    );

                })
            }

        </div>

    );

}
