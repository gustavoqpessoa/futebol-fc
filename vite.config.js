import { defineConfig } from 'vite';

// Base relativa para o build funcionar ao abrir o index gerado em qualquer pasta.
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2019', chunkSizeWarningLimit: 2000 },
});
