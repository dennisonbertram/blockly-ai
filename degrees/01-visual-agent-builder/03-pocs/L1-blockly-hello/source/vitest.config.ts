import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/main.tsx', 'test/**', '*.config.*'],
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
