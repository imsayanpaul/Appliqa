import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group core React and routing together
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // Group database client
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Group animation libraries
            if (id.includes('framer-motion') || id.includes('gsap')) {
              return 'vendor-animations';
            }
            // Group charting libraries
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            // Let Rollup automatically handle and code-split other libraries (like pdfjs-dist and tesseract.js)
          }
        }
      }
    }
  }
})
