// Comprueba el valor de ADMINS antes de guardarlo (o si el login falla).
//
//     node worker/check-admins.mjs
//
// Pide el JSON tal cual lo pegaste en `wrangler secret put ADMINS` y una
// contraseña, y dice si el formato es correcto y si la contraseña coincide con
// alguna cuenta. No guarda ni enseña nada.
import { webcrypto } from "node:crypto";
import { createInterface } from "node:readline";


// Un solo lector para las dos preguntas: con uno por pregunta, el primero se
// queda con lo que ya se ha escrito para la segunda.
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

// Silencia el eco del teclado: ni el JSON ni la contraseña salen en pantalla.
let question = "";
rl._writeToOutput = text => {
    if(text.includes(question)){
        process.stdout.write(text);
    }
};


// Las líneas se guardan en cola: si llegan juntas (pegando las dos de golpe),
// readline soltaría la segunda antes de que se haga la pregunta.
const lines = [];
const waiting = [];

rl.on("line", line => (waiting.length ? waiting.shift()(line) : lines.push(line)));


function ask(text){

    question = text;
    process.stdout.write(text);

    return new Promise(resolve => {
        const answer = line => {
            process.stdout.write("\n");
            resolve(line);
        };
        lines.length ? answer(lines.shift()) : waiting.push(answer);
    });

}


const raw = await ask("ADMINS JSON: ");

let admins;

try {
    admins = JSON.parse(raw);
} catch(error){
    rl.close();
    console.error(`✗ It isn't valid JSON (${error.message}). It should look like {"belen":"pbkdf2$100000$...$..."}`);
    process.exit(1);
}

for(const [name, hash] of Object.entries(admins)){

    const parts = String(hash).split("$");
    const problems = [];

    if(name !== name.trim().toLowerCase()){
        problems.push(`sign in as "${name.trim().toLowerCase()}" (names are lowercase)`);
    }

    if(!/^[a-z0-9][a-z0-9_.-]{1,31}$/.test(name.trim().toLowerCase())){
        problems.push("the name can only have letters without accents, numbers, dots, dashes or underscores");
    }

    if(parts.length !== 4 || parts[0] !== "pbkdf2" || parts[1] !== "100000" || parts[2].length !== 24 || parts[3].length !== 44){
        problems.push(`the hash looks broken (${parts.length} parts; expected pbkdf2$100000$<24 chars>$<44 chars>). Copy it again whole`);
    }

    console.log(problems.length ? `✗ ${name}: ${problems.join("; ")}` : `✓ ${name}: format OK`);

}

const password = await ask("Password to test: ");
rl.close();

for(const [name, hash] of Object.entries(admins)){

    const [, iterations, salt, expected] = String(hash).split("$");

    if(!salt || !expected){
        continue;
    }

    const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await webcrypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: Buffer.from(salt, "base64"), iterations: Number(iterations) }, key, 256
    );

    if(Buffer.from(bits).toString("base64") === expected){
        console.log(`✓ That password is ${name}'s.`);
        process.exit(0);
    }

}

console.log("✗ That password doesn't match any account here.");
