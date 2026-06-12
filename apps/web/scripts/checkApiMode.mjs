#!/usr/bin/env node
/**
 * Smoke-check GRADERA API connectivity for local integration (Mode B).
 *
 * Usage (from apps/web):
 *   pnpm check:api
 *
 * Requires VITE_API_BASE_URL in .env.local or .env.
 * Works without Bearer token when apps/api has DEV_AUTH_BYPASS=true.
 */

import { loadWebEnv } from './lib/loadEnv.mjs';
import {
  API_BASE_URL_MISSING_MESSAGE,
  resolveApiBaseUrl,
  runApiSmokeChecks,
} from '../src/lib/apiIntegrationCheck.js';

function printResult(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${result.label} — ${result.url}`);
  console.log(`       ${result.detail}${result.status ? ` (${result.status})` : ''}`);
}

async function main() {
  const env = loadWebEnv();
  const apiBaseUrl = resolveApiBaseUrl(env);

  if (!apiBaseUrl) {
    console.error(`\n${API_BASE_URL_MISSING_MESSAGE}\n`);
    process.exit(1);
  }

  console.log(`GRADERA API smoke check`);
  console.log(`API base: ${apiBaseUrl}`);
  console.log(
    `Auth: no Bearer token (expects apps/api DEV_AUTH_BYPASS=true for protected routes)\n`,
  );

  const results = await runApiSmokeChecks(apiBaseUrl);
  results.forEach(printResult);

  const failed = results.filter((result) => !result.ok);
  console.log('');

  if (failed.length === 0) {
    console.log('All checks passed.');
    process.exit(0);
  }

  console.log(`${failed.length} check(s) failed.`);
  if (failed.some((result) => result.status === 401)) {
    console.log(
      'Hint: Start apps/api with DEV_AUTH_BYPASS=true, or provide a Bearer token.',
    );
  }
  if (failed.some((result) => result.status === 0)) {
    console.log('Hint: Is gradera-api running? pnpm --filter gradera-api dev');
  }

  process.exit(1);
}

main();
