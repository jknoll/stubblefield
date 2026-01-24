/**
 * Svelte Application Entry Point
 *
 * This file mounts the Svelte application and initializes the UI layer.
 * The game engine (GameState, NoteRenderer, AudioManager) remains in
 * vanilla JS and is initialized by App.svelte.
 */

import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;
