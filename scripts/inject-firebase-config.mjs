#!/usr/bin/env node
/**
 * Post-build script: injects Firebase config into dist/index.html
 * 
 * This ensures the Firebase config is available even when LiteSpeed/CDN
 * serves the HTML directly without passing through Express.
 * 
 * Usage: node scripts/inject-firebase-config.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env manually (simple parser, no dotenv dependency needed)
function loadEnv(envPath) {
  const vars = {};
  if (!fs.existsSync(envPath)) return vars;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

const env = loadEnv(path.join(rootDir, '.env'));

const config = {
  FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || '',
  FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || '',
  FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_FIRESTORE_DATABASE_ID: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)',
};

// Validate that we have at least the critical keys
const critical = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID'];
const missing = critical.filter(k => !config[k]);
if (missing.length > 0) {
  console.warn(`[inject-firebase-config] ⚠️  Variáveis ausentes no .env: ${missing.join(', ')}`);
  console.warn(`[inject-firebase-config] ℹ️  Isso é OK — o servidor injeta essas variáveis em runtime via setupStaticServing.`);
  console.warn(`[inject-firebase-config] ℹ️  Pulando injeção no build. O dist/index.html será injetado pelo servidor ao servir.`);
  process.exit(0); // Exit successfully — not a fatal error
}

const indexPath = path.join(rootDir, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error(`[inject-firebase-config] ❌ ERRO: dist/index.html não encontrado. Execute 'vite build' primeiro.`);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Check if already injected (idempotent)
if (html.includes('window.FIREBASE_CONFIG')) {
  console.log('[inject-firebase-config] ⚠️  Firebase config já injetado, substituindo...');
  // Remove the existing injection block
  html = html.replace(/\s*<script>\s*\/\/ \[INJECTED BY inject-firebase-config\][\s\S]*?<\/script>\s*/g, '');
}

const injection = `
    <script>
      // [INJECTED BY inject-firebase-config]
      window.FIREBASE_CONFIG = ${JSON.stringify(config)};
      window.FIREBASE_API_KEY = ${JSON.stringify(config.FIREBASE_API_KEY)};
      window.FIREBASE_AUTH_DOMAIN = ${JSON.stringify(config.FIREBASE_AUTH_DOMAIN)};
      window.FIREBASE_PROJECT_ID = ${JSON.stringify(config.FIREBASE_PROJECT_ID)};
      window.FIREBASE_APP_ID = ${JSON.stringify(config.FIREBASE_APP_ID)};
      window.FIREBASE_STORAGE_BUCKET = ${JSON.stringify(config.FIREBASE_STORAGE_BUCKET)};
      window.FIREBASE_FIRESTORE_DATABASE_ID = ${JSON.stringify(config.FIREBASE_FIRESTORE_DATABASE_ID)};
    </script>`;

html = html.replace('</head>', `${injection}\n</head>`);

fs.writeFileSync(indexPath, html, 'utf8');

console.log('[inject-firebase-config] ✅ Firebase config injetado em dist/index.html');
console.log('[inject-firebase-config]    API Key: ' + config.FIREBASE_API_KEY.slice(0, 8) + '...');
console.log('[inject-firebase-config]    Project: ' + config.FIREBASE_PROJECT_ID);
