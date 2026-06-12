const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// PROBLEM 1: IA routes are nested inside the visual-hub reorder catch block
// We need to close the visual-hub reorder handler BEFORE the IA routes start
// Current: ...res.status(500).json({ error: 'Erro ao reordenar.' });\n\n  // ── IA Status Groups API ──
// Should:  ...res.status(500).json({ error: 'Erro ao reordenar.' });\n    }\n  });\n\n  // ── IA Status Groups API ──

const badPattern = "res.status(500).json({ error: 'Erro ao reordenar.' });\n\n  // \u2500\u2500 IA Status Groups API \u2500\u2500";
const fixedPattern = "res.status(500).json({ error: 'Erro ao reordenar.' });\n    }\n  });\n\n  // \u2500\u2500 IA Status Groups API \u2500\u2500";
if (code.includes(badPattern)) {
  code = code.replace(badPattern, fixedPattern);
  console.log("FIX 1: Closed visual-hub reorder handler before IA routes");
} else {
  console.log("FIX 1: Pattern not found (may already be fixed)");
}

// PROBLEM 2: Extra closing braces at end of IA reorder route
// Current: ...});\n    }\n  });\n
// Should:  ...});\n
const badEnd = "  });\n    }\n  });\n";
const fixedEnd = "  });\n";
// Find from end of IA reorder section
const iaReorderIdx = code.indexOf("PUT /api/ia-status-groups/reorder error:");
if (iaReorderIdx !== -1) {
  const afterReorder = code.indexOf("  });\n", iaReorderIdx);
  if (afterReorder !== -1) {
    const slice = code.slice(afterReorder, afterReorder + 30);
    if (slice.includes("  });\n    }\n  });")) {
      code = code.slice(0, afterReorder) + "  });\n" + code.slice(afterReorder + badEnd.length);
      console.log("FIX 2: Removed extra closing braces after IA reorder");
    } else {
      console.log("FIX 2: Extra braces pattern not found. Slice:", JSON.stringify(slice));
    }
  }
}

// PROBLEM 3: Fix PUBLIC_ROUTES regex patterns that esbuild corrupts
// Replace regex literals with new RegExp() constructor
code = code.replace(
  "{ pattern: /^\\/api\\/ia-status-groups/ }",
  "{ pattern: new RegExp('^/api/ia-status-groups') }"
);
code = code.replace(
  "{ pattern: /^\\/api\\/onboarding-tasks/ }",
  "{ pattern: new RegExp('^/api/onboarding-tasks') }"
);
code = code.replace(
  "{ pattern: /^\\/api\\/visual-hub-status-groups/ }",
  "{ pattern: new RegExp('^/api/visual-hub-status-groups') }"
);
console.log("FIX 3: Converted regex literals to new RegExp() for esbuild safety");

fs.writeFileSync("server.ts", code);
console.log("DONE - All fixes applied to server.ts");
