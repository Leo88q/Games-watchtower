import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // старый тёмный дашборд остаётся доступен как index.html,
        // новый белый iOS-интерфейс — основной продукт (ios.html, он же отдаётся на "/")
        index: resolve(process.cwd(), 'index.html'),
        ios: resolve(process.cwd(), 'ios.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/metrics': 'http://127.0.0.1:8787',
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
