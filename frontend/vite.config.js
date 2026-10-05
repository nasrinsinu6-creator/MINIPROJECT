import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const tempDir = process.env.TEMP || process.env.TMP || 'C:/Temp'
const cacheDir = path.resolve(tempDir, 'vite-cache')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir,
  server: {
    port: 5173,
    host: true
  }
})
