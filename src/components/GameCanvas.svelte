<script>
  export let canvas;
</script>

<section class="game-container">
  <canvas
    id="game-canvas"
    bind:this={canvas}
    width="800"
    height="360"
  ></canvas>

  <!-- Countdown Overlay -->
  <div id="countdown-overlay" class="countdown-overlay"></div>

  <!-- Hit Feedback Overlay -->
  <div id="hit-feedback" class="hit-feedback"></div>
</section>

<style>
  /* Styles inherited from game.css */
</style>
