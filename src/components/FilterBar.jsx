// La barra de filtros de las tablas: un buscador, los desplegables y el recuento.
// Las páginas le pasan los desplegables como hijos (<FilterSelect>), así cada
// una pone los suyos sin que esto sepa nada de Pokémon ni de objetos.
export function FilterBar({ search, onSearch, placeholder, shown, total, active, onClear, children }){

    return (

        <div className="filters">

            <label className="filters__search">

                <span className="filters__sr">
                    Search
                </span>

                <input
                    type="search"
                    value={search}
                    placeholder={placeholder}
                    onChange={event => onSearch(event.target.value)}
                />

            </label>

            <div className="filters__selects">
                {children}
            </div>

            <div className="filters__summary">

                {/* aria-live: al filtrar, el lector de pantalla dice cuántos quedan. */}
                <span aria-live="polite">
                    {shown === total ? `${total} entries` : `${shown} of ${total}`}
                </span>

                {
                    active && (

                        <button
                            type="button"
                            className="filters__clear"
                            onClick={onClear}
                        >
                            Clear filters
                        </button>

                    )
                }

            </div>

        </div>

    );

}


// Un desplegable con "Any" como primera opción, que equivale a no filtrar.
export function FilterSelect({ label, value, options, onChange }){

    return (

        <label className={value ? "filters__select filters__select--on" : "filters__select"}>

            <span className="filters__label">
                {label}
            </span>

            <select
                value={value}
                onChange={event => onChange(event.target.value)}
            >

                <option value="">Any</option>

                {
                    options.map(option => (

                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>

                    ))
                }

            </select>

        </label>

    );

}
