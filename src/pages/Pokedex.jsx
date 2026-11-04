import { useEffect, useState } from "react";

import { FilterBar, FilterSelect } from "../components/FilterBar";
import TypeBadge from "../components/TypeBadge";
import { TYPES } from "../data/pokemon";
import { API, dexImageUrl, publicDex } from "../panel/api";
import { KINDS, SIZES, sizeLabel } from "../lib/pokedex";
import normalize from "../lib/normalize";
import useDocumentTitle from "../lib/useDocumentTitle";
import useFilters from "../lib/useFilters";


// La Pokédex pública: los enemigos de las mazmorras que ya se han visto, con
// lo que se sabe de ellos, en una tabla como la de Pokémon. No sale del build
// como el resto de páginas sino del Worker del panel, que solo entrega lo que
// los moderadores han marcado como descubierto (ver src/lib/pokedex.js). Así,
// lo que aún es secreto no está en ningún sitio al que llegue un jugador, ni
// siquiera en el repo.

const FILTERS = ["q", "kind", "size", "type", "place"];


function Unknown(){

    return <span className="dex-unknown">???</span>;

}


function dexNumber(number){

    return number === null || number === undefined ? "???" : String(number).padStart(3, "0");

}


function matches(entry, { q, kind, size, type, place }){

    if(q && !normalize(`${entry.name ?? ""} ${entry.number ?? ""} ${entry.ability ?? ""}`).includes(normalize(q))){
        return false;
    }

    // Solo cuenta lo descubierto: filtrar por un tipo oculto lo destaparía.
    if(type && !entry.types.includes(type) && entry.hiddenType !== type){
        return false;
    }

    return (!kind || entry.kind === kind)
        && (!size || entry.size === size)
        && (!place || (entry.dungeons ?? []).includes(place));

}


export default function Pokedex(){

    useDocumentTitle("Pokédex");

    const { values, set, active } = useFilters(FILTERS);
    const [entries, setEntries] = useState(null);
    const [error, setError] = useState(API ? "" : "The Pokédex isn't available right now.");

    useEffect(() => {

        if(!API){
            return;
        }

        publicDex()
            .then(setEntries)
            .catch(() => setError("Couldn't load the Pokédex. Try again in a moment."));

    }, []);

    const all = entries ?? [];
    const shown = all.filter(entry => matches(entry, values));

    // Los lugares del filtro, de lo ya descubierto.
    const places = [...new Set(all.flatMap(entry => entry.dungeons ?? []))]
        .sort()
        .map(place => ({ value: place, label: place }));

    return (

        <div>

            <h1 className="page-title">Pokédex</h1>

            <p className="page-intro">
                The creatures waiting in the dungeons. Amalgams are fused beasts of
                every size; bosses guard the deepest floors. Whatever hasn't been
                discovered yet shows as ???: explore to fill it in.
            </p>

            <FilterBar
                search={values.q}
                onSearch={value => set("q", value)}
                placeholder="Search by name, number or ability…"
                shown={shown.length}
                total={all.length}
                active={active}
                onClear={() => FILTERS.forEach(key => set(key, ""))}
            >
                <FilterSelect label="Kind" value={values.kind} options={KINDS} onChange={value => set("kind", value)} />
                <FilterSelect label="Size" value={values.size} options={SIZES} onChange={value => set("size", value)} />
                <FilterSelect label="Type" value={values.type} options={TYPES} onChange={value => set("type", value)} />
                <FilterSelect label="Found in" value={values.place} options={places} onChange={value => set("place", value)} />
            </FilterBar>

            {error && <p className="data-table__empty">{error}</p>}

            {!error && !entries && <p className="data-table__empty">Loading…</p>}

            {entries && (
                shown.length === 0
                    ? (
                        <p className="data-table__empty">
                            {all.length === 0 ? "No enemy has been seen yet." : "No enemies match these filters."}
                        </p>
                    )
                    : (

                        <div className="data-table-wrap">

                            <table className="data-table data-table--dex">

                                <thead>
                                    <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">Enemy</th>
                                        <th scope="col">Type</th>
                                        <th scope="col">Ability</th>
                                        <th scope="col">Moves</th>
                                        <th scope="col">Found in</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {shown.map(entry => <DexRow key={entry.id} entry={entry} />)}
                                </tbody>

                            </table>

                        </div>

                    )
            )}

        </div>

    );

}


function DexRow({ entry }){

    const boss = entry.kind === "boss";

    return (

        <tr>

            <td className="data-table__num" data-label="#">
                {dexNumber(entry.number)}
            </td>

            <td className="data-table__main">

                <div className="data-table__entry">

                    <span className="data-table__sprite">
                        {entry.image
                            ? <img src={dexImageUrl(entry.id, entry.image)} alt="" loading="lazy" width="56" height="56" />
                            : <span className="dex-unknown" aria-hidden="true">?</span>}
                    </span>

                    <div>

                        <div className="data-table__name">
                            {/* En la versión tarjeta la columna # se esconde y el número va aquí. */}
                            <span className="data-table__inline-num">#{dexNumber(entry.number)}</span>
                            {entry.name ?? <Unknown />}
                            <span className={`data-table__tag${boss ? " data-table__tag--boss" : ""}`}>
                                {boss ? "Boss" : sizeLabel(entry.size)}
                            </span>
                        </div>

                        <p className={`data-table__desc${entry.description ? "" : " data-table__desc--muted"}`}>
                            {entry.description ?? "Not yet discovered."}
                        </p>

                    </div>

                </div>

            </td>

            <td data-label="Type">
                <div className="type-badges">
                    {entry.types.length === 0 && <Unknown />}
                    {entry.types.map((type, i) => type ? <TypeBadge key={i} type={type} /> : <Unknown key={i} />)}
                </div>
                {boss && (
                    <div className="data-table__sub dex-hidden-type">
                        Hidden: {entry.hiddenType ? <TypeBadge type={entry.hiddenType} /> : <Unknown />}
                    </div>
                )}
            </td>

            <td data-label="Ability">
                {entry.ability
                    ? (
                        <>
                            <div className="data-table__name">{entry.ability}</div>
                            {entry.abilityText && <div className="data-table__sub">{entry.abilityText}</div>}
                        </>
                    )
                    : <Unknown />}
            </td>

            <td data-label="Moves">
                {entry.moves.length === 0
                    ? <Unknown />
                    : (
                        <ul className="data-table__places dex-moves">
                            {entry.moves.map((move, i) => <li key={i}>{move ?? <Unknown />}</li>)}
                        </ul>
                    )}
            </td>

            <td data-label="Found in">
                {entry.dungeons
                    ? entry.dungeons.length
                        ? <ul className="data-table__places">{entry.dungeons.map(place => <li key={place}>{place}</li>)}</ul>
                        : "—"
                    : <Unknown />}
            </td>

        </tr>

    );

}
