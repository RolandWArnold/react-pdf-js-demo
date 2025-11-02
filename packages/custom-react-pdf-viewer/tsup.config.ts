import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  minify: true,
  splitting: false,
  outDir: 'dist',
  external: ['react', 'react-dom', 'pdfjs-dist'],
  target: 'es2023',
  cssModules: true,
});