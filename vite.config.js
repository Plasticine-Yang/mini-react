/* eslint-env node */
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'mini-react': resolve(__dirname, 'src/lib'),
    },
  },
  plugins: [react({ jsxRuntime: 'classic' })],
})
