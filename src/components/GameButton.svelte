<script>
  import { gameButtonLabel, gamePhase, startGame } from '../stores/uiStore.js';

  function handleClick() {
    startGame();
  }

  $: tooltip = {
    ready: 'Click to start playing the pattern',
    playing: 'Click to pause',
    paused: 'Click to resume',
    complete: 'Click to start again'
  }[$gamePhase] || 'Click to start';
</script>

<section class="controls-container">
  <button
    id="game-btn"
    class="btn btn-primary"
    on:click={handleClick}
    title={tooltip}
  >
    <span class="btn-icon">{@html $gameButtonLabel.icon}</span>
    {$gameButtonLabel.text}
  </button>
</section>

<style>
  /* Styles inherited from main.css */
</style>
