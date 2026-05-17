import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Required: Blockly ships .mjs wrappers around pre-compiled UMD bundles.
    // Vite's pre-bundler must handle these in CJS compatibility mode.
    include: ['blockly', 'blockly/core', 'blockly/blocks', 'blockly/javascript'],
  },
})
