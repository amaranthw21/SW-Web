import { TYPES } from "../data/pokemon";
import asset from "../lib/asset";


// Insignia de un tipo (Fire, Psychic…) con su icono y su color. La usan la
// lista de Pokémon y las fichas de personaje.
export default function TypeBadge({ type }){

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
