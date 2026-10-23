// Los iconos de la barra lateral. Se dibujan a mano en vez de tirar de una
// librería para no añadir una dependencia entera por siete siluetas, y siguen
// el mismo estilo que la lupa de la barra: trazo y `currentColor`, así heredan
// el color del enlace y se tiñen solos al pasar por encima o al marcar la
// página activa.
//
// Los que necesitan relleno (las almohadillas de la huella) lo piden pieza a
// pieza, porque el trazo por defecto lo pone la clase .rail__icon.


export function HomeIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3.5 11 12 4l8.5 7" />
            <path d="M6 9.8V20h12V9.8" />
            <path d="M10 20v-5.5h4V20" />
        </svg>
    );

}


// Rulesbook: un tablilla con sus renglones. Se diferencia del libro abierto de
// Lore para que no se confundan de un vistazo.
export function RulesIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 9h6" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
        </svg>
    );

}


export function LoreIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 6.6C10.4 5.1 7.9 4.6 4 5.1v12.6c3.9-.5 6.4 0 8 1.5 1.6-1.5 4.1-2 8-1.5V5.1c-3.9-.5-6.4 0-8 1.5z" />
            <path d="M12 6.6v12.6" />
        </svg>
    );

}


export function WorldsIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="8" />
            <path d="M4 12h16" />
            <path d="M12 4c2.6 2.2 2.6 13.8 0 16-2.6-2.2-2.6-13.8 0-16z" />
        </svg>
    );

}


// Species: una huella. Las almohadillas van rellenas porque a este tamaño un
// círculo de contorno se lee como un anillo, no como un dedo.
export function SpeciesIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="6.4" cy="8.8" r="1.75" fill="currentColor" stroke="none" />
            <circle cx="10.2" cy="6.3" r="1.75" fill="currentColor" stroke="none" />
            <circle cx="13.8" cy="6.3" r="1.75" fill="currentColor" stroke="none" />
            <circle cx="17.6" cy="8.8" r="1.75" fill="currentColor" stroke="none" />
            <path
                d="M12 13.1c2.3 0 4.2 1.8 4.2 3.8 0 1.8-1.5 2.9-3.1 2.9-.7 0-1-.2-1.1-.2s-.4.2-1.1.2c-1.6 0-3.1-1.1-3.1-2.9 0-2 1.9-3.8 4.2-3.8z"
                fill="currentColor"
                stroke="none"
            />
        </svg>
    );

}


export function FactionsIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3.5 19 6v5.6c0 4.3-2.9 7.4-7 8.9-4.1-1.5-7-4.6-7-8.9V6z" />
        </svg>
    );

}


export function CreditsIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
        </svg>
    );

}


// El acceso al panel de edición, en el menú de móvil: un lápiz.
export function AdminIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
            <path d="M14.5 6.5l3 3" />
        </svg>
    );

}


// La flecha de los desplegables y del botón de anclar. Siempre apunta a la
// derecha; girarla es cosa del CSS, según el estado.
export function ChevronIcon(){

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 5.5l6.5 6.5L9 18.5" />
        </svg>
    );

}
