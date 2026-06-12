/**
 * BASE44 client bootstrap for Node seed scripts.
 *
 * The browser app uses serverUrl: '' so axios hits /api and Vite proxies to
 * VITE_BASE44_APP_BASE_URL. Node has no proxy — use appBaseUrl as serverUrl
 * so requests target {appBaseUrl}/api/... (same effective endpoint).
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@base44/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '../..');

export function loadEnvFile(filename) {
  const path = resolve(appRoot, filename);
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function pickEnvValue(env, keys) {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * @returns {URL}
 */
export function parseAppBaseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error(
      `VITE_BASE44_APP_BASE_URL is not a valid URL: "${raw}". Expected e.g. https://your-app.base44.app`,
    );
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `VITE_BASE44_APP_BASE_URL must use http or https (got ${parsed.protocol}).`,
    );
  }
  return parsed;
}

/**
 * Load seed config from .env / .env.local (same variables as the Vite app).
 */
export function loadSeedConfig() {
  const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };

  const appId = pickEnvValue(env, ['VITE_BASE44_APP_ID']);
  const appBaseUrlRaw = pickEnvValue(env, ['VITE_BASE44_APP_BASE_URL']);
  const token = pickEnvValue(env, [
    'BASE44_ACCESS_TOKEN',
    'VITE_BASE44_ACCESS_TOKEN',
    'token',
  ]);
  const functionsVersion = pickEnvValue(env, ['VITE_BASE44_FUNCTIONS_VERSION']);

  if (!appId) {
    throw new Error('Missing VITE_BASE44_APP_ID in .env.local');
  }
  if (!appBaseUrlRaw) {
    throw new Error('Missing VITE_BASE44_APP_BASE_URL in .env.local');
  }

  const appBaseUrlParsed = parseAppBaseUrl(appBaseUrlRaw);
  const appBaseUrl = appBaseUrlParsed.origin;

  return {
    appId,
    appBaseUrl,
    token,
    functionsVersion,
  };
}

/**
 * Mirrors src/api/base44Client.js options, except serverUrl uses appBaseUrl in Node.
 */
export function buildSdkConfig(config) {
  return {
    appId: config.appId,
    token: config.token,
    ...(config.functionsVersion ? { functionsVersion: config.functionsVersion } : {}),
    serverUrl: config.appBaseUrl,
    requiresAuth: false,
    appBaseUrl: config.appBaseUrl,
  };
}

export function logSeedConfig(config) {
  const sdkConfig = buildSdkConfig(config);
  console.log('BASE44 seed configuration:');
  console.log(`  appId: ${config.appId}`);
  console.log(`  appBaseUrl: ${config.appBaseUrl}`);
  console.log(`  token present: ${Boolean(config.token)}`);
  console.log(`  SDK config keys: ${Object.keys(sdkConfig).join(', ')}`);
  console.log(`  API base (effective): ${config.appBaseUrl}/api`);
}

export function assertAccessToken(config) {
  if (config.token) return;

  console.error(`
BASE44_ACCESS_TOKEN is required to seed pilot data.

How to obtain it:
  1. Run the app: pnpm dev
  2. Sign in at http://localhost:5173
  3. Open DevTools → Application → Local Storage → http://localhost:5173
  4. Copy the value of "base44_access_token"
  5. Add to apps/web/.env.local:

     BASE44_ACCESS_TOKEN=paste_token_here

Then re-run: pnpm seed:pilot
`);
  process.exit(1);
}

export function createSeedClient(config) {
  return createClient(buildSdkConfig(config));
}
