// Stamp the icon and version details into Eboda.exe without wine (uses pure-JS resedit).
const fs = require("node:fs");
const path = require("node:path");
module.exports = async ctx => {
  if(ctx.electronPlatformName !== "win32") return;
  const ResEdit = require("resedit");
  const exe = path.join(ctx.appOutDir, "Eboda.exe");
  const pkg = require("./package.json");
  const data = fs.readFileSync(exe);
  const pe = ResEdit.NtExecutable.from(data);
  const res = ResEdit.NtExecutableResource.from(pe);
  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, "icon.ico")));
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, icon.icons.map(i => i.data));
  const vi = ResEdit.Resource.VersionInfo.createEmpty();
  const [a,b,c] = pkg.version.split(".").map(Number);
  vi.setFileVersion(a,b,c,0, 1033); vi.setProductVersion(a,b,c,0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    FileDescription: "Eboda PDF reader and editor", ProductName: "Eboda", CompanyName: pkg.author,
    LegalCopyright: `MIT licence, ${pkg.author}`, OriginalFilename: "Eboda.exe", InternalName: "Eboda",
    FileVersion: pkg.version, ProductVersion: pkg.version
  });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log("  • stamped icon and version info into Eboda.exe");
};
