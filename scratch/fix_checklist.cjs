const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

const marker = "{ pattern: new RegExp('^/api/visual-hub-status-groups') },";
const idx = code.indexOf(marker);
if (idx === -1) {
  console.log("MARKER NOT FOUND");
  process.exit(1);
}

// Check if already added
if (code.includes("crm-checklist")) {
  const prStart = code.indexOf("PUBLIC_ROUTES");
  const prEnd = code.indexOf("];", prStart);
  const prBlock = code.slice(prStart, prEnd);
  if (prBlock.includes("crm-checklist")) {
    console.log("Already patched!");
    process.exit(0);
  }
}

const endPos = idx + marker.length;
const newRoutes = "\n  { pattern: new RegExp('^/api/crm-checklist') },\n  { pattern: new RegExp('^/api/crm-checklist-template') },";
code = code.slice(0, endPos) + newRoutes + code.slice(endPos);
fs.writeFileSync("server.ts", code);
console.log("OK - Added crm-checklist and crm-checklist-template to PUBLIC_ROUTES");
