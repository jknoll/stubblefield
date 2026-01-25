<script>
  import {
    score,
    combo,
    accuracy,
    judgments,
    currentPatternInfo,
    statsInfo,
    clearStats
  } from '../stores/uiStore.js';

  export let statsCanvas;

  function handleClearStats() {
    clearStats();
  }

  $: patternName = $currentPatternInfo?.name || '';
</script>

<section class="stats-score-row">
  <!-- Progress Tracking (Left) -->
  <div class="stats-panel">
    <div class="stats-header">
      <span id="stats-pattern-name" class="stats-pattern-name">
        {#if patternName}({patternName}){/if}
      </span>
      <button
        id="clear-stats-btn"
        class="btn btn-small btn-danger"
        title="Clear history"
        on:click={handleClearStats}
      >
        Clear
      </button>
    </div>
    <canvas
      id="stats-canvas"
      bind:this={statsCanvas}
      width="400"
      height="150"
    ></canvas>
    <div class="stats-info">
      <span id="stats-session-info">{$statsInfo}</span>
    </div>
  </div>

  <!-- Score Display (Right) -->
  <div class="score-panel">
    <div class="score-card">
      <div class="score-item">
        <label>Score</label>
        <span id="total-score" class="score-value">{$score}</span>
      </div>
      <div class="score-item">
        <label>Combo</label>
        <span id="combo" class="score-value">{$combo}</span>
      </div>
      <div class="score-item">
        <label>Accuracy</label>
        <span id="accuracy" class="score-value">{$accuracy}%</span>
      </div>
    </div>
    <div class="judgment-stats">
      <div class="judgment-item">
        <span class="judgment-label perfect">Perfect</span>
        <span id="perfect-count">{$judgments.perfect}</span>
      </div>
      <div class="judgment-item">
        <span class="judgment-label good">Good</span>
        <span id="good-count">{$judgments.good}</span>
      </div>
      <div class="judgment-item">
        <span class="judgment-label ok">OK</span>
        <span id="ok-count">{$judgments.ok}</span>
      </div>
      <div class="judgment-item">
        <span class="judgment-label miss">Miss</span>
        <span id="miss-count">{$judgments.miss}</span>
      </div>
    </div>
  </div>
</section>

<style>
  /* Styles inherited from main.css */
</style>
