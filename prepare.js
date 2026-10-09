// Assembles the app folder (page, fonts, PDF libraries) so everything ships inside the installer for offline use.
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const app = path.join(root, "app");
fs.rmSync(app, { recursive: true, force: true });
fs.mkdirSync(path.join(app, "fonts"), { recursive: true });
const lib = path.join(app, "lib");
fs.mkdirSync(lib, { recursive: true });
fs.copyFileSync(path.join(root, "desktop.html"), path.join(app, "index.html"));
for(const f of fs.readdirSync(root)) if(/\.woff2$/.test(f) || f === "fonts.css") fs.copyFileSync(path.join(root, f), path.join(app, "fonts", f));
const pdfjs = path.dirname(require.resolve("pdfjs-dist/package.json"));
const pdflib = path.dirname(require.resolve("pdf-lib/package.json"));
for(const f of ["pdf.min.mjs", "pdf.worker.min.mjs"]) fs.copyFileSync(path.join(pdfjs, "build", f), path.join(lib, f));
for(const d of ["cmaps", "standard_fonts", "wasm"]) fs.cpSync(path.join(pdfjs, d), path.join(lib, d), { recursive: true });
fs.copyFileSync(path.join(pdflib, "dist", "pdf-lib.min.js"), path.join(lib, "pdf-lib.min.js"));
console.log("App folder assembled");
