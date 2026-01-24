<script>
  import { gameButtonLabel, startGame } from '../stores/uiStore.js';

  function handleClick() {
    startGame();
  }
</script>

<section class="controls-container">
  <button
    id="game-btn"
    class="btn btn-primary"
    on:click={handleClick}
  >
    <span class="btn-icon">{@html $gameButtonLabel.icon}</span>
    {$gameButtonLabel.text}
  </button>
</section>

<style>
  /* Styles inherited from main.css */
</style>
