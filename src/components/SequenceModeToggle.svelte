<script>
  import {
    sequenceMode,
    sequenceCurrentNote,
    sequenceCorrectHits,
    sequenceWrongHits,
    toggleSequenceMode,
    canChangeSettings,
    gamePhase
  } from '../stores/uiStore.js';

  // Calculate accuracy
  $: totalHits = $sequenceCorrectHits + $sequenceWrongHits;
  $: accuracy = totalHits > 0
    ? (($sequenceCorrectHits / totalHits) * 100).toFixed(1)
    : '100.0';
</script>

<div class="sequence-mode-section">
  <label class="sequence-toggle" class:disabled={!$canChangeSettings}>
    <input
      type="checkbox"
      checked={$sequenceMode}
      on:change={toggleSequenceMode}
      disabled={!$canChangeSettings}
    />
    <span class="toggle-slider"></span>
    <span class="toggle-label">Play in Order</span>
    <span class="toggle-hint">(timing disabled, hit correct instruments in sequence)</span>
  </label>

  {#if $sequenceMode && $gamePhase === 'playing'}
    <div class="sequence-stats">
      <span class="stat correct">Correct: {$sequenceCorrectHits}</span>
      <span class="stat wrong">Wrong: {$sequenceWrongHits}</span>
      <span class="stat accuracy">Accuracy: {accuracy}%</span>
    </div>
  {/if}
</div>

<style>
  .sequence-mode-section {
    padding: 10px;
    background: var(--surface-bg);
    border-radius: 8px;
    margin: 10px 0;
  }

  .sequence-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
  }

  .sequence-toggle.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sequence-toggle input {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 40px;
    height: 20px;
    background: var(--toggle-off-bg, #ccc);
    border-radius: 10px;
    transition: background 0.3s;
  }

  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
  }

  .sequence-toggle input:checked + .toggle-slider {
    background: var(--accent-color, #4CAF50);
  }

  .sequence-toggle input:checked + .toggle-slider::after {
    transform: translateX(20px);
  }

  .toggle-label {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-color);
  }

  .toggle-hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  .sequence-stats {
    display: flex;
    gap: 15px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
  }

  .stat {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .stat.correct {
    background: var(--success-bg, #d4edda);
    color: var(--success-text, #155724);
  }

  .stat.wrong {
    background: var(--error-bg, #f8d7da);
    color: var(--error-text, #721c24);
  }

  .stat.accuracy {
    background: var(--info-bg, #cce5ff);
    color: var(--info-text, #004085);
  }
</style>
