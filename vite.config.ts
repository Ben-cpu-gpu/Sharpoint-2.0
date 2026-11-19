import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Écoute sur 0.0.0.0 pour accès immédiat depuis smartphone sur le même Wi-Fi
    port: 5173,
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'katex', 'lucide-react', 'framer-motion'],
  },
});
