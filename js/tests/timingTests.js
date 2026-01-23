// Timing and judgment tests

import { assert } from './testRunner.js';
import { TIMING_WINDOWS, MIDI_NOTE_MAP } from '../constants.js';

export function registerTimingTests(runner) {
  runner.test('TIMING_WINDOWS: PERFECT window is smallest', () => {
    assert.ok(TIMING_WINDOWS.PERFECT < TIMING_WINDOWS.GOOD, 'PERFECT should be smaller than GOOD');
    assert.ok(TIMING_WINDOWS.GOOD < TIMING_WINDOWS.OK, 'GOOD should be smaller than OK');
    assert.ok(TIMING_WINDOWS.OK < TIMING_WINDOWS.MISS, 'OK should be smaller than MISS');
  });

  runner.test('TIMING_WINDOWS: values are positive', () => {
    assert.greaterThan(TIMING_WINDOWS.PERFECT, 0, 'PERFECT should be positive');
    assert.greaterThan(TIMING_WINDOWS.GOOD, 0, 'GOOD should be positive');
    assert.greaterThan(TIMING_WINDOWS.OK, 0, 'OK should be positive');
    assert.greaterThan(TIMING_WINDOWS.MISS, 0, 'MISS should be positive');
  });

  runner.test('MIDI_NOTE_MAP: has required drum sounds', () => {
    const requiredDrums = ['Kick', 'Snare', 'HH Closed', 'HH Open'];
    const drumNames = Object.values(MIDI_NOTE_MAP).map(d => d.name);

    for (const drum of requiredDrums) {
      assert.ok(drumNames.includes(drum), `Should have ${drum} mapped`);
    }
  });

  runner.test('MIDI_NOTE_MAP: each drum has unique lane', () => {
    const lanes = Object.values(MIDI_NOTE_MAP).map(d => d.lane);
    const uniqueLanes = new Set(lanes);
    assert.equal(lanes.length, uniqueLanes.size, 'Each drum should have unique lane');
  });

  runner.test('MIDI_NOTE_MAP: lanes are sequential', () => {
    const lanes = Object.values(MIDI_NOTE_MAP).map(d => d.lane).sort((a, b) => a - b);
    for (let i = 0; i < lanes.length; i++) {
      assert.equal(lanes[i], i, `Lane ${i} should exist`);
    }
  });

  runner.test('MIDI_NOTE_MAP: each drum has color', () => {
    for (const [midiNote, info] of Object.entries(MIDI_NOTE_MAP)) {
      assert.ok(info.color, `MIDI note ${midiNote} should have color`);
      assert.ok(info.color.startsWith('#') || info.color.startsWith('rgb'),
        `Color should be hex or rgb format`);
    }
  });
}
