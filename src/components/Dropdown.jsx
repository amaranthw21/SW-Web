import { useEffect, useId, useRef, useState } from "react";


// Un desplegable con el aspecto de la web. El <select> del navegador abre una
// lista blanca del sistema que no se puede teñir, así que este pinta la suya,
// como el buscador de especies del OC Maker.
//
// `options` son { value, label }; `renderOption` (opcional) pinta cada una a su
// manera, p. ej. la insignia de un tipo. Se usa con el ratón y con el teclado:
// flechas para moverse, Enter para elegir y Escape para cerrar.
export default function Dropdown({ id, value, onChange, options, placeholder = "—", renderOption, ariaLabel }){

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const root = useRef(null);
    const listId = useId();

    const selected = options.find(option => option.value === value);
    const show = option => renderOption ? renderOption(option) : option.label;


    // Se cierra al pulsar fuera.
    useEffect(() => {

        if(!open){
            return undefined;
        }

        function outside(event){
            if(!root.current?.contains(event.target)){
                setOpen(false);
            }
        }

        document.addEventListener("pointerdown", outside);

        return () => document.removeEventListener("pointerdown", outside);

    }, [open]);


    function openList(){
        setActive(Math.max(0, options.indexOf(selected)));
        setOpen(true);
    }

    function pick(option){
        onChange(option?.value ?? "");
        setOpen(false);
    }

    function onKeyDown(event){

        if(!open){
            if(["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)){
                event.preventDefault();
                openList();
            }
            return;
        }

        if(event.key === "Escape"){
            event.preventDefault();
            setOpen(false);
        } else if(event.key === "ArrowDown"){
            event.preventDefault();
            setActive(i => Math.min(options.length - 1, i + 1));
        } else if(event.key === "ArrowUp"){
            event.preventDefault();
            setActive(i => Math.max(0, i - 1));
        } else if(event.key === "Enter" || event.key === " "){
            event.preventDefault();
            pick(options[active]);
        } else if(event.key === "Tab"){
            setOpen(false);
        }

    }


    return (

        <div className="dropdown" ref={root}>

            <button
                id={id}
                type="button"
                className={`oc-maker__input dropdown__button${open ? " is-open" : ""}`}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={ariaLabel}
                aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
                onClick={() => open ? setOpen(false) : openList()}
                onKeyDown={onKeyDown}
            >
                <span className={selected ? "dropdown__value" : "dropdown__placeholder"}>
                    {selected ? show(selected) : placeholder}
                </span>
                <span className="dropdown__arrow" aria-hidden="true">▾</span>
            </button>

            {
                open && (

                    <ul className="dropdown__options" role="listbox" id={listId}>

                        {
                            value && (
                                <li role="presentation">
                                    <button type="button" tabIndex={-1} className="dropdown__clear" onClick={() => pick(null)}>
                                        Clear
                                    </button>
                                </li>
                            )
                        }

                        {
                            options.map((option, i) => (
                                <li
                                    key={option.value}
                                    id={`${listId}-${i}`}
                                    role="option"
                                    aria-selected={option.value === value}
                                    className={`dropdown__option${i === active ? " is-active" : ""}${option.value === value ? " is-selected" : ""}`}
                                    onPointerEnter={() => setActive(i)}
                                    onClick={() => pick(option)}
                                >
                                    {show(option)}
                                </li>
                            ))
                        }

                    </ul>

                )
            }

        </div>

    );

}
