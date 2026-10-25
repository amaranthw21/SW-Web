// "50% 25%" -> [0.5, 0.25]. Puede salirse de 0-100: el encuadre es libre.
export function parsePosition(position){

    const [x, y] = (position ?? "").trim().split(/\s+/).map(part => parseFloat(part) / 100);

    return [Number.isFinite(x) ? x : 0.5, Number.isFinite(y) ? y : 0.5];

}
