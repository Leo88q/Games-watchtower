import { defineConfig } from 'vite'

/**
 * Отдельная сборка интерфейса под DOM-проверку (scripts/ui-smoke.mjs).
 * Обычная сборка кладёт ES-модули, которые jsdom выполнить не может,
 * поэтому здесь тот же код собирается в один IIFE-бандл во временный каталог.
 */
export default defineConfig({
  build: {
    outDir: 'dist-ui-smoke',
    emptyOutDir: true,
    lib: { entry: 'src/ios/main.js', name: 'WatchtowerUI', formats: ['iife'], fileName: () => 'ui.js' },
    rollupOptions: { output: { assetFileNames: 'ui.[ext]' } },
  },
})
