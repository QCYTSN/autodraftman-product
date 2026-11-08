import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [react()], publicDir: false, base: './',
  build: {
    outDir: '.presentation-build', emptyOutDir: true, cssCodeSplit: false,
    lib: { entry: 'src/features/presentation/standalone.tsx', name: 'FigFoxPresentation', formats: ['iife'], fileName: () => 'presentation.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
