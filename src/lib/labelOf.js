// Cómo se lee un valor guardado, según la lista de opciones de su columna
// ({ value, label }). Si alguien escribe en el panel uno que no está en la
// lista, se enseña tal cual en vez de desaparecer.
export default function labelOf(options, value){

    return options.find(option => option.value === value)?.label ?? value;

}
