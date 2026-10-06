import { defineConfig } from 'vite'

/** One-file browser bundle for the Cosmos UI DOM smoke test. */
export default defineConfig({
  build: {
    outDir: 'dist-cosmos-smoke',
    emptyOutDir: true,
    lib: { entry: 'src/cosmos/main.js', name: 'WatchtowerCosmos', formats: ['iife'], fileName: () => 'cosmos.js' },
    rollupOptions: { output: { assetFileNames: 'cosmos.[ext]' } },
  },
})
