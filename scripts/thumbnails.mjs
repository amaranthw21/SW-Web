// Miniaturas en el build: `import foto from "./foto.png?thumb=600"` da la
// dirección de una copia webp cuyo lado largo mide como mucho 600px (400 si
// no se dice).
//
// Para las imágenes que se ven pequeñas: los retratos de los círculos de
// personajes pesaban hasta 300KB a 1600px para un círculo de 200px, y el logo
// del menú 1MB para 55px. El original no se toca y sigue sirviendo a tamaño
// completo donde se ve grande (la ficha, el lightbox).
//
// En el build se emite como un archivo más de assets/; en `npm run dev` va
// dentro del módulo como data URL, que para algo de este tamaño basta.
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import sharp from "sharp";

const DEFAULT_EDGE = 400;
const QUALITY = 82;


export default function thumbnails(){

    let isBuild = false;

    return {
        name: "sw-web-thumbnails",
        enforce: "pre",

        configResolved(config){
            isBuild = config.command === "build";
        },

        async load(id){

            const [file, query] = id.split("?");
            const params = new URLSearchParams(query ?? "");

            if(!params.has("thumb")){
                return null;
            }

            const edge = Number(params.get("thumb")) || DEFAULT_EDGE;

            const source = await sharp(await readFile(file))
                .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
                .webp({ quality: QUALITY })
                .toBuffer();

            if(!isBuild){
                return `export default "data:image/webp;base64,${source.toString("base64")}";`;
            }

            const ref = this.emitFile({
                type: "asset",
                name: `${basename(file, extname(file))}.webp`,
                source
            });

            return `export default import.meta.ROLLUP_FILE_URL_${ref};`;

        }
    };

}
