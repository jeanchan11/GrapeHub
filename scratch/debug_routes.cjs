const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// The esbuild is corrupting regex literals like /^\/api\/ia-status-groups/
// because esbuild strips unnecessary escapes in regex.
// Solution: keep using regex literals but ensure they compile correctly.
// Actually the issue is that esbuild output /^/api/ia-status-groups/ 
// which is invalid. This happens because \/ in regex is optional escape,
// esbuild strips it.
// We need to use a different approach: [/] instead of \/

// Fix in server.ts: replace \/ with [/] in our added patterns
code = code.replace(
  "{ pattern: /^\\/api\\/ia-status-groups/ }",
  "{ pattern: /^\\/api\\/ia-status-groups/ }"
);

// Actually let's just check what the current patterns look like
const pubStart = code.indexOf("PUBLIC_ROUTES");
const pubEnd = code.indexOf("];", pubStart);
const pubBlock = code.slice(pubStart, pubEnd + 2);
console.log("Current PUBLIC_ROUTES block:");
console.log(pubBlock);
