/**
 * Centralized UI State Store
 *
 * This store manages all UI-related state that needs to be synchronized
 * across components. It does NOT manage game engine state (currentTime,
 * activeNotes, etc.) which changes every frame.
 *
 * Design principle: UI state changes infrequently (user actions), while
 * game state changes 60 times per second. Keeping them separate prevents
 * unnecessary re-renders during gameplay.
 */

import { writable, derived, get } from 'svelte/store';

// Default values
const DEFAULTS = {
  bpm: 101,
  pattern: 'funky_drummer_break_intro',
  loopCount: '4',  // String to match HTML option values
  gamePhase: 'ready',

  metronomeVolume: 50,
  drumsVolume: 70,
  kit: 'rock',
  tone: 50,
  reverb: 0,
  debounce: 30,

  score: 0,
  combo: 0,
  accuracy: 100,
  maxCombo: 0,
  judgments: { perfect: 0, good: 0, ok: 0, miss: 0 },

  midiDevices: [],
  selectedDevice: null,
  isKeyboardMode: true,

  theme: 'dark',

  // Pattern metadata (populated from MIDI library)
  patterns: [],
  patternCategories: [],
  currentPatternInfo: null,

  // Stats
  statsInfo: 'Practice to see your progress',

  // Completion
  showCompletion: false,
  finalScore: 0,
  finalGrade: '-',
  finalCombo: 0,

  // Infinite loop
  isInfiniteLoop: false,
  infiniteLoopIteration: 0
};

// Create individual writable stores for each piece of state
// This allows fine-grained subscriptions (only update components that use specific state)

// Playback controls
export const bpm = writable(DEFAULTS.bpm);
export const pattern = writable(DEFAULTS.pattern);
export const loopCount = writable(DEFAULTS.loopCount);
export const gamePhase = writable(DEFAULTS.gamePhase);

// Audio settings
export const metronomeVolume = writable(DEFAULTS.metronomeVolume);
export const drumsVolume = writable(DEFAULTS.drumsVolume);
export const kit = writable(DEFAULTS.kit);
export const tone = writable(DEFAULTS.tone);
export const reverb = writable(DEFAULTS.reverb);
export const debounce = writable(DEFAULTS.debounce);

// Score (updated periodically during gameplay, not per-frame)
export const score = writable(DEFAULTS.score);
export const combo = writable(DEFAULTS.combo);
export const accuracy = writable(DEFAULTS.accuracy);
export const maxCombo = writable(DEFAULTS.maxCombo);
export const judgments = writable(DEFAULTS.judgments);

// MIDI devices
export const midiDevices = writable(DEFAULTS.midiDevices);
export const selectedDevice = writable(DEFAULTS.selectedDevice);
export const isKeyboardMode = writable(DEFAULTS.isKeyboardMode);

// Theme
export const theme = writable(DEFAULTS.theme);

// Pattern metadata
export const patterns = writable(DEFAULTS.patterns);
export const patternCategories = writable(DEFAULTS.patternCategories);
export const currentPatternInfo = writable(DEFAULTS.currentPatternInfo);

// Stats display
export const statsInfo = writable(DEFAULTS.statsInfo);

// Completion panel
export const showCompletion = writable(DEFAULTS.showCompletion);
export const finalScore = writable(DEFAULTS.finalScore);
export const finalGrade = writable(DEFAULTS.finalGrade);
export const finalCombo = writable(DEFAULTS.finalCombo);

// Infinite loop tracking
export const isInfiniteLoop = writable(DEFAULTS.isInfiniteLoop);
export const infiniteLoopIteration = writable(DEFAULTS.infiniteLoopIteration);

// Debounce stats (filtered inputs count)
export const debounceFiltered = writable(0);

// Derived stores for computed values

// Is game currently playing?
export const isPlaying = derived(gamePhase, $phase => $phase === 'playing');

// Is game paused?
export const isPaused = derived(gamePhase, $phase => $phase === 'paused');

// Can change settings (not while playing)
export const canChangeSettings = derived(gamePhase, $phase =>
  $phase === 'ready' || $phase === 'complete'
);

// Button label based on game phase and infinite loop mode
export const gameButtonLabel = derived(
  [gamePhase, isInfiniteLoop],
  ([$phase, $infinite]) => {
    if ($phase === 'playing' && $infinite) {
      return { icon: '&#9632;', text: 'Stop' };
    }
    const labels = {
      ready: { icon: '&#9658;', text: 'Start' },
      playing: { icon: '&#10074;&#10074;', text: 'Pause' },
      paused: { icon: '&#9658;', text: 'Resume' },
      complete: { icon: '&#9658;', text: 'Start' }
    };
    return labels[$phase] || labels.ready;
  }
);

// Loop count display value
export const loopCountDisplay = derived(loopCount, $count =>
  $count === 'infinite' ? '∞' : `${$count}x`
);

// Debounce display value
export const debounceDisplay = derived(debounce, $ms =>
  $ms === 0 ? 'Off' : `${$ms}ms`
);

/**
 * Action creators - these update the store AND call the game engine
 * The game engine reference is set by the main app
 */
let gameEngine = null;

export function setGameEngine(engine) {
  gameEngine = engine;
}

export function getGameEngine() {
  return gameEngine;
}

// Actions that update both store and game engine

export function setBpm(newBpm) {
  if (!get(canChangeSettings)) return;
  bpm.set(newBpm);
  if (gameEngine) {
    gameEngine.changeBPM(newBpm);
  }
}

export function setPattern(patternId) {
  if (!get(canChangeSettings)) return;
  pattern.set(patternId);
  if (gameEngine) {
    gameEngine.changePattern(patternId);
    // Pattern change may update BPM to pattern default
    bpm.set(gameEngine.currentBPM);
  }
}

export function setLoopCount(count) {
  if (!get(canChangeSettings)) return;
  loopCount.set(count);
  if (gameEngine) {
    gameEngine.changeLoopCount(count);
  }
}

export function startGame() {
  if (gameEngine) {
    gameEngine.handleGameButtonClick();
  }
}

export function setMetronomeVolume(vol) {
  metronomeVolume.set(vol);
  if (gameEngine && gameEngine.audioManager) {
    gameEngine.audioManager.setMetronomeVolume(vol / 100);
  }
}

export function setDrumsVolume(vol) {
  drumsVolume.set(vol);
  if (gameEngine && gameEngine.audioManager) {
    gameEngine.audioManager.setDrumsVolume(vol / 100);
  }
}

export function setKit(kitId) {
  console.log(`[Store] setKit called with: ${kitId}`);
  kit.set(kitId);
  if (gameEngine && gameEngine.audioManager) {
    console.log(`[Store] Calling audioManager.setKit(${kitId})`);
    gameEngine.audioManager.setKit(kitId);
    console.log(`[Store] audioManager.currentKit is now: ${gameEngine.audioManager.currentKit}`);
  } else {
    console.warn(`[Store] setKit: gameEngine or audioManager not available`, {
      gameEngine: !!gameEngine,
      audioManager: gameEngine ? !!gameEngine.audioManager : false
    });
  }
}

export function setTone(value) {
  tone.set(value);
  if (gameEngine && gameEngine.audioManager) {
    gameEngine.audioManager.setTone(value / 100);
  }
}

export function setReverb(value) {
  reverb.set(value);
  if (gameEngine && gameEngine.audioManager) {
    gameEngine.audioManager.setReverb(value / 100);
  }
}

export function setDebounce(ms) {
  debounce.set(ms);
  if (gameEngine && gameEngine.inputDebouncer) {
    gameEngine.inputDebouncer.setDebounceWindow(ms);
  }
}

export function selectMidiDevice(deviceId) {
  selectedDevice.set(deviceId);
  const isKeyboard = deviceId === 'keyboard' || deviceId === 'none';
  isKeyboardMode.set(isKeyboard);

  if (gameEngine) {
    gameEngine.handleDeviceSelection(deviceId);
    if (gameEngine.noteRenderer) {
      gameEngine.noteRenderer.setInputMode(isKeyboard);
    }
  }
}

export function toggleTheme() {
  theme.update(t => t === 'dark' ? 'light' : 'dark');
  // Theme manager handles the actual theme application
  if (typeof window !== 'undefined' && window.ThemeManager) {
    window.ThemeManager.toggle();
  }
}

export function quantizePattern() {
  if (gameEngine) {
    gameEngine.quantizeCurrentPattern();
  }
}

export function clearStats() {
  if (gameEngine && gameEngine.statsManager) {
    if (confirm('Clear all progress history for all patterns?')) {
      gameEngine.statsManager.clearAllStats();
      gameEngine.updateStatsGraph();
    }
  }
}

/**
 * Update score from game engine (called periodically, not per-frame)
 */
export function updateScore(scoreData) {
  score.set(scoreData.totalScore);
  combo.set(scoreData.combo);
  accuracy.set(scoreData.accuracy);
  judgments.set({
    perfect: scoreData.judgments.PERFECT,
    good: scoreData.judgments.GOOD,
    ok: scoreData.judgments.OK,
    miss: scoreData.judgments.MISS
  });
}

/**
 * Update game phase from game engine
 */
export function updateGamePhase(phase) {
  gamePhase.set(phase);
}

/**
 * Update completion panel
 */
export function showCompletionPanel(summary) {
  finalScore.set(summary.totalScore);
  finalGrade.set(summary.grade);
  finalCombo.set(summary.maxCombo);
  showCompletion.set(true);
}

export function hideCompletionPanel() {
  showCompletion.set(false);
}

/**
 * Update MIDI devices list
 */
export function updateMidiDevices(devices) {
  midiDevices.set(devices);
}

/**
 * Update patterns from MIDI library
 */
export function updatePatterns(patternList, categories) {
  patterns.set(patternList);
  patternCategories.set(categories);
}

/**
 * Update current pattern info
 */
export function updateCurrentPatternInfo(info) {
  currentPatternInfo.set(info);
}

/**
 * Update stats info text
 */
export function updateStatsInfo(info) {
  statsInfo.set(info);
}

/**
 * Update debounce filtered count
 */
export function updateDebounceFiltered(count) {
  debounceFiltered.set(count);
}

/**
 * Update infinite loop state
 */
export function updateInfiniteLoop(isInfinite, iteration = 0) {
  isInfiniteLoop.set(isInfinite);
  infiniteLoopIteration.set(iteration);
}

/**
 * Reset all score-related state
 */
export function resetScore() {
  score.set(DEFAULTS.score);
  combo.set(DEFAULTS.combo);
  accuracy.set(DEFAULTS.accuracy);
  maxCombo.set(DEFAULTS.maxCombo);
  judgments.set({ ...DEFAULTS.judgments });
  debounceFiltered.set(0);
}

/**
 * Reset to defaults
 */
export function resetAll() {
  bpm.set(DEFAULTS.bpm);
  pattern.set(DEFAULTS.pattern);
  loopCount.set(DEFAULTS.loopCount);
  gamePhase.set(DEFAULTS.gamePhase);
  resetScore();
  hideCompletionPanel();
  updateInfiniteLoop(false, 0);
}
