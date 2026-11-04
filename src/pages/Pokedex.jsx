import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import DexCard from "../components/DexCard";
import { API, dexImageUrl, publicDex } from "../panel/api";
import { KINDS } from "../lib/pokedex";
import normalize from "../lib/normalize";
import useDocumentTitle from "../lib/useDocumentTitle";


// La Pokédex pública: los enemigos de las mazmorras que ya se han visto, con
// lo que se sabe de ellos. No sale del build como el resto de páginas sino del
// Worker del panel, que solo entrega lo que los moderadores han marcado como
// descubierto (ver src/lib/pokedex.js). Así, lo que aún es secreto no está en
// ningún sitio al que llegue un jugador, ni siquiera en el repo.
export default function Pokedex(){

    useDocumentTitle("Pokédex");

    const [params, setParams] = useSearchParams();
    const [entries, setEntries] = useState(null);
    const [error, setError] = useState(API ? "" : "The Pokédex isn't available right now.");
    const [query, setQuery] = useState("");

    const kind = params.get("kind") === "boss" ? "boss" : "amalgam";

    useEffect(() => {

        if(!API){
            return;
        }

        publicDex()
            .then(setEntries)
            .catch(() => setError("Couldn't load the Pokédex. Try again in a moment."));

    }, []);

    const ofKind = (entries ?? []).filter(entry => entry.kind === kind);
    const shown = ofKind.filter(entry => !query || normalize(`${entry.name ?? ""} ${entry.number ?? ""}`).includes(normalize(query)));

    return (

        <div>

            <h1 className="page-title">Pokédex</h1>

            <p className="page-intro">
                The creatures waiting in the dungeons. Amalgams are fused beasts of
                every size; bosses guard the deepest floors. Whatever hasn't been
                discovered yet shows as ???: explore to fill it in.
            </p>

            <div className="section-tabs dex-kinds" role="group" aria-label="Kind">
                {KINDS.map(item => (
                    <button
                        key={item.value}
                        type="button"
                        className={`section-tab${item.value === kind ? " section-tab--on" : ""}`}
                        aria-pressed={item.value === kind}
                        onClick={() => setParams(item.value === "amalgam" ? {} : { kind: item.value })}
                    >
                        {item.plural}
                        {entries && ` · ${entries.filter(entry => entry.kind === item.value).length}`}
                    </button>
                ))}
            </div>

            {error && <p className="dex-message">{error}</p>}

            {!error && !entries && <p className="dex-message">Loading…</p>}

            {entries && (
                <>

                    {ofKind.length > 0 && (
                        <div className="filters dex-filters">
                            <label className="filters__search">
                                <span className="filters__sr">Search</span>
                                <input
                                    type="search"
                                    placeholder="Search by name or number…"
                                    value={query}
                                    onChange={event => setQuery(event.target.value)}
                                />
                            </label>
                        </div>
                    )}

                    {shown.length === 0
                        ? (
                            <p className="dex-message">
                                {ofKind.length === 0
                                    ? kind === "boss" ? "No boss has been seen yet." : "No amalgam has been seen yet."
                                    : "Nothing matches."}
                            </p>
                        )
                        : (
                            <div className="dex-grid">
                                {shown.map(entry => (
                                    <DexCard
                                        key={entry.id}
                                        entry={entry}
                                        image={entry.image ? dexImageUrl(entry.id, entry.image) : null}
                                    />
                                ))}
                            </div>
                        )}

                </>
            )}

        </div>

    );

}
