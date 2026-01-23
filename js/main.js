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
import { StatsManager } from './statsManager.js';
import { StatsGraph } from './statsGraph.js';
import { authManager } from './authManager.js';

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
    this.statsManager = null;
    this.statsGraph = null;

    this.currentBPM = 101;
    this.currentPattern = null;
    this.currentPatternType = 'funky_drummer_break_intro';
    this.lastBeat = 0;  // Track last beat for metronome clicks

    // Game phase: 'ready' | 'playing' | 'paused' | 'complete'
    this.gamePhase = 'ready';

    // Track if completion view is showing (for resize handling)
    this.showingCompletionView = false;

    // Infinite loop mode tracking
    this.isInfiniteLoop = false;
    this.infiniteLoopIteration = 0;  // How many loops completed

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

    // Initialize stats tracking
    this.statsManager = new StatsManager();
    const statsCanvas = document.getElementById('stats-canvas');
    if (statsCanvas) {
      this.statsGraph = new StatsGraph(statsCanvas);
      // Set up stats update callback
      this.statsManager.onStatsUpdate = (stats) => {
        this.updateStatsGraph();
      };
    }

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

    // Render initial stats graph
    this.updateStatsGraph();

    // Initialize Firebase Auth if config is available
    await this.initializeAuth();

    this.initialized = true;
    console.log('Game initialized successfully');
  }

  /**
   * Initialize Firebase Authentication
   */
  async initializeAuth() {
    // Check if Firebase config is provided
    const config = window.firebaseConfig;

    if (config) {
      const success = await authManager.initialize(config);
      if (success) {
        // Register auth state callback
        authManager.registerAuthStateCallback((user) => {
          this.updateAuthUI(user);
        });

        // Set up auth event handlers
        this.setupAuthEventHandlers();
      }
    } else {
      console.log('Firebase config not found. Auth disabled. To enable:');
      console.log('1. Uncomment Firebase scripts in index.html');
      console.log('2. Add your Firebase project config');

      // Hide sign-in button if auth is not available
      const signInBtn = document.getElementById('sign-in-btn');
      if (signInBtn) {
        signInBtn.style.display = 'none';
      }
    }
  }

  /**
   * Set up authentication event handlers
   */
  setupAuthEventHandlers() {
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (signInBtn) {
      signInBtn.addEventListener('click', async () => {
        try {
          await authManager.signInWithGoogle();
        } catch (error) {
          console.error('Sign-in error:', error);
          // Could show an error message to user here
        }
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        try {
          await authManager.signOut();
        } catch (error) {
          console.error('Sign-out error:', error);
        }
      });
    }
  }

  /**
   * Update the auth UI based on user state
   * @param {Object|null} user - Firebase user object
   */
  updateAuthUI(user) {
    const signInBtn = document.getElementById('sign-in-btn');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (user) {
      // User is signed in
      if (signInBtn) signInBtn.style.display = 'none';
      if (userInfo) userInfo.classList.remove('hidden');
      if (userName) userName.textContent = authManager.getDisplayName();
      if (userAvatar) {
        const photoURL = authManager.getPhotoURL();
        if (photoURL) {
          userAvatar.src = photoURL;
          userAvatar.style.display = 'block';
        } else {
          userAvatar.style.display = 'none';
        }
      }

      // Update stats manager with user ID for per-user stats
      if (this.statsManager) {
        // Could implement per-user stats storage here
        console.log('User signed in:', user.uid);
      }
    } else {
      // User is signed out
      if (signInBtn) signInBtn.style.display = 'block';
      if (userInfo) userInfo.classList.add('hidden');
    }
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

    // Attach game state callbacks (update, miss, complete, countdown)
    this.attachGameStateCallbacks();

    // Score updates -> UI
    this.scoreManager.onScoreUpdate = (scoreData) => {
      this.updateScoreDisplay(scoreData);
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
      this.changeLoopCount(e.target.value);
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
   * Returns the actual loop count, or 4 for infinite mode (we'll add more dynamically)
   */
  getLoopCount() {
    const loopSelect = document.getElementById('loop-count');
    if (!loopSelect) return 4;

    const value = loopSelect.value;
    if (value === 'infinite') {
      return 4; // Start with 4 loops, add more dynamically
    }
    return parseInt(value);
  }

  /**
   * Check if infinite loop mode is selected
   */
  isInfiniteLoopMode() {
    const loopSelect = document.getElementById('loop-count');
    return loopSelect && loopSelect.value === 'infinite';
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
        // In infinite loop mode, stop and show results instead of pausing
        if (this.isInfiniteLoop) {
          this.stopInfiniteLoop();
        } else {
          this.pause();
        }
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

    // In infinite loop mode, show "Stop" instead of "Pause"
    if (this.gamePhase === 'playing' && this.isInfiniteLoop) {
      btn.innerHTML = '<span class="btn-icon">&#9632;</span> Stop';
      return;
    }

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

    // Track infinite loop mode
    this.isInfiniteLoop = this.isInfiniteLoopMode();
    this.infiniteLoopIteration = 0;

    // Start stats session
    if (this.statsManager) {
      this.statsManager.startSession(this.currentPatternType, this.currentBPM);
    }

    // Hide completion panel if visible
    this.hideCompletionPanel();

    // Clear completion view to allow normal rendering
    this.noteRenderer.clearCompletionView();

    this.gameState.start();
    this.gamePhase = 'playing';
    this.updateGameButton();

    console.log(`Game started${this.isInfiniteLoop ? ' (infinite loop mode)' : ''}`);
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
   * Stop infinite loop and show accumulated results
   */
  stopInfiniteLoop() {
    if (!this.initialized) return;

    console.log(`Stopping infinite loop after ${this.infiniteLoopIteration + 1} iterations`);

    // Stop the game state
    this.gameState.stop();
    this.isInfiniteLoop = false;

    // Hide countdown overlay if still visible
    const countdownOverlay = document.getElementById('countdown-overlay');
    if (countdownOverlay) countdownOverlay.classList.remove('show');

    const summary = this.scoreManager.getSummary();

    // End stats session
    if (this.statsManager) {
      this.statsManager.endSession();
      this.updateStatsGraph();
    }

    console.log('Infinite Loop Complete!');
    console.log(`Total Iterations: ${this.infiniteLoopIteration + 1}`);
    console.log(`Final Score: ${summary.totalScore}`);
    console.log(`Accuracy: ${summary.accuracy}%`);
    console.log(`Grade: ${summary.grade}`);
    console.log(`Max Combo: ${summary.maxCombo}`);

    // Show completion panel
    this.showCompletionPanel(summary);

    // Get notes with accuracy - use averaged data across all loops
    const { singlePatternDuration } = this.currentPattern;
    const totalLoops = this.currentPattern.loopCount;

    let notesWithAccuracy;
    let visualizationDuration;

    if (totalLoops > 1) {
      // Multi-loop: show single pattern with averaged accuracy
      notesWithAccuracy = this.gameState.getAveragedNotesForVisualization(
        singlePatternDuration,
        totalLoops
      );
      visualizationDuration = singlePatternDuration;
      console.log(`Averaged ${this.gameState.getAllNotesWithAccuracy().length} notes across ${totalLoops} loops into ${notesWithAccuracy.length} notes`);
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

    // Clear any active pad lights
    if (this.midiHandler && this.midiHandler.hasOutputs()) {
      this.midiHandler.clearAllPadLights();
    }

    // Reset infinite loop tracking
    this.isInfiniteLoop = false;
    this.infiniteLoopIteration = 0;

    // Regenerate pattern with original loop count (in case infinite mode modified it)
    const patternInfo = PATTERNS[this.currentPatternType];
    const loopsOrBars = patternInfo.isLoopBased ? this.getLoopCount() : patternInfo.bars;
    this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, loopsOrBars);
    this.gameState = new GameState(this.currentPattern);

    // Reattach callbacks
    this.attachGameStateCallbacks();

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

    // In infinite loop mode, record loop iteration stats and add more notes
    if (this.isInfiniteLoop) {
      this.infiniteLoopIteration++;

      // Record stats for this iteration
      const summary = this.scoreManager.getSummary();
      if (this.statsManager) {
        this.statsManager.recordLoopIteration({
          accuracy: parseFloat(summary.accuracy),
          score: summary.totalScore,
          perfect: summary.judgments.PERFECT,
          good: summary.judgments.GOOD,
          ok: summary.judgments.OK,
          miss: summary.judgments.MISS,
          maxCombo: summary.maxCombo
        });
      }

      console.log(`Infinite loop: completed iteration ${this.infiniteLoopIteration}, adding more notes...`);

      // Add more notes for the next set of loops
      this.appendMoreNotesToInfiniteLoop();
      return; // Don't show completion, keep playing
    }

    const summary = this.scoreManager.getSummary();

    // Record final stats
    if (this.statsManager) {
      this.statsManager.recordLoopIteration({
        accuracy: parseFloat(summary.accuracy),
        score: summary.totalScore,
        perfect: summary.judgments.PERFECT,
        good: summary.judgments.GOOD,
        ok: summary.judgments.OK,
        miss: summary.judgments.MISS,
        maxCombo: summary.maxCombo
      });
      this.statsManager.endSession();
      this.updateStatsGraph();
    }

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
   * Append more notes to game state for infinite loop continuation
   */
  appendMoreNotesToInfiniteLoop() {
    const { singlePatternDuration } = this.currentPattern;
    const patternInfo = PATTERNS[this.currentPatternType];

    // Create a new pattern with 4 more loops
    const additionalLoops = 4;
    const additionalPattern = createPattern(this.currentPatternType, this.currentBPM, additionalLoops);

    // Calculate the time offset for the new notes
    const timeOffset = this.currentPattern.duration;

    // Add the new notes with adjusted timing
    additionalPattern.notes.forEach((note, i) => {
      const newNote = {
        ...note,
        time: note.time + timeOffset,
        id: `${note.id}_inf${this.infiniteLoopIteration}`,
        hit: false,
        judged: false,
        sounded: false
      };
      this.gameState.upcomingNotes.push(newNote);
    });

    // Update pattern duration to include new notes
    this.currentPattern.duration += additionalPattern.duration;
    this.currentPattern.loopCount += additionalLoops;

    console.log(`Added ${additionalPattern.notes.length} notes, total duration now ${this.currentPattern.duration}ms`);
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
   * Update the stats graph with current data
   */
  updateStatsGraph() {
    if (!this.statsGraph || !this.statsManager) return;

    const graphData = this.statsManager.getGraphData(this.currentPatternType);
    this.statsGraph.render(graphData, { showHistorical: true });

    // Update info text
    const infoEl = document.getElementById('stats-session-info');
    if (infoEl) {
      const currentStats = this.statsManager.getCurrentSessionStats();
      const patternStats = this.statsManager.getPatternStats(this.currentPatternType);

      if (currentStats && currentStats.loopResults.length > 0) {
        const lastLoop = currentStats.loopResults[currentStats.loopResults.length - 1];
        infoEl.innerHTML = `Loop ${lastLoop.loopNumber}: <span class="trend-up">${lastLoop.accuracy.toFixed(1)}%</span> accuracy`;
      } else if (patternStats && patternStats.sessions.length > 0) {
        const trend = patternStats.recentTrend;
        const trendClass = trend >= 0 ? 'trend-up' : 'trend-down';
        const trendSymbol = trend >= 0 ? '+' : '';
        infoEl.innerHTML = `${patternStats.sessions.length} sessions | Trend: <span class="${trendClass}">${trendSymbol}${trend}%</span>`;
      } else {
        infoEl.textContent = 'Practice to see your progress';
      }
    }
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
  changeLoopCount(loopValue) {
    // Don't change if game is playing
    if (this.gameState && this.gameState.isPlaying) {
      console.log('Cannot change loops while game is playing');
      return;
    }

    const patternInfo = PATTERNS[this.currentPatternType];
    const isInfinite = loopValue === 'infinite';
    const loops = isInfinite ? 4 : parseInt(loopValue);  // Start with 4 for infinite
    const loopsOrBars = patternInfo.isLoopBased ? loops : patternInfo.bars;
    this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, loopsOrBars);

    this.regenerateGameState();
    console.log(`Loop count changed to ${isInfinite ? '∞ (infinite)' : loops}`);
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

    // Update stats graph for new pattern
    this.updateStatsGraph();

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
    this.attachGameStateCallbacks();

    // Update display
    this.updateBPMDisplay();

    // Render initial state
    this.noteRenderer.render(this.gameState);
    this.metronome.render({ beatNumber: 1, phase: 0 });
  }

  /**
   * Attach all callbacks to the game state
   */
  attachGameStateCallbacks() {
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
  }

  /**
   * Schedule drum sounds for practice track
   * Play sounds for notes at their scheduled time
   * Also trigger pad lights slightly ahead of notes
   */
  scheduleNoteSounds() {
    if (!this.gameState.isPlaying || this.gameState.currentTime < 0) return;

    // Play sounds for notes that should be sounding now (within a small window)
    const currentTime = this.gameState.currentTime;
    const soundWindow = 50; // ms tolerance for sound playback
    const padLightLeadTime = 100; // ms ahead to light pad (gives player visual cue)

    this.gameState.activeNotes.forEach(note => {
      // Check if this note should be playing now and hasn't been marked as sounded
      if (!note.sounded && Math.abs(note.time - currentTime) <= soundWindow) {
        this.audioManager.playDrumSound(note.midiNote, note.velocity);
        note.sounded = true; // Mark as sounded to prevent replaying
      }

      // Trigger pad light slightly ahead of when note should be hit
      // Light the pad padLightLeadTime ms before the note time
      const timeUntilNote = note.time - currentTime;
      if (!note.padLit && timeUntilNote > 0 && timeUntilNote <= padLightLeadTime) {
        this.triggerPadLight(note.midiNote);
        note.padLit = true;
      }
    });
  }

  /**
   * Trigger a pad light on the MIDI controller
   * @param {number} midiNote - The MIDI note to light
   */
  triggerPadLight(midiNote) {
    if (this.midiHandler && this.midiHandler.hasOutputs()) {
      // Flash the pad for a brief moment
      this.midiHandler.flashPad(midiNote, 200, 127);
    }
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
