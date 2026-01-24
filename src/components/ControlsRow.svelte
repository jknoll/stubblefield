<script>
  import {
    bpm,
    pattern,
    loopCount,
    patterns,
    patternCategories,
    canChangeSettings,
    setBpm,
    setPattern,
    setLoopCount,
    quantizePattern
  } from '../stores/uiStore.js';

  export let metronomeCanvas;

  function handleBpmSlider(e) {
    setBpm(parseInt(e.target.value));
  }

  function handleBpmUp() {
    if ($canChangeSettings) {
      setBpm(Math.min(200, $bpm + 1));
    }
  }

  function handleBpmDown() {
    if ($canChangeSettings) {
      setBpm(Math.max(30, $bpm - 1));
    }
  }

  function handlePatternChange(e) {
    setPattern(e.target.value);
  }

  function handleLoopChange(e) {
    setLoopCount(e.target.value);
  }

  function handleQuantize() {
    quantizePattern();
  }

  // Group patterns by category
  $: groupedPatterns = $patternCategories.map(category => ({
    category,
    patterns: $patterns.filter(p => p.category === category)
  })).filter(g => g.patterns.length > 0);
</script>

<section class="controls-row">
  <canvas
    id="metronome-canvas"
    bind:this={metronomeCanvas}
    width="300"
    height="60"
    style="display: none;"
  ></canvas>

  <div class="tempo-control">
    <button
      id="bpm-down"
      class="bpm-btn"
      on:click={handleBpmDown}
      disabled={!$canChangeSettings}
    >-</button>
    <span class="tempo-display">
      <span id="bpm-display">{$bpm}</span> BPM
    </span>
    <button
      id="bpm-up"
      class="bpm-btn"
      on:click={handleBpmUp}
      disabled={!$canChangeSettings}
    >+</button>
  </div>

  <input
    type="range"
    id="bpm-slider"
    min="30"
    max="200"
    value={$bpm}
    step="1"
    on:input={handleBpmSlider}
    disabled={!$canChangeSettings}
  />

  <select
    id="pattern-select"
    value={$pattern}
    on:change={handlePatternChange}
    disabled={!$canChangeSettings}
  >
    {#each groupedPatterns as group}
      <optgroup label={group.category}>
        {#each group.patterns as p}
          <option value={p.id}>{p.name}</option>
        {/each}
      </optgroup>
    {/each}
  </select>

  <select
    id="loop-count"
    value={$loopCount}
    on:change={handleLoopChange}
    disabled={!$canChangeSettings}
  >
    <option value="1">1x</option>
    <option value="2">2x</option>
    <option value="4">4x</option>
    <option value="8">8x</option>
    <option value="16">16x</option>
    <option value="infinite">∞</option>
  </select>

  <button
    id="quantize-btn"
    class="btn btn-small"
    title="Snap pattern notes to grid"
    on:click={handleQuantize}
    disabled={!$canChangeSettings}
  >
    Quantize
  </button>
</section>

<style>
  /* Styles inherited from main.css */
</style>
