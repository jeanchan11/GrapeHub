const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// Check if already patched
if (code.includes("ia-status-groups") && code.includes("pattern: /^\\/api\\/ia-status-groups/")) {
  // Check if it's in PUBLIC_ROUTES
  const prIdx = code.indexOf("PUBLIC_ROUTES");
  const prEnd = code.indexOf("];", prIdx);
  const prBlock = code.slice(prIdx, prEnd);
  if (prBlock.includes("ia-status-groups")) {
    console.log("Already patched!");
    process.exit(0);
  }
}

const marker = "{ pattern: /^\\/api\\/finance\\/dispatch\\/callback$/, method: 'POST' },";
const idx = code.indexOf(marker);
if (idx === -1) {
  console.log("MARKER NOT FOUND");
  process.exit(1);
}
const endPos = idx + marker.length;
const newRoutes = "\n  { pattern: /^\\/api\\/ia-status-groups/ },\n  { pattern: /^\\/api\\/onboarding-tasks/ },\n  { pattern: /^\\/api\\/visual-hub-status-groups/ },";
code = code.slice(0, endPos) + newRoutes + code.slice(endPos);
fs.writeFileSync("server.ts", code);
console.log("OK - Added 3 routes to PUBLIC_ROUTES in server.ts");
