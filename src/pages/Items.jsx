import items, { ITEM_TYPES, HOW_TO_GET, LOCATIONS } from "../data/items";
import RARITIES from "../data/rarities";
import { Link } from "react-router-dom";
import { FilterBar, FilterSelect } from "../components/FilterBar";
import { ItemEntry, Rarity } from "../components/ItemParts";
import useFilters from "../lib/useFilters";
import labelOf from "../lib/labelOf";
import normalize from "../lib/normalize";
import useDocumentTitle from "../lib/useDocumentTitle";


const FILTERS = ["q", "type", "rarity", "how", "location"];


function matches(item, { q, type, rarity, how, location }){

    if(q && !normalize(`${item.name} ${item.note} ${item.description}`).includes(normalize(q))){
        return false;
    }

    return (!type || item.type === type)
        && (!rarity || item.rarity === rarity)
        && (!how || item.howToGet === how)
        && (!location || (item.locations ?? []).includes(location));

}


// "-" en el Excel: no se compra o no se vende.
function price(value){

    return value == null ? "—" : value.toLocaleString("en-US");

}


export default function Items(){

    useDocumentTitle("Item list");

    const { values, set, clear, active } = useFilters(FILTERS);

    const shown = items.filter(item => matches(item, values));


    return (

        <div>

            <h1 className="page-title">
                Item list
            </h1>

            <p className="page-intro">
                Everything that can be found, crafted or bought, what it costs and
                where to get it. Items tied to a Pokémon have their own pages:{" "}
                <Link to="/items/belongings">Special belongings</Link> and{" "}
                <Link to="/items/blessings">Blessings</Link>.
            </p>


            <FilterBar
                search={values.q}
                onSearch={value => set("q", value)}
                placeholder="Search by name or description…"
                shown={shown.length}
                total={items.length}
                active={active}
                onClear={clear}
            >

                <FilterSelect label="Type" value={values.type} options={ITEM_TYPES} onChange={value => set("type", value)} />
                <FilterSelect label="Rarity" value={values.rarity} options={RARITIES} onChange={value => set("rarity", value)} />
                <FilterSelect label="How to get" value={values.how} options={HOW_TO_GET} onChange={value => set("how", value)} />
                <FilterSelect label="Location" value={values.location} options={LOCATIONS} onChange={value => set("location", value)} />

            </FilterBar>


            {
                shown.length === 0
                    ? <p className="data-table__empty">No items match these filters.</p>
                    : (

                        <div className="data-table-wrap">

                            <table className="data-table data-table--items">

                                <thead>
                                    <tr>
                                        <th scope="col">Item</th>
                                        <th scope="col">Type</th>
                                        <th scope="col">Rarity</th>
                                        <th scope="col">Buy</th>
                                        <th scope="col">Sell</th>
                                        <th scope="col">How to get</th>
                                        <th scope="col">Where / Ingredients</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {
                                        shown.map(item => (

                                            <tr key={item.id}>

                                                <td className="data-table__main">

                                                    <ItemEntry
                                                    image={item.image}
                                                    name={item.name}
                                                    sub={item.note}
                                                    description={item.description}
                                                />

                                            </td>

                                                <td data-label="Type">
                                                    {labelOf(ITEM_TYPES, item.type)}
                                                </td>

                                                <td data-label="Rarity">

                                                    <Rarity value={item.rarity} label={labelOf(RARITIES, item.rarity)} />

                                                </td>

                                                <td className="data-table__num" data-label="Buy">
                                                    {price(item.buy)}
                                                </td>

                                                <td className="data-table__num" data-label="Sell">
                                                    {price(item.sell)}
                                                </td>

                                                <td data-label="How to get">
                                                    {labelOf(HOW_TO_GET, item.howToGet)}
                                                </td>

                                                <td data-label="Where">

                                                    <ul className="data-table__places">

                                                        {
                                                            (item.ingredients ?? []).map(ingredient => (

                                                                <li key={ingredient.item}>
                                                                    {ingredient.item} <span className="data-table__qty">×{ingredient.quantity}</span>
                                                                </li>

                                                            ))
                                                        }

                                                        {
                                                            (item.locations ?? []).map(location => (

                                                                <li key={location}>
                                                                    {location}
                                                                </li>

                                                            ))
                                                        }

                                                    </ul>

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
