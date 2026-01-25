import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 8080,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure game engine modules are not tree-shaken
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  // Preserve existing public assets
  publicDir: 'public',
  // Allow importing from js/ directory
  resolve: {
    alias: {
      '@': '/src',
      '@engine': '/js'
    }
  }
});
