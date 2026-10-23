import { Link } from "react-router-dom";
import belongings, { isPending } from "../data/belongings";
import RARITIES from "../data/rarities";
import { FilterBar, FilterSelect } from "../components/FilterBar";
import { ItemEntry, Rarity } from "../components/ItemParts";
import useFilters from "../lib/useFilters";
import labelOf from "../lib/labelOf";
import normalize from "../lib/normalize";
import useDocumentTitle from "../lib/useDocumentTitle";


const FILTERS = ["q", "rarity", "state"];

const STATES = [
    { value: "written", label: "Written" },
    { value: "pending", label: "To be developed" }
];


function matches(belonging, { q, rarity, state }){

    if(q && !normalize(`${belonging.name} ${belonging.pokemon} ${belonging.description}`).includes(normalize(q))){
        return false;
    }

    if(state && (state === "pending") !== isPending(belonging)){
        return false;
    }

    return !rarity || belonging.rarity === rarity;

}


export default function Belongings(){

    useDocumentTitle("Special belongings");

    const { values, set, clear, active } = useFilters(FILTERS);

    const shown = belongings.filter(belonging => matches(belonging, values));


    return (

        <div>

            <h1 className="page-title">
                Special belongings
            </h1>

            <p className="page-intro">
                Objects tied to a specific Pokémon. They can't be bought or sold.
                The rest are on the <Link to="/items/list">item list</Link>.
            </p>


            <FilterBar
                search={values.q}
                onSearch={value => set("q", value)}
                placeholder="Search by object or Pokémon…"
                shown={shown.length}
                total={belongings.length}
                active={active}
                onClear={clear}
            >

                <FilterSelect label="Rarity" value={values.rarity} options={RARITIES} onChange={value => set("rarity", value)} />
                <FilterSelect label="State" value={values.state} options={STATES} onChange={value => set("state", value)} />

            </FilterBar>


            {
                shown.length === 0
                    ? <p className="data-table__empty">No belongings match these filters.</p>
                    : (

                        <div className="data-table-wrap">

                            <table className="data-table data-table--belongings">

                                <thead>
                                    <tr>
                                        <th scope="col">Object</th>
                                        <th scope="col">Pokémon</th>
                                        <th scope="col">Rarity</th>
                                        <th scope="col">Where</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {
                                        shown.map(belonging => {

                                            const pending = isPending(belonging);


                                            return (

                                                <tr key={belonging.id}>

                                                    <td className="data-table__main">

                                                        <ItemEntry
                                                            image={belonging.image}
                                                            name={belonging.name}
                                                            description={pending ? "To be developed" : belonging.description}
                                                            muted={pending}
                                                        />

                                                    </td>

                                                    {/* Mientras no está escrita, se llama como su Pokémon. */}
                                                    <td data-label="Pokémon">
                                                        {belonging.pokemon || (pending ? belonging.name : "—")}
                                                    </td>

                                                    <td data-label="Rarity">
                                                        <Rarity value={belonging.rarity} label={labelOf(RARITIES, belonging.rarity)} />
                                                    </td>

                                                    <td data-label="Where">

                                                        <ul className="data-table__places">

                                                            {
                                                                (belonging.locations ?? []).map(location => (

                                                                    <li key={location}>
                                                                        {location}
                                                                    </li>

                                                                ))
                                                            }

                                                        </ul>

                                                    </td>

                                                </tr>

                                            );

                                        })
                                    }

                                </tbody>

                            </table>

                        </div>

                    )
            }

        </div>

    );

}
