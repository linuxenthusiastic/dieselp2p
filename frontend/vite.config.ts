import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) return 'map';
          if (id.includes('node_modules/react') || id.includes('node_modules/@tanstack')) return 'vendor';
          return undefined;
        },
      },
    },
  },
});
