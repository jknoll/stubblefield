<script>
  import {
    bpm,
    pattern,
    loopCount,
    patterns,
    patternCategories,
    canChangeSettings,
    isQuantized,
    setBpm,
    setPattern,
    setLoopCount,
    toggleQuantize
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
    toggleQuantize();
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

  <div class="tempo-control" title="Beats per minute - controls playback speed">
    <button
      id="bpm-down"
      class="bpm-btn"
      on:click={handleBpmDown}
      disabled={!$canChangeSettings}
      title="Decrease BPM"
    >-</button>
    <span class="tempo-display">
      <span id="bpm-display">{$bpm}</span> BPM
    </span>
    <button
      id="bpm-up"
      class="bpm-btn"
      on:click={handleBpmUp}
      disabled={!$canChangeSettings}
      title="Increase BPM"
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
    title="Drag to adjust tempo (30-200 BPM)"
  />

  <select
    id="pattern-select"
    value={$pattern}
    on:change={handlePatternChange}
    disabled={!$canChangeSettings}
    title="Select a drum pattern to practice"
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
    title="Number of times to repeat the pattern (∞ = infinite loop)"
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
    class:active={$isQuantized}
    title={$isQuantized ? "Click to restore original timing" : "Snap pattern notes to grid"}
    on:click={handleQuantize}
    disabled={!$canChangeSettings}
  >
    {$isQuantized ? 'Quantize ✓' : 'Quantize'}
  </button>
</section>

<style>
  /* Styles inherited from main.css */

  /* Active state for quantize toggle */
  :global(#quantize-btn.active) {
    background: var(--accent-primary, #00e5ff);
    color: var(--bg-primary, #0a0a0f);
    border-color: var(--accent-primary, #00e5ff);
  }

  :global(#quantize-btn.active:hover) {
    background: var(--accent-secondary, #00b8d4);
    border-color: var(--accent-secondary, #00b8d4);
  }
</style>
