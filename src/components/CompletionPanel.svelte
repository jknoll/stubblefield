<script>
  import {
    showCompletion,
    finalScore,
    finalGrade,
    finalCombo
  } from '../stores/uiStore.js';
</script>

<section
  id="completion-panel"
  class="completion-panel"
  class:hidden={!$showCompletion}
>
  <h3>Attempt Complete!</h3>
  <div class="final-stats">
    <div class="stat-item">
      <label>Final Score</label>
      <span id="final-score" class="stat-value">{$finalScore}</span>
    </div>
    <div class="stat-item">
      <label>Grade</label>
      <span id="final-grade" class="stat-value grade">{$finalGrade}</span>
    </div>
    <div class="stat-item">
      <label>Max Combo</label>
      <span id="final-combo" class="stat-value">{$finalCombo}</span>
    </div>
  </div>
</section>

<style>
  /* Styles inherited from main.css */
</style>
