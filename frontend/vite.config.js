import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window', // Polyfill for Node.js 'global' in browser environments
    process: { env: {} } // Polyfill for Node.js 'process'
  },
  resolve: {
    alias: {
      'buffer': 'buffer/', // Alias 'buffer' to the polyfill package
      'stream': 'stream-browserify', // Alias 'stream' to stream-browserify
      'util': 'util/' // Alias 'util' to util polyfill (note the trailing slash)
    }
  }
  //base: '/new-energy-company/', // Base path for GitHub Pages
})