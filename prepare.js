// Copies the PDF libraries into app/lib so they ship inside the installer (offline use).
const fs = require("node:fs");
const path = require("node:path");
const lib = path.join(__dirname, "app", "lib");
fs.rmSync(lib, { recursive: true, force: true });
fs.mkdirSync(lib, { recursive: true });
const pdfjs = path.dirname(require.resolve("pdfjs-dist/package.json"));
const pdflib = path.dirname(require.resolve("pdf-lib/package.json"));
for(const f of ["pdf.min.mjs", "pdf.worker.min.mjs"]) fs.copyFileSync(path.join(pdfjs, "build", f), path.join(lib, f));
for(const d of ["cmaps", "standard_fonts", "wasm"]) fs.cpSync(path.join(pdfjs, d), path.join(lib, d), { recursive: true });
fs.copyFileSync(path.join(pdflib, "dist", "pdf-lib.min.js"), path.join(lib, "pdf-lib.min.js"));
console.log("Libraries copied into app/lib");
