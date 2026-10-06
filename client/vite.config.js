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
          if (!id.includes('node_modules')) return;
          // Match exact package names. A plain includes('react') would also pull
          // react-dropzone, react-icons, lucide-react etc. into the always-loaded chunk.
          const parts = id.split('node_modules/').pop().split('/');
          const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
          if (['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom'].includes(name)) return 'vendor-react';
          if (name.startsWith('@supabase/')) return 'vendor-supabase';
          if (['framer-motion', 'motion-dom', 'motion-utils'].includes(name)) return 'vendor-motion';
          if (name === 'recharts' || name.startsWith('d3-') || name === 'victory-vendor') return 'vendor-charts';
          // Everything else (pdfjs, tesseract, dropzone, icons...) is left to Rollup,
          // which places it with the pages that actually import it.
        }
      }
    }
  }
})
