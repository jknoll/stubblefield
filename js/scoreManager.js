// Score calculation and tracking

import { GAME_CONFIG } from './constants.js';

export class ScoreManager {
  constructor() {
    this.totalScore = 0;
    this.combo = 0;
    this.maxCombo = 0;

    this.judgmentCounts = {
      PERFECT: 0,
      GOOD: 0,
      OK: 0,
      EARLY: 0,
      LATE: 0,
      MISS: 0,
      WRONG_NOTE: 0
    };

    this.totalNotes = 0;
    this.hitNotes = 0;

    // Callback for UI updates
    this.onScoreUpdate = null;
  }

  /**
   * Record a judgment from a hit
   * @param {Object} judgment - Judgment object from TimingJudge
   */
  recordJudgment(judgment) {
    // Update counts
    this.judgmentCounts[judgment.judgment]++;
    this.totalNotes++;

    // Calculate score with combo multiplier
    const baseScore = judgment.score;
    const comboMultiplier = 1 + (this.combo * GAME_CONFIG.COMBO_MULTIPLIER);
    const finalScore = Math.max(0, Math.floor(baseScore * comboMultiplier));

    this.totalScore += finalScore;

    // Update combo
    if (judgment.judgment === 'PERFECT' || judgment.judgment === 'GOOD') {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.hitNotes++;
    } else if (judgment.judgment === 'OK') {
      this.combo = 0;
      this.hitNotes++;
    } else {
      this.combo = 0;
    }

    // Notify UI
    this.notifyScoreUpdate();

    console.log(`Judgment: ${judgment.judgment}, Score: +${finalScore}, Combo: ${this.combo}`);
  }

  /**
   * Record a missed note
   */
  recordMiss() {
    this.judgmentCounts.MISS++;
    this.totalNotes++;
    this.combo = 0;

    this.notifyScoreUpdate();

    console.log('Miss! Combo reset.');
  }

  /**
   * Get current accuracy percentage
   * @returns {number} Accuracy (0-100)
   */
  getAccuracy() {
    if (this.totalNotes === 0) return 100;
    return Math.round((this.hitNotes / this.totalNotes) * 100);
  }

  /**
   * Get letter grade based on accuracy
   * @returns {string} Grade (S/A/B/C/D/F)
   */
  getGrade() {
    const accuracy = this.getAccuracy();

    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 80) return 'B';
    if (accuracy >= 70) return 'C';
    if (accuracy >= 60) return 'D';
    return 'F';
  }

  /**
   * Get final score summary
   * @returns {Object} Summary object
   */
  getSummary() {
    return {
      totalScore: this.totalScore,
      accuracy: this.getAccuracy(),
      grade: this.getGrade(),
      maxCombo: this.maxCombo,
      totalNotes: this.totalNotes,
      hitNotes: this.hitNotes,
      judgments: { ...this.judgmentCounts }
    };
  }

  /**
   * Reset all scores
   */
  reset() {
    this.totalScore = 0;
    this.combo = 0;
    this.maxCombo = 0;

    this.judgmentCounts = {
      PERFECT: 0,
      GOOD: 0,
      OK: 0,
      EARLY: 0,
      LATE: 0,
      MISS: 0,
      WRONG_NOTE: 0
    };

    this.totalNotes = 0;
    this.hitNotes = 0;

    this.notifyScoreUpdate();
  }

  /**
   * Notify UI of score changes
   */
  notifyScoreUpdate() {
    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        totalScore: this.totalScore,
        combo: this.combo,
        accuracy: this.getAccuracy(),
        judgments: this.judgmentCounts
      });
    }
  }
}
