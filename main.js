// Eboda desktop shell. Everything document-related happens in app/index.html;
// this file only owns the window, the Save As dialog, printing and "open with".
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

let win = null;
let pending = [];           // PDF paths received before the window is ready

const isPdf = p => typeof p === "string" && /\.pdf$/i.test(p) && !p.startsWith("--");
function pdfArgs(argv){ return argv.slice(app.isPackaged ? 1 : 2).filter(isPdf); }

// Only one Eboda window. Double-clicking another PDF opens a new tab in it.
if(!app.requestSingleInstanceLock()){ app.quit(); }
else {
  app.on("second-instance", (_e, argv) => {
    const files = pdfArgs(argv);
    if(win){ if(win.isMinimized()) win.restore(); win.focus(); sendFiles(files); }
    else pending.push(...files);
  });
}

async function readPdf(p){
  try { const bytes = await fs.readFile(p); return { name: path.basename(p), path: p, bytes }; }
  catch(err){ dialog.showErrorBox("Eboda", `Couldn't open ${p}\n${err.message}`); return null; }
}
async function sendFiles(paths){
  for(const p of paths){ const f = await readPdf(p); if(f && win) win.webContents.send("open-file", f); }
}

function createWindow(){
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 720, minHeight: 480,
    title: "Eboda", backgroundColor: "#f4f1ea", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);           // the app has its own toolbar
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if(/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.on("closed", () => { win = null; });
  win.loadFile(path.join(__dirname, "app", "index.html"));
}

ipcMain.handle("launch-files", async () => {
  const paths = [...pdfArgs(process.argv), ...pending]; pending = [];
  const out = []; for(const p of paths){ const f = await readPdf(p); if(f) out.push(f); }
  return out;
});

ipcMain.handle("save-file", async (_e, { filename, bytes }) => {
  const isPng = /\.png$/i.test(filename);
  const r = process.env.EBODA_TEST_SAVE ? { filePath: process.env.EBODA_TEST_SAVE } : await dialog.showSaveDialog(win, {
    title: "Save",
    defaultPath: path.join(app.getPath("documents"), filename),
    filters: isPng ? [{ name: "PNG image", extensions: ["png"] }] : [{ name: "PDF document", extensions: ["pdf"] }]
  });
  if(r.canceled || !r.filePath) return { cancelled: true };
  try { await fs.writeFile(r.filePath, Buffer.from(bytes)); return { path: r.filePath }; }
  catch(err){ return { error: err.message }; }
});

// Printing: the renderer sends one image per page; a hidden window lays them out
// one per sheet and hands them to the normal Windows print dialog.
ipcMain.handle("print", async (_e, { title, pages }) => {
  const pw = new BrowserWindow({ show: false, parent: win, webPreferences: { sandbox: true } });
  try {
    const first = pages[0];
    const landscape = first.wpt > first.hpt;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${(title||"Eboda").replace(/[<&]/g,"")}</title>
<style>@page{margin:0}html,body{margin:0;padding:0}.pg{page-break-after:always;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;overflow:hidden}.pg:last-child{page-break-after:auto}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body>` +
      pages.map(p => `<div class="pg"><img src="${p.src}"></div>`).join("") + `</body></html>`;
    await pw.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    await new Promise(r => setTimeout(r, 300));
    if(process.env.EBODA_TEST_PRINT){ await pw.webContents.capturePage().then(img => fs.writeFile(process.env.EBODA_TEST_PRINT, img.toPNG())); return { ok: true, pages: pages.length }; }
    const ok = await new Promise(res => pw.webContents.print({ silent: false, printBackground: true, landscape, margins: { marginType: "none" } }, (success, reason) => res(success ? true : (reason || "cancelled"))));
    return ok === true ? { ok: true } : (ok === "cancelled" ? { cancelled: true } : { error: ok });
  } catch(err){ return { error: err.message }; }
  finally { if(!pw.isDestroyed()) pw.destroy(); }
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
