// Genera el hash de la contraseña de un admin para el secreto ADMINS del Worker.
//
//     node worker/hash-password.mjs
//
// Pregunta la contraseña sin enseñarla y escribe una línea "pbkdf2$...". La
// contraseña en claro no se guarda en ningún sitio: solo el hash.
//
// 100 000 iteraciones es el máximo que admite PBKDF2 en Cloudflare Workers.
import { webcrypto } from "node:crypto";
import { createInterface } from "node:readline";

const ITERATIONS = 100000;


function ask(question){

    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    // Silencia el eco del teclado mientras se escribe la contraseña.
    rl._writeToOutput = text => {
        if(text.includes(question)){
            process.stdout.write(text);
        }
    };

    return new Promise(resolve => rl.question(question, answer => {
        rl.close();
        process.stdout.write("\n");
        resolve(answer);
    }));

}


const password = await ask("Password: ");

if(password.length < 10){
    console.error("Use at least 10 characters.");
    process.exit(1);
}

const salt = webcrypto.getRandomValues(new Uint8Array(16));

const key = await webcrypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
);

const hash = new Uint8Array(await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256
));

console.log(`pbkdf2$${ITERATIONS}$${Buffer.from(salt).toString("base64")}$${Buffer.from(hash).toString("base64")}`);
