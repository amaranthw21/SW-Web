// Achica las imágenes de una carpeta (en el deploy, dist/) antes de publicarlas.
//
// Se ejecuta sobre dist/ y NO sobre public/ por dos razones:
//
//   1. El repo conserva los originales tal y como los subió el mod, así que el
//      CMS sigue funcionando igual y nadie pierde calidad de origen.
//   2. Sin pérdida generacional: cada despliegue parte del original intacto, así
//      que cada imagen se comprime UNA vez. Si el script escribiera de vuelta en
//      public/, cada deploy recomprimiría un JPEG ya comprimido y la calidad se
//      degradaría poco a poco, sin que nadie lo notara hasta que fuera
//      irreversible.
//
// Regla de oro: NUNCA renombra ni cambia el formato. Las rutas de las imágenes
// están escritas en los JSON de contenido, así que conservar el nombre es lo que
// garantiza que ninguna referencia pueda romperse y lo que permite que esto
// funcione desatendido.
//
//   node scripts/optimize-images.mjs dist           aplica los cambios
//   node scripts/optimize-images.mjs dist --dry      solo informa, no escribe

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import sharp from "sharp";


// Lado máximo. Las imágenes de dioses se usan como fondo a pantalla completa
// (GodDetail pone god.image en --page-bg), así que el tope no puede ser el
// tamaño de una tarjeta. 1600px cubre un portátil grande sin pasarse.
const MAX_EDGE = 1600;

const QUALITY = 82;

const EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);


async function* walk(dir){

    for(const entry of await readdir(dir, { withFileTypes: true })){

        const path = join(dir, entry.name);

        if(entry.isDirectory()){
            yield* walk(path);
        } else if(EXTENSIONS.has(extname(entry.name).toLowerCase())){
            yield path;
        }

    }

}


// Vuelve a codificar en el MISMO formato con el que entró.
function encode(pipeline, format, hasAlpha){

    if(format === "jpeg"){
        return pipeline.jpeg({ quality: QUALITY, mozjpeg: true });
    }

    if(format === "webp"){
        return pipeline.webp({ quality: QUALITY });
    }

    // PNG. La cuantización de paleta (256 colores) es ideal para arte plano y
    // logos, pero sobre un degradado suave produce bandeado visible. Así que se
    // aplica solo a los PNG con transparencia, que aquí son justo eso: los
    // logos de facción y los iconos de energía.
    if(hasAlpha){
        return pipeline.png({ palette: true, quality: QUALITY, effort: 8, compressionLevel: 9 });
    }

    // Los PNG sin alfa son ilustración con degradados. Aquí no hay atajo:
    // recomprimir de verdad SIN pérdida los deja MÁS grandes que el original
    // (medido: 1902 KB → 2553 KB), así que estos solo adelgazan si además hay
    // que reducirlos de tamaño; si ya venían pequeños, el guardia de "solo
    // escribe si mengua" los deja intactos. Adelgazarlos de verdad pasa por
    // convertirlos a JPEG, y eso implica renombrar: va aparte, revisado a mano.
    //
    // OJO con la API de sharp: en PNG, pasar `effort` activa `palette` por su
    // cuenta, así que un png({ compressionLevel, effort }) que parece sin
    // pérdida en realidad cuantiza. Por eso aquí no se pasa `effort`.
    return pipeline.png({ compressionLevel: 9, palette: false });

}


async function optimize(path, { dry }){

    const before = (await stat(path)).size;
    const input = await readFile(path);

    const meta = await sharp(input).metadata();

    // Los formatos animados se aplanarían a un solo fotograma: mejor no tocarlos.
    if((meta.pages ?? 1) > 1){
        return { path, before, after: before, skipped: "animado" };
    }

    let pipeline = sharp(input);

    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
    const resized = longest > MAX_EDGE;

    if(resized){
        pipeline = pipeline.resize({
            width: MAX_EDGE,
            height: MAX_EDGE,
            fit: "inside",
            withoutEnlargement: true
        });
    }

    const output = await encode(pipeline, meta.format, meta.hasAlpha).toBuffer();

    // Si no adelgaza, se queda la original. Así una imagen ya optimizada pasa de
    // largo intacta y el script es seguro de repetir.
    if(output.length >= before){
        return { path, before, after: before, skipped: "ya óptima" };
    }

    if(!dry){
        await writeFile(path, output);
    }

    return {
        path,
        before,
        after: output.length,
        resized: resized ? `${meta.width}×${meta.height} → ${MAX_EDGE}px` : null
    };

}


const [dir, ...flags] = process.argv.slice(2);

if(!dir){
    console.error("Uso: node scripts/optimize-images.mjs <carpeta> [--dry]");
    process.exit(1);
}

const dry = flags.includes("--dry");

const results = [];

for await (const path of walk(dir)){
    results.push(await optimize(path, { dry }));
}

const kb = n => (n / 1024).toFixed(0).padStart(6);

const changed = results
    .filter(r => r.after < r.before)
    .sort((a, b) => (b.before - b.after) - (a.before - a.after));

console.log(dry ? "\n── SIMULACRO: no se ha escrito nada ──\n" : "");

changed.slice(0, 25).forEach(r => {
    const cut = Math.round(100 - (r.after * 100) / r.before);
    console.log(
        `  ${relative(dir, r.path).padEnd(44)} ${kb(r.before)} → ${kb(r.after)} KB  -${String(cut).padStart(2)}%`
        + (r.resized ? `   ${r.resized}` : "")
    );
});

if(changed.length > 25){
    console.log(`  … y ${changed.length - 25} más`);
}

const before = results.reduce((s, r) => s + r.before, 0);
const after = results.reduce((s, r) => s + r.after, 0);

console.log(`\n  ${results.length} imágenes · ${changed.length} optimizadas · ${results.length - changed.length} sin cambio`);
console.log(`  TOTAL ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB `
    + `(-${Math.round(100 - (after * 100) / before)}%)\n`);
