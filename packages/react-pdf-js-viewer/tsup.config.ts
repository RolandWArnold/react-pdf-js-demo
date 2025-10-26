import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/style.css'],
  format: ['cjs', 'esm'], // Build for commonJS and ESmodules
  dts: true, // Generate typescript declaration files
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'], // Don't bundle react
});