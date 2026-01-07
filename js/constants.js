// Configuration and constants for the drum game

// MIDI note mappings for standard drum kit
export const MIDI_NOTE_MAP = {
  36: { name: 'Kick', lane: 0, color: '#FF4444' },
  38: { name: 'Snare', lane: 1, color: '#44FF44' },
  42: { name: 'HH Closed', lane: 2, color: '#4444FF' },
  46: { name: 'HH Open', lane: 3, color: '#FFFF44' },
  48: { name: 'Tom 1', lane: 4, color: '#FF44FF' },
  50: { name: 'Tom 2', lane: 5, color: '#44FFFF' }
};

// Timing windows in milliseconds
export const TIMING_WINDOWS = {
  PERFECT: 50,   // ±50ms
  GOOD: 100,     // ±100ms
  OK: 150,       // ±150ms
  MISS: 200      // Beyond 200ms is a miss
};

// Scoring values for each judgment
export const TIMING_SCORES = {
  PERFECT: 100,
  GOOD: 70,
  OK: 40,
  EARLY: -10,    // Penalty for very early hits
  LATE: -10,     // Penalty for very late hits
  MISS: 0,
  WRONG_NOTE: -20
};

// Game configuration
export const GAME_CONFIG = {
  BPM: 120,
  SCROLL_SPEED: 0.15,        // Pixels per ms (slower for better visibility)
  NOTE_HEIGHT: 20,           // Height of note rectangles
  LANE_WIDTH: 100,           // Width of each drum lane
  HIT_LINE_Y: 100,           // Y position of the hit line (from bottom)
  LOOKAHEAD_TIME: 3000,      // Show notes 3 seconds ahead
  CANVAS_HEIGHT: 600,
  CANVAS_WIDTH: 400,         // 4 lanes × 100px
  COMBO_MULTIPLIER: 0.1,     // 10% bonus per combo
  LEAD_IN_TIME: 4000,        // 4 seconds countdown before first note
  COUNTDOWN_BEATS: 4         // Number of beats to count down
};

// Get lane count from MIDI_NOTE_MAP
export const LANE_COUNT = Object.keys(MIDI_NOTE_MAP).length;
