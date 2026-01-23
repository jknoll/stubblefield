// Scoring system tests

import { assert } from './testRunner.js';
import { ScoreManager } from '../scoreManager.js';

export function registerScoringTests(runner) {
  runner.test('ScoreManager: initial state is zero', () => {
    const manager = new ScoreManager();
    assert.equal(manager.totalScore, 0, 'Initial score should be 0');
    assert.equal(manager.combo, 0, 'Initial combo should be 0');
    assert.equal(manager.maxCombo, 0, 'Initial max combo should be 0');
  });

  runner.test('ScoreManager: PERFECT judgment gives most points', () => {
    const manager = new ScoreManager();
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    const perfectScore = manager.totalScore;

    const manager2 = new ScoreManager();
    manager2.recordJudgment({ judgment: 'GOOD', score: 75 });
    const goodScore = manager2.totalScore;

    assert.greaterThan(perfectScore, goodScore, 'PERFECT should score more than GOOD');
  });

  runner.test('ScoreManager: combo increases on PERFECT and GOOD', () => {
    const manager = new ScoreManager();
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    assert.equal(manager.combo, 1, 'Combo should be 1 after PERFECT');

    manager.recordJudgment({ judgment: 'GOOD', score: 75 });
    assert.equal(manager.combo, 2, 'Combo should be 2 after GOOD');

    // Note: OK resets combo in this implementation
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    assert.equal(manager.combo, 3, 'Combo should be 3 after another PERFECT');
  });

  runner.test('ScoreManager: MISS breaks combo', () => {
    const manager = new ScoreManager();
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    assert.equal(manager.combo, 2, 'Combo should be 2');

    manager.recordJudgment({ judgment: 'MISS', score: 0 });
    assert.equal(manager.combo, 0, 'Combo should reset to 0 after miss');
  });

  runner.test('ScoreManager: max combo is tracked', () => {
    const manager = new ScoreManager();
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    assert.equal(manager.maxCombo, 3, 'Max combo should be 3');

    manager.recordJudgment({ judgment: 'MISS', score: 0 });
    assert.equal(manager.maxCombo, 3, 'Max combo should stay at 3 after miss');
    assert.equal(manager.combo, 0, 'Current combo should be 0');
  });

  runner.test('ScoreManager: accuracy calculation', () => {
    const manager = new ScoreManager();
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });

    const accuracy = manager.getAccuracy();
    assert.equal(accuracy, 100, 'All PERFECT should be 100% accuracy');
  });

  runner.test('ScoreManager: reset clears all stats', () => {
    const manager = new ScoreManager();
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.reset();

    assert.equal(manager.totalScore, 0, 'Score should be 0 after reset');
    assert.equal(manager.combo, 0, 'Combo should be 0 after reset');
    assert.equal(manager.maxCombo, 0, 'Max combo should be 0 after reset');
  });

  runner.test('ScoreManager: grade calculation', () => {
    const manager = new ScoreManager();
    // All perfect hits
    for (let i = 0; i < 10; i++) {
      manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    }
    const grade = manager.getGrade();
    assert.ok(['S', 'A', 'B'].includes(grade), 'All perfect should be good grade');
  });

  runner.test('ScoreManager: judgment counts are tracked', () => {
    const manager = new ScoreManager();
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'PERFECT', score: 100 });
    manager.recordJudgment({ judgment: 'GOOD', score: 75 });
    manager.recordJudgment({ judgment: 'MISS', score: 0 });

    assert.equal(manager.judgmentCounts.PERFECT, 2, 'Should have 2 perfects');
    assert.equal(manager.judgmentCounts.GOOD, 1, 'Should have 1 good');
    assert.equal(manager.judgmentCounts.MISS, 1, 'Should have 1 miss');
  });
}
