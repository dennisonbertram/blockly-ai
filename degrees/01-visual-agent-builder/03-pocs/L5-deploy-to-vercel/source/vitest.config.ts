import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['app/layout.tsx', 'app/page.tsx', 'test/**', '*.config.*', '.next/**'],
    },
    // Inline Blockly's UMD bundles for ESM compatibility in tests
    deps: {
      optimizer: {
        web: {
          include: ['blockly'],
        },
      },
    },
  },
})
