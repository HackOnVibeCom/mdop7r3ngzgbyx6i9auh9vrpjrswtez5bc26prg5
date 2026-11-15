import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2019',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) return 'three'
            if (id.includes('leaflet')) return 'leaflet'
            if (id.includes('html-to-image') || id.includes('qrcode')) return 'cards'
          }
          return undefined
        },
      },
    },
  },
})
