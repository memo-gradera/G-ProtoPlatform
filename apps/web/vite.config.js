import path from 'node:path';
import { fileURLToPath } from 'node:url';
import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shouldEnableBase44Plugin(env) {
  if (env.VITE_DEV_AUTH_BYPASS === 'true') {
    return false;
  }
  const authProvider = (env.VITE_AUTH_PROVIDER || '').toLowerCase();
  const backendProvider = (env.VITE_BACKEND_PROVIDER || '').toLowerCase();
  if (authProvider === 'msal' || backendProvider === 'api') {
    return false;
  }
  return true;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const useBase44Plugin = shouldEnableBase44Plugin(env);

  if (!useBase44Plugin) {
    console.info(
      '[GRADERA] BASE44 Vite plugin disabled (MSAL/API mode). No /api/apps proxy or analytics.',
    );
  }

  return {
    logLevel: 'error',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
    plugins: [
      ...(useBase44Plugin
        ? [
            base44({
              legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
              hmrNotifier: true,
              navigationNotifier: true,
              analyticsTracker: true,
              visualEditAgent: true,
            }),
          ]
        : []),
      react(),
    ],
  };
});
