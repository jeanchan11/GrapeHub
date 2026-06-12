const fs = require("fs");
let code = fs.readFileSync("dist/server.js", "utf8");

// FIX 1: Fix the invalid regex in PUBLIC_ROUTES
// The patterns were injected as /^/api/... but need to be /^\/api\/...
code = code.replace(
  /\{ pattern: \/\^\/api\/ia-status-groups\/ \}/,
  '{ pattern: /^\\/api\\/ia-status-groups/ }'
);
code = code.replace(
  /\{ pattern: \/\^\/api\/onboarding-tasks\/ \}/,
  '{ pattern: /^\\/api\\/onboarding-tasks/ }'
);
code = code.replace(
  /\{ pattern: \/\^\/api\/visual-hub-status-groups\/ \}/,
  '{ pattern: /^\\/api\\/visual-hub-status-groups/ }'
);

console.log("FIX 1 done - fixed regex patterns");

// Verify fix
const pubBlock = code.slice(code.indexOf("PUBLIC_ROUTES"), code.indexOf("];", code.indexOf("PUBLIC_ROUTES")));
console.log("PUBLIC_ROUTES contains ia-status:", pubBlock.includes("ia-status-groups"));

fs.writeFileSync("dist/server.js", code);
console.log("Saved dist/server.js");
