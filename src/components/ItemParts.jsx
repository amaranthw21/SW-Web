import asset from "../lib/asset";
import slug from "../lib/slug";


// Las piezas que comparten las tablas de objetos, pertenencias y bendiciones.


// La celda principal: imagen, nombre, una línea pequeña debajo (la nota, el
// Pokémon…) y la descripción.
export function ItemEntry({ image, name, sub, description, muted }){

    return (

        <div className="data-table__entry">

            <span className="data-table__sprite">
                {
                    image && (
                        <img
                            src={asset(image)}
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
                    {name}
                </div>

                {sub && <div className="data-table__sub">{sub}</div>}

                {
                    description && (
                        <p className={muted ? "data-table__desc data-table__desc--muted" : "data-table__desc"}>
                            {description}
                        </p>
                    )
                }

            </div>

        </div>

    );

}


// La rareza con su icono (public/rarity/<rareza>.webp).
export function Rarity({ value, label }){

    return (

        <span className="rarity">

            <img
                src={asset(`/rarity/${slug(value)}.webp`)}
                alt=""
                loading="lazy"
                onError={e => { e.currentTarget.style.display = "none"; }}
            />

            {label ?? value}

        </span>

    );

}
