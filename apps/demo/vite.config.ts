import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],

  // Add these options below:
  build: {
    target: 'es2023' // Set target for production builds
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2023' // Set target for dependency pre-bundling in dev
    }
  }
})