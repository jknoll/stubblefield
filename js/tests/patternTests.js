// Pattern loading and generation tests

import { assert } from './testRunner.js';
import { PATTERNS, createPattern, getAvailablePatterns } from '../patterns.js';

export function registerPatternTests(runner) {
  runner.test('PATTERNS: contains at least one pattern', () => {
    const patternKeys = Object.keys(PATTERNS);
    assert.greaterThan(patternKeys.length, 0, 'Should have at least one pattern');
  });

  runner.test('PATTERNS: each pattern has required properties', () => {
    for (const [key, pattern] of Object.entries(PATTERNS)) {
      assert.ok(pattern.name, `${key} should have name`);
      assert.ok(pattern.defaultBPM, `${key} should have defaultBPM`);
      assert.greaterThan(pattern.defaultBPM, 0, `${key} BPM should be positive`);
      assert.lessThan(pattern.defaultBPM, 300, `${key} BPM should be reasonable`);
    }
  });

  runner.test('createPattern: generates valid pattern structure', () => {
    const patternKeys = Object.keys(PATTERNS);
    if (patternKeys.length === 0) return; // Skip if no patterns

    const patternType = patternKeys[0];
    const bpm = PATTERNS[patternType].defaultBPM;
    const pattern = createPattern(patternType, bpm, 1);

    assert.ok(pattern, 'Pattern should be created');
    assert.ok(pattern.notes, 'Pattern should have notes array');
    assert.ok(Array.isArray(pattern.notes), 'Notes should be an array');
    assert.equal(pattern.bpm, bpm, 'Pattern BPM should match');
  });

  runner.test('createPattern: notes have required properties', () => {
    const patternKeys = Object.keys(PATTERNS);
    if (patternKeys.length === 0) return;

    const patternType = patternKeys[0];
    const bpm = PATTERNS[patternType].defaultBPM;
    const pattern = createPattern(patternType, bpm, 1);

    if (pattern.notes.length > 0) {
      const note = pattern.notes[0];
      assert.ok(typeof note.time === 'number', 'Note should have time');
      assert.ok(typeof note.midiNote === 'number', 'Note should have midiNote');
      assert.ok(note.time >= 0, 'Note time should be non-negative');
    }
  });

  runner.test('createPattern: notes are sorted by time', () => {
    const patternKeys = Object.keys(PATTERNS);
    if (patternKeys.length === 0) return;

    const patternType = patternKeys[0];
    const bpm = PATTERNS[patternType].defaultBPM;
    const pattern = createPattern(patternType, bpm, 2);

    for (let i = 1; i < pattern.notes.length; i++) {
      assert.ok(
        pattern.notes[i].time >= pattern.notes[i - 1].time,
        'Notes should be sorted by time'
      );
    }
  });

  runner.test('createPattern: loop count multiplies notes', () => {
    const patternKeys = Object.keys(PATTERNS);
    if (patternKeys.length === 0) return;

    const patternType = patternKeys[0];
    const patternInfo = PATTERNS[patternType];
    if (!patternInfo.isLoopBased) return; // Skip for bar-based patterns

    const bpm = patternInfo.defaultBPM;
    const pattern1 = createPattern(patternType, bpm, 1);
    const pattern2 = createPattern(patternType, bpm, 2);

    // With 2x loops, we expect approximately 2x the notes
    // Allow some tolerance for pattern structure
    const ratio = pattern2.notes.length / pattern1.notes.length;
    assert.closeTo(ratio, 2, 0.1, 'Double loops should have ~2x notes');
  });

  runner.test('getAvailablePatterns: returns array of patterns', () => {
    const patterns = getAvailablePatterns();
    assert.ok(Array.isArray(patterns), 'Should return array');
  });
}
