import pokemon, {
    STATUSES,
    LINE_STATUSES,
    STAGES,
    CLASSIFICATIONS,
    GENERATIONS,
    TYPES
} from "../data/pokemon";
import { FilterBar, FilterSelect } from "../components/FilterBar";
import useFilters from "../lib/useFilters";
import labelOf from "../lib/labelOf";
import normalize from "../lib/normalize";
import useDocumentTitle from "../lib/useDocumentTitle";
import asset from "../lib/asset";


const FILTERS = ["q", "status", "type", "gen", "line", "stage", "class", "claimed", "origin"];

const CLAIMED = [
    { value: "claimed", label: "Claimed" },
    { value: "npc",     label: "NPC" },
    { value: "free",    label: "Unclaimed" }
];

const ORIGINS = [
    { value: "official", label: "Official" },
    { value: "fakemon",  label: "Fakemon" }
];


function matches(entry, filters){

    const { q, status, type, gen, line, stage, claimed, origin } = filters;

    if(q && !normalize(`${entry.name} ${entry.form} ${entry.fusedWith}`).includes(normalize(q))){
        return false;
    }

    if(type && entry.type1 !== type && entry.type2 !== type){
        return false;
    }

    if(claimed === "claimed" && !entry.claimed) return false;
    if(claimed === "npc" && !entry.npc) return false;
    if(claimed === "free" && entry.claimed) return false;

    if(origin && (origin === "fakemon") !== Boolean(entry.fakemon)){
        return false;
    }

    return (!status || entry.status === status)
        && (!gen || String(entry.generation) === gen)
        && (!line || entry.lineStatus === line)
        && (!stage || entry.stage === stage)
        && (!filters.class || entry.classification === filters.class);

}


function TypeBadge({ type }){

    const color = TYPES.find(option => option.value === type)?.color;

    return (

        <span
            className="type-badge"
            style={color ? { "--type": color } : undefined}
        >

            <img
                src={asset(`/types/${type.toLowerCase()}.webp`)}
                alt=""
                loading="lazy"
                onError={e => { e.currentTarget.style.display = "none"; }}
            />

            {type}

        </span>

    );

}


function StatusBadge({ status }){

    const tone = STATUSES.find(option => option.value === status)?.tone ?? "pending";

    return (

        <span className={`status-badge status-badge--${tone}`}>
            {labelOf(STATUSES, status)}
        </span>

    );

}


// El número del Excel. Los Fakemon cuentan hacia abajo (-1, -2...) para no
// chocar con los oficiales; aquí se leen como F1, F2...
function number(entry){

    return entry.fakemon ? `F${Math.abs(entry.order)}` : entry.order;

}


// Quién lo tiene no se publica (el repo es público): solo si está reclamado y
// si es de un NPC.
function claimLabel(entry){

    if(entry.npc){
        return "NPC";
    }

    return entry.claimed ? "Claimed" : "—";

}


export default function Pokemon(){

    useDocumentTitle("Pokémon");

    const { values, set, clear, active } = useFilters(FILTERS);

    const shown = pokemon.filter(entry => matches(entry, values));


    return (

        <div>

            <h1 className="page-title">
                Pokémon
            </h1>

            <p className="page-intro">
                Every Pokémon on the server and whether it can still be picked.
                Forms sit right after their base Pokémon.
            </p>


            <FilterBar
                search={values.q}
                onSearch={value => set("q", value)}
                placeholder="Search by name, form or fusion…"
                shown={shown.length}
                total={pokemon.length}
                active={active}
                onClear={clear}
            >

                <FilterSelect label="Status" value={values.status} options={STATUSES} onChange={value => set("status", value)} />
                <FilterSelect label="Type" value={values.type} options={TYPES} onChange={value => set("type", value)} />
                <FilterSelect label="Generation" value={values.gen} options={GENERATIONS} onChange={value => set("gen", value)} />
                <FilterSelect label="Line status" value={values.line} options={LINE_STATUSES} onChange={value => set("line", value)} />
                <FilterSelect label="Stage" value={values.stage} options={STAGES} onChange={value => set("stage", value)} />
                <FilterSelect label="Classification" value={values.class} options={CLASSIFICATIONS} onChange={value => set("class", value)} />
                <FilterSelect label="Claimed" value={values.claimed} options={CLAIMED} onChange={value => set("claimed", value)} />
                <FilterSelect label="Origin" value={values.origin} options={ORIGINS} onChange={value => set("origin", value)} />

            </FilterBar>


            {
                shown.length === 0
                    ? <p className="data-table__empty">No Pokémon match these filters.</p>
                    : (

                        <div className="data-table-wrap">

                            <table className="data-table data-table--pokemon">

                                <thead>
                                    <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">Pokémon</th>
                                        <th scope="col">Type</th>
                                        <th scope="col">Gen</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Claimed</th>
                                        <th scope="col">Line status</th>
                                        <th scope="col">Stage</th>
                                        <th scope="col">Classification</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {
                                        shown.map(entry => (

                                            <tr key={entry.id}>

                                                <td className="data-table__num" data-label="#">
                                                    {number(entry)}
                                                </td>

                                                <td className="data-table__main">

                                                    <div className="data-table__entry">

                                                        <span className="data-table__sprite">
                                                            {
                                                                entry.image && (
                                                                    <img
                                                                        src={asset(entry.image)}
                                                                        alt=""
                                                                        loading="lazy"
                                                                        width="56"
                                                                        height="56"
                                                                    />
                                                                )
                                                            }
                                                        </span>

                                                        <div>

                                                            <div className="data-table__name">
                                                                {/* En la versión tarjeta la columna # se esconde y el número va aquí. */}
                                                                <span className="data-table__inline-num">#{number(entry)}</span>
                                                                {entry.name}
                                                                {entry.fakemon && <span className="data-table__tag">Fakemon</span>}
                                                            </div>

                                                            {entry.form && <div className="data-table__sub">{entry.form}</div>}

                                                            {
                                                                entry.fusedWith && (
                                                                    <div className="data-table__sub">
                                                                        Fused with {entry.fusedWith}
                                                                    </div>
                                                                )
                                                            }

                                                            {
                                                                entry.creator && (
                                                                    <div className="data-table__sub">
                                                                        By {entry.creator}
                                                                    </div>
                                                                )
                                                            }

                                                        </div>

                                                    </div>

                                                </td>

                                                <td data-label="Type">
                                                    <div className="type-badges">
                                                        {entry.type1 && <TypeBadge type={entry.type1} />}
                                                        {entry.type2 && <TypeBadge type={entry.type2} />}
                                                    </div>
                                                </td>

                                                <td data-label="Gen">
                                                    {entry.generation ?? "—"}
                                                </td>

                                                <td data-label="Status">
                                                    <StatusBadge status={entry.status} />
                                                </td>

                                                <td data-label="Claimed">
                                                    {claimLabel(entry)}
                                                </td>

                                                <td data-label="Line status">
                                                    {labelOf(LINE_STATUSES, entry.lineStatus)}
                                                </td>

                                                <td data-label="Stage">
                                                    {labelOf(STAGES, entry.stage)}
                                                </td>

                                                <td data-label="Classification">
                                                    {labelOf(CLASSIFICATIONS, entry.classification) || "—"}
                                                </td>

                                            </tr>

                                        ))
                                    }

                                </tbody>

                            </table>

                        </div>

                    )
            }

        </div>

    );

}
