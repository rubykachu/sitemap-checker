import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        beta: resolve(__dirname, 'beta.html'),
        v101: resolve(__dirname, 'v1.0.1.js')
      }
    }
  }
})
