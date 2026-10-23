import { useSearchParams } from "react-router-dom";


// Los filtros de las tablas viven en la dirección (?status=OPEN&type=Fire), no
// en un estado de React: así un enlace pegado en Discord abre la tabla ya
// filtrada, y atrás/adelante deshace y rehace filtros como cualquier página.
//
// `replace` para no llenar el historial con una entrada por tecla del buscador.
export default function useFilters(keys){

    const [params, setParams] = useSearchParams();

    const values = Object.fromEntries(
        keys.map(key => [key, params.get(key) ?? ""])
    );

    const active = keys.some(key => values[key]);


    function set(key, value){

        setParams(prev => {

            const next = new URLSearchParams(prev);

            if(value){
                next.set(key, value);
            } else {
                next.delete(key);
            }

            return next;

        }, { replace: true });

    }


    function clear(){

        setParams({}, { replace: true });

    }


    return { values, set, clear, active };

}
