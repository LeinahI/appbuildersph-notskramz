import { createReadStream, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
/** onnxruntime-web's dist folder: the same copy Transformers.js uses, so the runtime always matches the library. */
const ORT_DIST = dirname(createRequire(require.resolve('@huggingface/transformers')).resolve('onnxruntime-web'));
/** The runtime builds Transformers.js picks from: asyncify by default, the plain one on old Safari without WebGPU. */
const ORT_FILES = ['ort-wasm-simd-threaded.asyncify', 'ort-wasm-simd-threaded'].flatMap((n) => [`${n}.wasm`, `${n}.mjs`]);

/**
 * Serves the ONNX runtime from this app at /ort/, so the phone AI never fetches it from a CDN. `pnpm dev` streams the
 * files from node_modules; a build writes them into dist/ort/. They load only when the farmer prepares the AI.
 */
function localOnnxRuntime(): Plugin {
  return {
    name: 'ugatan-local-onnxruntime',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/ort/', (req, res, next) => {
        const name = (req.url ?? '').split('?')[0]!.replace(/^\//, '');
        if (!ORT_FILES.includes(name)) return next();
        res.setHeader('content-type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        createReadStream(join(ORT_DIST, name)).pipe(res);
      });
    },
    generateBundle() {
      for (const name of ORT_FILES) {
        this.emitFile({ type: 'asset', fileName: `ort/${name}`, source: readFileSync(join(ORT_DIST, name)) });
      }
    },
  };
}

// `--mode native` builds the Android app (Capacitor). Its files are already inside the APK, so it needs no service
// worker; the browser build stays an installable PWA.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    localOnnxRuntime(),
    VitePWA({
      disable: mode === 'native',
      // Installs from a link and works offline after the first visit. Nothing is fetched from the internet: the app,
      // the knowledge base, and the fonts are bundled, the phone model comes from the hub, and the runtime from /ort/.
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ugatan: Offline na Payo para sa Palay at Mais',
        short_name: 'Ugatan',
        description: 'Offline na payo para sa palay at mais. Walang account, walang server.',
        lang: 'tl',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f1f5ee',
        theme_color: '#1f5c2e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        // The admin UI preview is its own page, not the farmer app shell.
        navigateFallbackDenylist: [/\/admin\.html$/],
        // The ONNX runtime (about 41 MB) is not precached: most farmers never prepare the AI. It is kept after the
        // first load from /ort/, so the model can start again with no hub. Transformers.js caches the weights itself.
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.includes('/ort/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'onnxruntime-web',
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  // Always http://localhost:3000, for `pnpm dev` and `preview`. strictPort stops with an error when 3000 is taken
  // instead of moving to another port.
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  worker: { format: 'es' },
  // The workers load these on "Ihanda ang AI". Listed here so `pnpm dev` does not find them then and reload the page.
  optimizeDeps: { include: ['@huggingface/transformers', '@huggingface/tokenizers', 'onnxruntime-web/webgpu'] },
  build: {
    target: 'es2022',
    rollupOptions: {
      // The browser build also ships the admin UI preview page (admin.html); the Android app has no staff pages.
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        ...(mode === 'native' ? {} : { admin: fileURLToPath(new URL('./admin.html', import.meta.url)) }),
      } as Record<string, string>,
    },
  },
}));
