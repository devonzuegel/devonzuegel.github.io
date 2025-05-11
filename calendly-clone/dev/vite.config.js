import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to add cache-busting query parameters to JS and CSS assets
function cacheBusterPlugin() {
  return {
    name: 'cache-buster',
    writeBundle(options, bundle) {
      const outDir = options.dir || '../../calendar'
      const indexPath = path.resolve(outDir, 'index.html')

      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8')

        // Generate a random string for cache busting
        const cacheBuster = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)

        // Add query parameter to CSS and JS file references
        html = html.replace(/(src="\.\/assets\/.*?\.js)"/g, `$1?v=${cacheBuster}"`)
        html = html.replace(/(href="\.\/assets\/.*?\.css)"/g, `$1?v=${cacheBuster}"`)

        fs.writeFileSync(indexPath, html)
        console.log(`✅ Added cache-busting parameters to assets (v=${cacheBuster})`)
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    cacheBusterPlugin()
  ],
  base: './', // Use relative paths instead of absolute
  build: {
    outDir: '../../calendar',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})