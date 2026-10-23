import slug from "./slug";


// Los bloques de contenido se identifican por su título: de ahí sale el ancla
// que usa la tabla de contenidos. Se descartan los que no tienen título (fila a
// medio rellenar en el CMS) y, si dos coinciden, al segundo se le añade un
// sufijo para que las anclas sigan siendo únicas.
export default function withBlockIds(blocks){

    const usedIds = [];


    return (blocks ?? [])
        .filter(block => block?.title?.trim())
        .map(block => {

            const base = slug(block.title);
            let id = base;
            let n = 2;

            while(usedIds.includes(id)){
                id = `${base}-${n}`;
                n += 1;
            }

            usedIds.push(id);

            return { ...block, id };

        });

}
