<script>
  import {
    showCompletion,
    finalScore,
    finalGrade,
    finalCombo,
    accuracy,
    judgments
  } from '../stores/uiStore.js';

  // Calculate total notes for display
  $: totalNotes = $judgments.perfect + $judgments.good + $judgments.ok + $judgments.miss;
</script>

<section
  id="completion-panel"
  class="completion-panel"
  class:hidden={!$showCompletion}
>
  <div class="completion-summary">
    <span class="completion-title">Complete!</span>
    <span class="completion-score" title="Final score achieved">
      {$finalScore.toLocaleString()}
    </span>
    <span class="completion-grade grade-{$finalGrade.toLowerCase()}" title="Performance grade based on accuracy">
      ({$finalGrade})
    </span>
    <span class="completion-separator">|</span>
    <span class="completion-combo" title="Best combo streak / total notes in pattern">
      Combo: {$finalCombo}/{totalNotes}
    </span>
    <span class="completion-separator">|</span>
    <span class="completion-accuracy" title="Percentage of notes hit within timing window">
      {$accuracy}%
    </span>
  </div>
</section>

<style>
  .completion-panel {
    display: flex;
    justify-content: center;
    padding: 8px 16px;
    background: linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(255, 0, 128, 0.15));
    border: 1px solid var(--accent-primary, #00e5ff);
    border-radius: 8px;
    margin: 8px 0;
  }

  .completion-panel.hidden {
    display: none;
  }

  .completion-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 16px;
    font-weight: 500;
  }

  .completion-title {
    color: var(--accent-primary, #00e5ff);
    font-weight: bold;
  }

  .completion-score {
    color: var(--text-primary, #fff);
    font-weight: bold;
  }

  .completion-grade {
    font-weight: bold;
  }

  .grade-s, .grade-a { color: #00ff88; }
  .grade-b { color: #ffff00; }
  .grade-c { color: #ffa500; }
  .grade-d, .grade-f { color: #ff4444; }

  .completion-separator {
    color: var(--text-muted, #666);
  }

  .completion-combo,
  .completion-accuracy {
    color: var(--text-secondary, #aaa);
  }
</style>
