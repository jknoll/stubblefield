// Quantizer tests

import { assert } from './testRunner.js';
import { Quantizer } from '../quantizer.js';

export function registerQuantizerTests(runner) {
  runner.test('Quantizer: analyzePattern returns valid result', () => {
    const notes = [
      { time: 0, midiNote: 36 },
      { time: 500, midiNote: 38 },
      { time: 1000, midiNote: 36 }
    ];
    const bpm = 120;
    const result = Quantizer.analyzePattern(notes, bpm);

    assert.ok(result.subdivision, 'Should have subdivision');
    assert.ok(result.subdivision.name, 'Subdivision should have name');
    assert.ok(typeof result.confidence === 'number', 'Should have confidence');
  });

  runner.test('Quantizer: handles empty notes array', () => {
    const result = Quantizer.analyzePattern([], 120);
    assert.ok(result.subdivision, 'Should return default subdivision');
  });

  runner.test('Quantizer: quantizeNotes snaps to grid', () => {
    const bpm = 120;
    const beatDuration = (60 / bpm) * 1000; // 500ms
    const sixteenthDuration = beatDuration / 4; // 125ms

    // Notes slightly off the 16th grid
    const notes = [
      { time: 5, midiNote: 36 },      // Should snap to 0
      { time: 130, midiNote: 38 },    // Should snap to 125
      { time: 245, midiNote: 42 }     // Should snap to 250
    ];

    const quantized = Quantizer.quantizeNotes(notes, bpm, Quantizer.SUBDIVISIONS.SIXTEENTH);

    assert.closeTo(quantized[0].time, 0, 1, 'First note should snap to 0');
    assert.closeTo(quantized[1].time, sixteenthDuration, 1, 'Second note should snap to grid');
    assert.closeTo(quantized[2].time, sixteenthDuration * 2, 1, 'Third note should snap to grid');
  });

  runner.test('Quantizer: preserves original time in originalTime property', () => {
    const notes = [{ time: 55, midiNote: 36 }];
    const quantized = Quantizer.quantizeNotes(notes, 120);

    assert.equal(quantized[0].originalTime, 55, 'Should preserve original time');
    assert.ok(quantized[0].time !== 55 || quantized[0].originalTime === 55,
      'Should track original even if unchanged');
  });

  runner.test('Quantizer: getQuantizationSummary calculates correctly', () => {
    const original = [
      { time: 5, midiNote: 36 },
      { time: 505, midiNote: 38 }
    ];
    const quantized = [
      { time: 0, midiNote: 36 },
      { time: 500, midiNote: 38 }
    ];

    const summary = Quantizer.getQuantizationSummary(original, quantized);

    assert.equal(summary.notesChanged, 2, 'Both notes changed');
    assert.equal(summary.totalNotes, 2, 'Total notes is 2');
    assert.closeTo(summary.avgShift, 5, 1, 'Average shift should be ~5ms');
  });

  runner.test('Quantizer: detects 16th note grid', () => {
    const bpm = 120;
    const sixteenthDuration = (60 / bpm) * 1000 / 4; // 125ms

    // Perfect 16th note pattern
    const notes = [
      { time: 0, midiNote: 36 },
      { time: sixteenthDuration, midiNote: 42 },
      { time: sixteenthDuration * 2, midiNote: 38 },
      { time: sixteenthDuration * 3, midiNote: 42 }
    ];

    const analysis = Quantizer.analyzePattern(notes, bpm);
    assert.ok(
      analysis.subdivision.notesPerBeat >= 4,
      'Should detect 16th or finer grid'
    );
    assert.closeTo(analysis.avgDeviation, 0, 1, 'Perfect grid should have ~0 deviation');
  });

  runner.test('Quantizer: detects 8th note triplet grid', () => {
    const bpm = 120;
    const tripletDuration = (60 / bpm) * 1000 / 3; // ~166.67ms

    // Perfect triplet pattern
    const notes = [
      { time: 0, midiNote: 36 },
      { time: tripletDuration, midiNote: 38 },
      { time: tripletDuration * 2, midiNote: 42 }
    ];

    const analysis = Quantizer.analyzePattern(notes, bpm);
    // Should detect triplet or compatible grid
    assert.lessThan(analysis.avgDeviation, 10, 'Triplet grid should have low deviation');
  });

  runner.test('Quantizer: SUBDIVISIONS contains expected grids', () => {
    const subs = Quantizer.SUBDIVISIONS;
    assert.ok(subs.QUARTER, 'Should have quarter notes');
    assert.ok(subs.EIGHTH, 'Should have eighth notes');
    assert.ok(subs.SIXTEENTH, 'Should have sixteenth notes');
    assert.ok(subs.EIGHTH_TRIPLET, 'Should have eighth triplets');
  });
}
