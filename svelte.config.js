import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Disable accessibility warnings for game UI
    // (many game elements don't follow standard a11y patterns)
    accessors: true
  }
};
