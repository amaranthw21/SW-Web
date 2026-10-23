// Valor de una fila del infobox. Puede venir como texto suelto o como lista
// (Other Cities y las organizaciones son listas), y un texto con una línea en
// blanco se parte en varias líneas, igual que los párrafos del resto de la
// web. Si no queda nada que pintar, se muestra "N/A".
export default function InfoboxValue({ value }){

    const items = (Array.isArray(value) ? value : [value])
        .filter(item => typeof item === "string")
        .flatMap(item => item.split(/\n\s*\n/))
        .map(item => item.trim())
        .filter(Boolean);

    if(items.length === 0){

        return <span className="infobox__na">N/A</span>;

    }

    return items.map((item, i) => (

        <span key={i} className="infobox__line">
            {item}
        </span>

    ));

}
