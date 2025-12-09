
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, __dirname, '');

  return {
    // Crucial for Chrome Extensions: use relative paths for assets
    base: './',
    define: {
      // Polyfill process.env for the Google GenAI SDK and App code
      // Use fallback to empty string to ensure variable exists even if not set in .env
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Define global process to avoid "process is not defined" error in some libs
      'process.env': {} 
    },
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'manifest.json',
            dest: '.'
          }
        ]
      })
    ],
    build: {
      outDir: 'dist',
      // Disable the module preload polyfill to prevent inline scripts (Fixes CSP error)
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          background: resolve(__dirname, 'background.js'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },
      },
    },
  };
});
