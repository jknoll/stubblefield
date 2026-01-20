// Configuration and constants for the drum game

// MIDI note mappings for standard drum kit
// Lane order: Tom 1 at top (0), Kick at bottom (5)
export const MIDI_NOTE_MAP = {
  36: { name: 'Kick', lane: 5, color: '#FF4444' },
  38: { name: 'Snare', lane: 4, color: '#44FF44' },
  42: { name: 'HH Closed', lane: 3, color: '#4444FF' },
  46: { name: 'HH Open', lane: 2, color: '#FFFF44' },
  48: { name: 'Tom 1', lane: 0, color: '#FF44FF' },
  50: { name: 'Tom 2', lane: 1, color: '#44FFFF' }
};

// Keyboard to MIDI note mapping
export const KEYBOARD_MAP = {
  'KeyA': 36,  // Kick
  'KeyS': 38,  // Snare
  'KeyK': 42,  // HH Closed
  'KeyL': 46,  // HH Open
  'KeyD': 48,  // Tom 1
  'KeyJ': 50   // Tom 2
};

// Reverse map for display (MIDI note -> key name)
export const MIDI_TO_KEY = Object.fromEntries(
  Object.entries(KEYBOARD_MAP).map(([k, v]) => [v, k.replace('Key', '')])
);

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

// Game configuration (horizontal layout - notes flow right to left)
export const GAME_CONFIG = {
  BPM: 120,
  SCROLL_SPEED: 0.2,         // Pixels per ms
  NOTE_WIDTH: 20,            // Width of note rectangles (horizontal dimension)
  LANE_HEIGHT: 60,           // Height of each drum lane
  HIT_LINE_X: 100,           // X position of the hit line (from left edge)
  LOOKAHEAD_TIME: 3000,      // Show notes 3 seconds ahead
  CANVAS_WIDTH: 800,         // Wide for horizontal scrolling
  CANVAS_HEIGHT: 360,        // 6 lanes × 60px
  COMBO_MULTIPLIER: 0.1,     // 10% bonus per combo
  LEAD_IN_TIME: 4000,        // 4 seconds countdown before first note
  COUNTDOWN_BEATS: 4         // Number of beats to count down
};

// Get lane count from MIDI_NOTE_MAP
export const LANE_COUNT = Object.keys(MIDI_NOTE_MAP).length;
