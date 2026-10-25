import { useEffect, useRef, useState } from "react";

import { parsePosition } from "../lib/framing";


// Una imagen recortada a su caja (un círculo, una miniatura) con encuadre
// libre: `position` es el punto de la imagen que queda en el centro de la caja
// ("50% 50%", el centro, si no hay) y `zoom` cuánto se amplía.
//
// No se hace con object-position porque ese solo mueve la imagen en el eje en
// que sobra: una imagen cuadrada en un círculo no se podía subir ni bajar.
// Aquí la imagen se dimensiona a mano (como cover, por el zoom) y se coloca
// para que el punto elegido caiga en el centro, así que se mueve hacia
// cualquier lado.
//
// `aspect` es la proporción de la caja (1 un círculo, 4/3 una miniatura). La
// caja tiene que ser position: relative y overflow: hidden.
export default function FramedImage({ src, position, zoom, aspect = 1, className, onError }){

    const ref = useRef(null);
    const [ratio, setRatio] = useState(null);

    // Una imagen que ya estaba en caché puede haber cargado antes de que React
    // enganche el onLoad.
    useEffect(() => {
        const img = ref.current;
        if(img?.complete && img.naturalWidth){
            setRatio(img.naturalWidth / img.naturalHeight);
        }
    }, [src]);

    const [x, y] = parsePosition(position);
    const scale = Number(zoom) > 0 ? Number(zoom) : 1;

    let style = { left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" };

    if(ratio){
        const wide = ratio > aspect;
        const width = (wide ? ratio / aspect : 1) * 100 * scale;
        const height = (wide ? 1 : aspect / ratio) * 100 * scale;
        style = { width: `${width}%`, height: `${height}%`, left: `${50 - x * width}%`, top: `${50 - y * height}%` };
    }

    return (
        <img
            ref={ref}
            className={className ? `framed-image ${className}` : "framed-image"}
            src={src}
            alt=""
            draggable={false}
            loading="lazy"
            style={style}
            onLoad={event => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
            onError={onError}
        />
    );

}
