// Main application entry point

import { MidiHandler } from './midiHandler.js';
import { KeyboardHandler } from './keyboardHandler.js';
import { InputDebouncer } from './inputDebouncer.js';
import { GameState } from './gameState.js';
import { NoteRenderer } from './noteRenderer.js';
import { TimingJudge } from './timingJudge.js';
import { ScoreManager } from './scoreManager.js';
import { Metronome } from './metronome.js';
import { AudioManager } from './audioManager.js';
import { createPattern, PATTERNS, initializeMidiLibrary, getAvailablePatterns, getPatternCategories } from './patterns.js';
import { MIDI_NOTE_MAP } from './constants.js';

class DrumGame {
  constructor() {
    this.midiHandler = null;
    this.keyboardHandler = null;
    this.inputDebouncer = null;
    this.gameState = null;
    this.noteRenderer = null;
    this.timingJudge = null;
    this.scoreManager = null;
    this.metronome = null;
    this.audioManager = null;

    this.currentBPM = 101;
    this.currentPattern = null;
    this.currentPatternType = 'funky_drummer_break_intro';
    this.lastBeat = 0;  // Track last beat for metronome clicks

    // Game phase: 'ready' | 'playing' | 'paused' | 'complete'
    this.gamePhase = 'ready';

    // Track if completion view is showing (for resize handling)
    this.showingCompletionView = false;

    this.initialized = false;
  }

  /**
   * Initialize the game
   */
  async init() {
    console.log('Initializing Drum Game...');

    // Get DOM elements
    const gameCanvas = document.getElementById('game-canvas');
    const metronomeCanvas = document.getElementById('metronome-canvas');

    if (!gameCanvas || !metronomeCanvas) {
      console.error('Required canvas elements not found');
      return;
    }

    // Initialize MIDI handler
    this.midiHandler = new MidiHandler();
    const midiSuccess = await this.midiHandler.initialize();

    // Initialize keyboard handler (always available as fallback)
    this.keyboardHandler = new KeyboardHandler();
    this.keyboardHandler.initialize();

    // Initialize input debouncer for filtering double-triggers
    // Default 30ms window - user can adjust via slider
    this.inputDebouncer = new InputDebouncer(30);

    // Initialize MIDI library and load all patterns
    await initializeMidiLibrary();

    // Initialize game modules
    this.timingJudge = new TimingJudge();
    this.scoreManager = new ScoreManager();
    this.noteRenderer = new NoteRenderer(gameCanvas);
    this.audioManager = new AudioManager();

    // Populate pattern dropdown with loaded patterns
    this.populatePatternDropdown();

    // Create initial pattern
    const patternInfo = PATTERNS[this.currentPatternType];
    if (patternInfo) {
      this.currentBPM = patternInfo.defaultBPM;
      this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, this.getLoopCount());
    } else {
      // Fallback to first available pattern
      const availablePatterns = getAvailablePatterns();
      if (availablePatterns.length > 0) {
        this.currentPatternType = availablePatterns[0].id;
        this.currentBPM = availablePatterns[0].defaultBPM;
        this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, this.getLoopCount());
      }
    }

    this.metronome = new Metronome(this.currentBPM, metronomeCanvas);

    // Create game state with pattern
    this.gameState = new GameState(this.currentPattern);

    // Wire up event handlers
    this.setupEventHandlers();

    // Update UI
    this.updateDeviceStatus();
    this.updateBPMDisplay();

    // Render initial state
    this.noteRenderer.render(this.gameState);
    this.metronome.render({ beatNumber: 1, phase: 0 });

    this.initialized = true;
    console.log('Game initialized successfully');
  }

  /**
   * Set up all event handlers
   */
  setupEventHandlers() {
    // MIDI input -> debouncer -> timing judge -> score manager
    this.midiHandler.registerNoteCallback((midiNote, velocity, timestamp) => {
      // Filter through debouncer to catch double-triggers
      if (this.inputDebouncer.shouldAllowInput(midiNote, timestamp)) {
        this.handleMidiInput(midiNote, velocity, timestamp);
        this.updateDebounceStats();
      }
    });

    // Keyboard input -> debouncer -> same pipeline as MIDI
    this.keyboardHandler.registerNoteCallback((midiNote, velocity, timestamp) => {
      // Filter through debouncer to catch double-triggers
      if (this.inputDebouncer.shouldAllowInput(midiNote, timestamp)) {
        this.handleMidiInput(midiNote, velocity, timestamp);
        this.updateDebounceStats();
      }
    });

    // Device connection changes
    this.midiHandler.registerDeviceChangeCallback(() => {
      this.updateDeviceStatus();
    });

    // Game state updates -> renderer
    this.gameState.onUpdate = () => {
      this.noteRenderer.render(this.gameState);
      const beatInfo = this.metronome.update(this.gameState.currentTime);
      this.metronome.render(beatInfo);

      // Play metronome click on beat changes
      if (beatInfo.beatNumber !== this.lastBeat) {
        this.lastBeat = beatInfo.beatNumber;
        this.audioManager.playMetronomeClick(beatInfo.beatNumber);
      }

      // Schedule drum sounds for upcoming notes
      this.scheduleNoteSounds();
    };

    // Game state miss callback
    this.gameState.onMiss = (note) => {
      this.scoreManager.recordMiss();
    };

    // Pattern complete
    this.gameState.onPatternComplete = () => {
      this.handlePatternComplete();
    };

    // Score updates -> UI
    this.scoreManager.onScoreUpdate = (scoreData) => {
      this.updateScoreDisplay(scoreData);
    };

    // Countdown updates
    this.gameState.onCountdown = (count) => {
      this.showCountdown(count);
    };

    // Single game button handler (state machine)
    document.getElementById('game-btn').addEventListener('click', () => {
      this.handleGameButtonClick();
    });

    // BPM control handlers
    document.getElementById('bpm-slider').addEventListener('input', (e) => {
      this.changeBPM(parseInt(e.target.value));
    });

    document.getElementById('bpm-up').addEventListener('click', () => {
      this.changeBPM(Math.min(200, this.currentBPM + 5));
    });

    document.getElementById('bpm-down').addEventListener('click', () => {
      this.changeBPM(Math.max(30, this.currentBPM - 5));
    });

    // Mixer control handlers
    document.getElementById('metronome-volume').addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 100;
      this.audioManager.setMetronomeVolume(volume);
      document.getElementById('metronome-volume-display').textContent = `${e.target.value}%`;
    });

    document.getElementById('drums-volume').addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 100;
      this.audioManager.setDrumsVolume(volume);
      document.getElementById('drums-volume-display').textContent = `${e.target.value}%`;
    });

    // Pattern selector handler
    document.getElementById('pattern-select').addEventListener('change', (e) => {
      this.changePattern(e.target.value);
    });

    // Loop count selector handler
    document.getElementById('loop-count').addEventListener('change', (e) => {
      this.changeLoopCount(parseInt(e.target.value));
    });

    // MIDI device selector handler
    document.getElementById('midi-device-select').addEventListener('change', (e) => {
      this.handleDeviceSelection(e.target.value);
    });

    // Debounce slider handler
    document.getElementById('debounce-slider').addEventListener('input', (e) => {
      const debounceMs = parseInt(e.target.value);
      this.inputDebouncer.setDebounceWindow(debounceMs);
      this.updateDebounceDisplay(debounceMs);
    });

    // Window resize handler for responsive canvas
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Handle window resize - update canvas dimensions
   */
  handleResize() {
    if (!this.noteRenderer) return;

    // Update canvas size
    this.noteRenderer.updateCanvasSize();

    // Re-render current state
    if (this.gameState) {
      if (this.showingCompletionView) {
        // Re-render completion view if it was showing
        const { singlePatternDuration, loopCount } = this.currentPattern;
        let notesWithAccuracy;
        let visualizationDuration;

        if (loopCount > 1) {
          notesWithAccuracy = this.gameState.getAveragedNotesForVisualization(
            singlePatternDuration,
            loopCount
          );
          visualizationDuration = singlePatternDuration;
        } else {
          notesWithAccuracy = this.gameState.getAllNotesWithAccuracy();
          visualizationDuration = this.currentPattern.duration;
        }

        this.noteRenderer.renderCompletionView(notesWithAccuracy, visualizationDuration);
      } else {
        this.noteRenderer.render(this.gameState);
      }
    }
  }

  /**
   * Get current loop count from UI
   */
  getLoopCount() {
    const loopSelect = document.getElementById('loop-count');
    return loopSelect ? parseInt(loopSelect.value) : 4;
  }

  /**
   * Handle MIDI input from drums
   */
  handleMidiInput(midiNote, velocity, timestamp) {
    const noteInfo = MIDI_NOTE_MAP[midiNote];
    if (!noteInfo) return; // Unknown note

    // Always play sound and show lane indicator (even when not playing)
    this.playDrumHit(midiNote, velocity);
    this.showLaneIndicator(noteInfo.lane);

    // Only do scoring/judgment when game is playing
    if (!this.gameState.isPlaying) return;

    // Find matching note
    const matchingNote = this.timingJudge.findMatchingNote(
      midiNote,
      this.gameState.currentTime,
      this.gameState.activeNotes
    );

    if (matchingNote) {
      // Judge the hit
      const judgment = this.timingJudge.judgeHit(
        matchingNote.time,
        this.gameState.currentTime,
        true
      );

      // Update score
      this.scoreManager.recordJudgment(judgment);

      // Update game state
      this.gameState.recordHit(matchingNote, judgment);

      // Visual feedback
      this.showHitFeedback(judgment, noteInfo.lane);

      console.log(`Hit: ${noteInfo.name} - ${judgment.judgment} (${judgment.timeDiff.toFixed(0)}ms)`);
    } else {
      // Wrong note or not in timing window
      const judgment = {
        judgment: 'WRONG_NOTE',
        score: -20,
        isCorrect: false
      };
      this.scoreManager.recordJudgment(judgment);
      this.showHitFeedback(judgment, noteInfo.lane);

      console.log(`Wrong note or miss: ${midiNote}`);
    }
  }

  /**
   * Play drum hit sound (user input - panned right)
   */
  playDrumHit(midiNote, velocity) {
    if (this.audioManager && this.audioManager.initialized) {
      this.audioManager.playUserDrumSound(midiNote, velocity);
    }
  }

  /**
   * Show lane indicator flash (always visible, even when not playing)
   */
  showLaneIndicator(lane) {
    // Add visual feedback to the lane at the hit line position
    const mockJudgment = { judgment: 'HIT' };
    this.noteRenderer.addHitFeedback(mockJudgment, lane);
  }

  /**
   * Show visual hit feedback
   */
  showHitFeedback(judgment, lane) {
    // Add to renderer's hit effects
    this.noteRenderer.addHitFeedback(judgment, lane);

    // Show text overlay
    const feedbackEl = document.getElementById('hit-feedback');
    feedbackEl.textContent = this.timingJudge.getJudgmentDescription(judgment.judgment);
    feedbackEl.className = `hit-feedback ${judgment.judgment.toLowerCase()}`;

    // Trigger animation
    setTimeout(() => {
      feedbackEl.classList.add('show');
    }, 10);

    // Hide after delay
    setTimeout(() => {
      feedbackEl.classList.remove('show');
    }, 500);
  }

  /**
   * Handle game button click (state machine)
   */
  handleGameButtonClick() {
    if (!this.initialized) return;

    switch (this.gamePhase) {
      case 'ready':
        this.start();
        break;
      case 'playing':
        this.pause();
        break;
      case 'paused':
        this.resume();
        break;
      case 'complete':
        this.reset();
        this.start();
        break;
    }
  }

  /**
   * Update game button label based on phase
   */
  updateGameButton() {
    const btn = document.getElementById('game-btn');
    if (!btn) return;

    const labels = {
      ready: '<span class="btn-icon">&#9658;</span> Start',
      playing: '<span class="btn-icon">&#10074;&#10074;</span> Pause',
      paused: '<span class="btn-icon">&#9658;</span> Resume',
      complete: '<span class="btn-icon">&#9658;</span> Start'
    };

    btn.innerHTML = labels[this.gamePhase] || labels.ready;
  }

  /**
   * Start the game
   */
  async start() {
    if (!this.initialized) return;

    // Initialize audio on first start (requires user interaction)
    if (!this.audioManager.initialized) {
      await this.audioManager.initialize();
    }

    // Resume audio context if suspended
    await this.audioManager.resume();

    // Reset beat tracking for the new attempt
    // Setting to 0 ensures the first beat (beat 1) triggers a click
    this.lastBeat = 0;

    // Hide completion panel if visible
    this.hideCompletionPanel();

    // Clear completion view to allow normal rendering
    this.noteRenderer.clearCompletionView();

    this.gameState.start();
    this.gamePhase = 'playing';
    this.updateGameButton();

    console.log('Game started');
  }

  /**
   * Pause the game
   */
  pause() {
    if (!this.initialized) return;

    this.gameState.pause();
    this.gamePhase = 'paused';
    this.updateGameButton();

    console.log('Game paused');
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.initialized) return;

    this.gameState.resume();
    this.gamePhase = 'playing';
    this.updateGameButton();

    console.log('Game resumed');
  }

  /**
   * Reset the game
   */
  reset() {
    if (!this.initialized) return;

    this.gameState.reset();
    this.scoreManager.reset();
    this.timingJudge.reset();
    this.metronome.reset();
    this.inputDebouncer.reset();
    this.lastBeat = 0;

    // Clear debounce stats display
    const statsEl = document.getElementById('debounce-stats');
    if (statsEl) statsEl.textContent = '';

    // Hide completion panel
    this.hideCompletionPanel();

    // Hide countdown overlay
    const countdownOverlay = document.getElementById('countdown-overlay');
    if (countdownOverlay) countdownOverlay.classList.remove('show');

    // Clear completion view to allow normal rendering
    this.noteRenderer.clearCompletionView();
    this.showingCompletionView = false;

    // Update game phase
    this.gamePhase = 'ready';
    this.updateGameButton();

    // Clear canvas
    this.noteRenderer.render(this.gameState);
    this.metronome.render({ beatNumber: 1, phase: 0 });

    console.log('Game reset');
  }

  /**
   * Handle pattern completion
   */
  handlePatternComplete() {
    // Hide countdown overlay if still visible
    const countdownOverlay = document.getElementById('countdown-overlay');
    if (countdownOverlay) countdownOverlay.classList.remove('show');

    const summary = this.scoreManager.getSummary();

    console.log('Pattern Complete!');
    console.log(`Final Score: ${summary.totalScore}`);
    console.log(`Accuracy: ${summary.accuracy}%`);
    console.log(`Grade: ${summary.grade}`);
    console.log(`Max Combo: ${summary.maxCombo}`);

    // Show completion panel instead of alert
    this.showCompletionPanel(summary);

    // Get notes with accuracy - use averaged data for multi-loop patterns
    const { singlePatternDuration, loopCount } = this.currentPattern;
    let notesWithAccuracy;
    let visualizationDuration;

    if (loopCount > 1) {
      // Multi-loop: show single pattern with averaged accuracy
      notesWithAccuracy = this.gameState.getAveragedNotesForVisualization(
        singlePatternDuration,
        loopCount
      );
      visualizationDuration = singlePatternDuration;
      console.log(`Averaged ${this.gameState.getAllNotesWithAccuracy().length} notes across ${loopCount} loops into ${notesWithAccuracy.length} notes`);
    } else {
      // Single loop: show all notes
      notesWithAccuracy = this.gameState.getAllNotesWithAccuracy();
      visualizationDuration = this.currentPattern.duration;
    }

    // Render accuracy visualization on the game canvas
    this.noteRenderer.renderCompletionView(notesWithAccuracy, visualizationDuration);
    this.showingCompletionView = true;

    // Update game phase
    this.gamePhase = 'complete';
    this.updateGameButton();
  }

  /**
   * Show completion panel with results
   */
  showCompletionPanel(summary) {
    const panel = document.getElementById('completion-panel');
    if (!panel) return;

    document.getElementById('final-score').textContent = summary.totalScore;
    document.getElementById('final-grade').textContent = summary.grade;
    document.getElementById('final-combo').textContent = summary.maxCombo;

    panel.classList.remove('hidden');
  }

  /**
   * Hide completion panel
   */
  hideCompletionPanel() {
    const panel = document.getElementById('completion-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  /**
   * Update score display
   */
  updateScoreDisplay(scoreData) {
    document.getElementById('total-score').textContent = scoreData.totalScore;
    document.getElementById('combo').textContent = scoreData.combo;
    document.getElementById('accuracy').textContent = `${scoreData.accuracy}%`;

    document.getElementById('perfect-count').textContent = scoreData.judgments.PERFECT;
    document.getElementById('good-count').textContent = scoreData.judgments.GOOD;
    document.getElementById('ok-count').textContent = scoreData.judgments.OK;
    document.getElementById('miss-count').textContent = scoreData.judgments.MISS;
  }

  /**
   * Populate pattern dropdown with loaded MIDI patterns
   */
  populatePatternDropdown() {
    const patternSelect = document.getElementById('pattern-select');
    if (!patternSelect) return;

    // Clear existing options
    patternSelect.innerHTML = '';

    const patterns = getAvailablePatterns();
    const categories = getPatternCategories();

    // Group patterns by category
    for (const category of categories) {
      const categoryPatterns = patterns.filter(p => p.category === category);

      if (categoryPatterns.length === 0) continue;

      // Create optgroup for category
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;

      for (const pattern of categoryPatterns) {
        const option = document.createElement('option');
        option.value = pattern.id;
        option.textContent = pattern.name;
        if (pattern.id === this.currentPatternType) {
          option.selected = true;
        }
        optgroup.appendChild(option);
      }

      patternSelect.appendChild(optgroup);
    }

    console.log(`Populated dropdown with ${patterns.length} patterns in ${categories.length} categories`);
  }

  /**
   * Update MIDI device status display and populate device selector
   */
  updateDeviceStatus() {
    const indicator = document.getElementById('midi-indicator');
    const deviceSelect = document.getElementById('midi-device-select');

    if (!deviceSelect) return;

    // Clear existing options
    deviceSelect.innerHTML = '';

    if (this.midiHandler.hasDevices()) {
      const devices = this.midiHandler.getAvailableDevices();
      indicator.className = 'status-connected';

      // Add option for each device
      devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = device.name;
        deviceSelect.appendChild(option);
      });

      // Add "All Devices" option if multiple devices
      if (devices.length > 1) {
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = `All Devices (${devices.length})`;
        deviceSelect.insertBefore(allOption, deviceSelect.firstChild);
      }

      // Set selection to current selected device
      const selectedId = this.midiHandler.getSelectedDeviceId();
      if (selectedId === null && devices.length > 1) {
        deviceSelect.value = 'all';
      } else if (selectedId) {
        deviceSelect.value = selectedId;
      } else {
        deviceSelect.value = devices[0].id;
      }
    } else {
      // No MIDI device, but keyboard is always available
      indicator.className = 'status-connected';
      const option = document.createElement('option');
      option.value = 'keyboard';
      option.textContent = 'Keyboard (A/S/D/J/K/L)';
      deviceSelect.appendChild(option);
    }
  }

  /**
   * Handle MIDI device selection change
   */
  handleDeviceSelection(deviceId) {
    if (deviceId === 'all') {
      this.midiHandler.selectDevice(null); // null = all devices
    } else if (deviceId !== 'keyboard') {
      this.midiHandler.selectDevice(deviceId);
    }
    console.log(`Device selected: ${deviceId}`);
  }

  /**
   * Update BPM display
   */
  updateBPMDisplay() {
    document.getElementById('bpm-display').textContent = this.currentBPM;
    document.getElementById('bpm-slider').value = this.currentBPM;
  }

  /**
   * Update debounce display value
   */
  updateDebounceDisplay(debounceMs) {
    const display = document.getElementById('debounce-display');
    if (display) {
      display.textContent = debounceMs === 0 ? 'Off' : `${debounceMs}ms`;
    }
  }

  /**
   * Update debounce statistics display
   */
  updateDebounceStats() {
    const statsEl = document.getElementById('debounce-stats');
    if (statsEl && this.inputDebouncer) {
      const stats = this.inputDebouncer.getStats();
      if (stats.filteredInputs > 0) {
        statsEl.textContent = `(${stats.filteredInputs} double-triggers filtered)`;
      }
    }
  }

  /**
   * Change BPM and regenerate pattern
   */
  changeBPM(newBPM) {
    // Don't change if game is playing
    if (this.gameState && this.gameState.isPlaying) {
      console.log('Cannot change BPM while game is playing');
      return;
    }

    this.currentBPM = newBPM;
    const patternInfo = PATTERNS[this.currentPatternType];
    const loopsOrBars = patternInfo.isLoopBased ? this.getLoopCount() : patternInfo.bars;
    this.currentPattern = createPattern(this.currentPatternType, newBPM, loopsOrBars);

    this.regenerateGameState();
    console.log(`BPM changed to ${newBPM}`);
  }

  /**
   * Change loop count and regenerate pattern
   */
  changeLoopCount(loops) {
    // Don't change if game is playing
    if (this.gameState && this.gameState.isPlaying) {
      console.log('Cannot change loops while game is playing');
      return;
    }

    const patternInfo = PATTERNS[this.currentPatternType];
    const loopsOrBars = patternInfo.isLoopBased ? loops : patternInfo.bars;
    this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, loopsOrBars);

    this.regenerateGameState();
    console.log(`Loop count changed to ${loops}`);
  }

  /**
   * Change pattern type
   */
  changePattern(patternType) {
    // Don't change if game is playing
    if (this.gameState && this.gameState.isPlaying) {
      console.log('Cannot change pattern while game is playing');
      return;
    }

    this.currentPatternType = patternType;
    const patternInfo = PATTERNS[patternType];

    // Set BPM to pattern's default if desired, or keep current
    // For now, auto-set to default BPM for the pattern
    this.currentBPM = patternInfo.defaultBPM;

    const loopsOrBars = patternInfo.isLoopBased ? this.getLoopCount() : patternInfo.bars;
    this.currentPattern = createPattern(patternType, this.currentBPM, loopsOrBars);

    this.regenerateGameState();
    console.log(`Pattern changed to ${patternInfo.name} at ${this.currentBPM} BPM`);
  }

  /**
   * Regenerate game state with current pattern
   */
  regenerateGameState() {
    // Update metronome and reset beat tracking
    this.metronome.setBPM(this.currentBPM);
    this.lastBeat = 0;

    // Recreate game state with new pattern
    this.gameState = new GameState(this.currentPattern);

    // Reattach callbacks
    this.gameState.onUpdate = () => {
      this.noteRenderer.render(this.gameState);
      const beatInfo = this.metronome.update(this.gameState.currentTime);
      this.metronome.render(beatInfo);

      // Play metronome click on beat changes
      if (beatInfo.beatNumber !== this.lastBeat) {
        this.lastBeat = beatInfo.beatNumber;
        this.audioManager.playMetronomeClick(beatInfo.beatNumber);
      }

      // Schedule drum sounds for upcoming notes
      this.scheduleNoteSounds();
    };

    this.gameState.onMiss = (note) => {
      this.scoreManager.recordMiss();
    };

    this.gameState.onPatternComplete = () => {
      this.handlePatternComplete();
    };

    this.gameState.onCountdown = (count) => {
      this.showCountdown(count);
    };

    // Update display
    this.updateBPMDisplay();

    // Render initial state
    this.noteRenderer.render(this.gameState);
    this.metronome.render({ beatNumber: 1, phase: 0 });
  }

  /**
   * Schedule drum sounds for practice track
   * Play sounds for notes at their scheduled time
   */
  scheduleNoteSounds() {
    if (!this.gameState.isPlaying || this.gameState.currentTime < 0) return;

    // Play sounds for notes that should be sounding now (within a small window)
    const currentTime = this.gameState.currentTime;
    const window = 50; // ms tolerance

    this.gameState.activeNotes.forEach(note => {
      // Check if this note should be playing now and hasn't been marked as sounded
      if (!note.sounded && Math.abs(note.time - currentTime) <= window) {
        this.audioManager.playDrumSound(note.midiNote, note.velocity);
        note.sounded = true; // Mark as sounded to prevent replaying
      }
    });
  }

  /**
   * Show countdown overlay
   */
  showCountdown(count) {
    const overlay = document.getElementById('countdown-overlay');

    if (count > 0) {
      overlay.textContent = count;
      overlay.classList.add('show');
    } else {
      // Countdown complete - show "GO!"
      overlay.textContent = 'GO!';
      overlay.classList.add('show');

      // Hide after a short delay
      setTimeout(() => {
        overlay.classList.remove('show');
      }, 500);
    }
  }

  /**
   * Show MIDI error message (now just logs, since keyboard is always available)
   */
  showMidiError() {
    console.log('Web MIDI API not available - keyboard input enabled as fallback');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  const game = new DrumGame();
  await game.init();

  // Expose to window for debugging
  window.drumGame = game;
});
