<script>
  import { onMount, onDestroy } from 'svelte';
  import Header from './components/Header.svelte';
  import ControlsRow from './components/ControlsRow.svelte';
  import GameCanvas from './components/GameCanvas.svelte';
  import GameButton from './components/GameButton.svelte';
  import StatsScoreRow from './components/StatsScoreRow.svelte';
  import CompletionPanel from './components/CompletionPanel.svelte';
  import SettingsRow from './components/SettingsRow.svelte';
  import LoadingOverlay from './components/LoadingOverlay.svelte';
  import MidiUpload from './components/MidiUpload.svelte';
  import SequenceModeToggle from './components/SequenceModeToggle.svelte';

  import {
    setGameEngine,
    updatePatterns,
    updateMidiDevices,
    updateScore,
    updateGamePhase,
    showCompletionPanel,
    hideCompletionPanel,
    updateStatsInfo,
    updateDebounceFiltered,
    updateInfiniteLoop,
    updateCurrentPatternInfo,
    updateSequenceProgress,
    resetSequenceMode,
    sequenceMode,
    bpm,
    pattern,
    theme,
    selectedDevice,
    isKeyboardMode,
    resetScore
  } from './stores/uiStore.js';
  import { get } from 'svelte/store';

  // Import game engine modules
  import { MidiHandler } from '../js/midiHandler.js';
  import { KeyboardHandler } from '../js/keyboardHandler.js';
  import { InputDebouncer } from '../js/inputDebouncer.js';
  import { GameState } from '../js/gameState.js';
  import { NoteRenderer } from '../js/noteRenderer.js';
  import { TimingJudge } from '../js/timingJudge.js';
  import { ScoreManager } from '../js/scoreManager.js';
  import { Metronome } from '../js/metronome.js';
  import { AudioManager } from '../js/audioManager.js';
  import { StatsManager } from '../js/statsManager.js';
  import { StatsGraph } from '../js/statsGraph.js';
  import { Quantizer } from '../js/quantizer.js';
  import {
    createPattern,
    PATTERNS,
    initializeMidiLibrary,
    getAvailablePatterns,
    getPatternCategories
  } from '../js/patterns.js';
  import { MIDI_NOTE_MAP } from '../js/constants.js';

  let loading = true;
  let gameEngine = null;
  let gameCanvasEl;
  let metronomeCanvasEl;
  let statsCanvasEl;

  // Theme management (preserved from original)
  const ThemeManager = {
    storageKey: 'groovelab_theme',

    init() {
      const savedTheme = localStorage.getItem(this.storageKey);
      if (savedTheme) {
        this.setTheme(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
      }

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.storageKey)) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    },

    setTheme(newTheme) {
      if (newTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      theme.set(newTheme);
      this.updateCanvasColors(newTheme);
    },

    toggle() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
      localStorage.setItem(this.storageKey, newTheme);
    },

    updateCanvasColors(newTheme) {
      if (gameEngine && gameEngine.noteRenderer) {
        gameEngine.noteRenderer.updateTheme(newTheme);
        if (gameEngine.gameState) {
          gameEngine.noteRenderer.render(gameEngine.gameState);
        }
      }
      if (gameEngine && gameEngine.statsGraph) {
        gameEngine.statsGraph.updateTheme(newTheme);
        if (gameEngine.statsManager) {
          const graphData = gameEngine.statsManager.getGraphData(
            gameEngine.currentPatternType,
            gameEngine.currentBPM
          );
          gameEngine.statsGraph.render(graphData, { showHistorical: true });
        }
      }
    },

    getTheme() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
  };

  // Expose ThemeManager globally for store actions
  if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
  }

  /**
   * Game Engine Class - handles all real-time game logic
   * This stays outside Svelte's reactivity to maintain performance
   */
  class DrumGameEngine {
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
      this.lastBeat = 0;
      this.gamePhase = 'ready';
      this.showingCompletionView = false;
      this.isInfiniteLoop = false;
      this.infiniteLoopIteration = 0;
      this.initialized = false;
    }

    async init(gameCanvas, metronomeCanvas, statsCanvas) {
      console.log('Initializing Drum Game Engine...');

      // Initialize MIDI handler
      this.midiHandler = new MidiHandler();
      await this.midiHandler.initialize();

      // Initialize keyboard handler
      this.keyboardHandler = new KeyboardHandler();
      this.keyboardHandler.initialize();

      // Initialize input debouncer
      this.inputDebouncer = new InputDebouncer(30);

      // Initialize MIDI library
      await initializeMidiLibrary();

      // Update store with patterns
      const patternList = getAvailablePatterns();
      const categories = getPatternCategories();
      updatePatterns(patternList, categories);

      // Initialize game modules
      this.timingJudge = new TimingJudge();
      this.scoreManager = new ScoreManager();
      this.noteRenderer = new NoteRenderer(gameCanvas);
      this.audioManager = new AudioManager();

      // Initialize stats
      this.statsManager = new StatsManager();
      if (statsCanvas) {
        this.statsGraph = new StatsGraph(statsCanvas);
        this.statsManager.onStatsUpdate = () => {
          this.updateStatsGraph();
        };
      }

      // Initialize canvases with current theme
      const currentTheme = ThemeManager.getTheme();
      this.noteRenderer.updateTheme(currentTheme);
      if (this.statsGraph) {
        this.statsGraph.updateTheme(currentTheme);
      }

      // Set up mute callback
      this.noteRenderer.setMuteCallback((midiNote, isMuted) => {
        console.log(`Mute toggled: MIDI ${midiNote} -> ${isMuted ? 'muted' : 'unmuted'}`);
      });

      // Create initial pattern
      const patternInfo = PATTERNS[this.currentPatternType];
      if (patternInfo) {
        this.currentBPM = patternInfo.defaultBPM;
        this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, this.getLoopCount());
      } else {
        const availablePatterns = getAvailablePatterns();
        if (availablePatterns.length > 0) {
          this.currentPatternType = availablePatterns[0].id;
          this.currentBPM = availablePatterns[0].defaultBPM;
          this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, this.getLoopCount());
        }
      }

      // Update store with initial values
      bpm.set(this.currentBPM);
      pattern.set(this.currentPatternType);
      updateCurrentPatternInfo(PATTERNS[this.currentPatternType]);

      this.metronome = new Metronome(this.currentBPM, metronomeCanvas);
      this.gameState = new GameState(this.currentPattern);

      // Wire up event handlers
      this.setupEventHandlers();

      // Update MIDI device status
      this.updateDeviceStatus();

      // Render initial state
      this.noteRenderer.render(this.gameState);
      this.metronome.render({ beatNumber: 1, phase: 0 });
      this.updateStatsGraph();

      this.initialized = true;
      console.log('Game engine initialized successfully');
    }

    setupEventHandlers() {
      // MIDI input handler
      this.midiHandler.registerNoteCallback((midiNote, velocity, timestamp) => {
        if (this.inputDebouncer.shouldAllowInput(midiNote, timestamp)) {
          this.handleMidiInput(midiNote, velocity, timestamp);
          this.updateDebounceStats();
        }
      });

      // Keyboard input handler
      this.keyboardHandler.registerNoteCallback((midiNote, velocity, timestamp) => {
        if (this.inputDebouncer.shouldAllowInput(midiNote, timestamp)) {
          this.handleMidiInput(midiNote, velocity, timestamp);
          this.updateDebounceStats();
        }
      });

      // Device connection changes
      this.midiHandler.registerDeviceChangeCallback(() => {
        this.updateDeviceStatus();
      });

      // Attach game state callbacks
      this.attachGameStateCallbacks();

      // Score updates
      this.scoreManager.onScoreUpdate = (scoreData) => {
        updateScore(scoreData);
      };

      // Window resize
      window.addEventListener('resize', () => this.handleResize());
    }

    attachGameStateCallbacks() {
      this.gameState.onUpdate = () => {
        this.noteRenderer.render(this.gameState);
        const beatInfo = this.metronome.update(this.gameState.currentTime);
        this.metronome.render(beatInfo);

        if (beatInfo.beatNumber !== this.lastBeat) {
          this.lastBeat = beatInfo.beatNumber;
          this.audioManager.playMetronomeClick(beatInfo.beatNumber);
        }

        this.scheduleNoteSounds();
      };

      this.gameState.onMiss = (note) => {
        if (this.noteRenderer.isMuted(note.midiNote)) return;
        this.scoreManager.recordMiss();
      };

      this.gameState.onPatternComplete = () => {
        this.handlePatternComplete();
      };

      this.gameState.onCountdown = (count) => {
        this.showCountdown(count);
      };

      // Sequence mode progress callback
      this.gameState.onSequenceProgress = (currentIndex, correct, wrong) => {
        updateSequenceProgress(currentIndex, correct, wrong);
      };
    }

    handleMidiInput(midiNote, velocity, timestamp) {
      const noteInfo = MIDI_NOTE_MAP[midiNote];
      if (!noteInfo) return;

      const isMuted = this.noteRenderer.isMuted(midiNote);

      if (!isMuted) {
        this.playDrumHit(midiNote, velocity);
      }
      this.showLaneIndicator(noteInfo.lane);

      if (!this.gameState.isPlaying) return;
      if (isMuted) return;

      // Handle sequence mode differently
      if (this.gameState.sequenceMode) {
        this.handleSequenceModeInput(midiNote, noteInfo);
        return;
      }

      const matchingNote = this.timingJudge.findMatchingNote(
        midiNote,
        this.gameState.currentTime,
        this.gameState.activeNotes
      );

      if (matchingNote) {
        const judgment = this.timingJudge.judgeHit(
          matchingNote.time,
          this.gameState.currentTime,
          true
        );

        this.scoreManager.recordJudgment(judgment);
        this.gameState.recordHit(matchingNote, judgment);
        this.showHitFeedback(judgment, noteInfo.lane);
      } else {
        const judgment = {
          judgment: 'WRONG_NOTE',
          score: -20,
          isCorrect: false
        };
        this.scoreManager.recordJudgment(judgment);
        this.showHitFeedback(judgment, noteInfo.lane);
        this.gameState.recordWrongPadHit(midiNote, noteInfo.lane);
      }
    }

    /**
     * Handle input in sequence mode (play in order, not in time)
     */
    handleSequenceModeInput(midiNote, noteInfo) {
      const result = this.gameState.handleSequenceHit(midiNote);

      if (result.isCorrect) {
        // Correct hit
        const judgment = {
          judgment: 'PERFECT',
          score: 100,
          isCorrect: true,
          timeDiff: 0
        };
        this.scoreManager.recordJudgment(judgment);
        this.showHitFeedback(judgment, noteInfo.lane);
      } else if (result.note) {
        // Wrong hit - show which instrument was expected
        const expectedNote = MIDI_NOTE_MAP[result.note.midiNote];
        const judgment = {
          judgment: 'WRONG_NOTE',
          score: 0,  // No penalty in sequence mode, just don't advance
          isCorrect: false
        };
        this.showHitFeedback(judgment, noteInfo.lane);

        // Flash the expected lane
        if (expectedNote) {
          this.noteRenderer.flashExpectedLane(expectedNote.lane);
        }
      }

      // Update sequence progress in store
      const stats = this.gameState.getSequenceStats();
      updateSequenceProgress(stats.currentIndex, stats.correct, stats.wrong);
    }

    playDrumHit(midiNote, velocity) {
      if (this.audioManager && this.audioManager.initialized) {
        this.audioManager.playUserDrumSound(midiNote, velocity);
      }
    }

    showLaneIndicator(lane) {
      const mockJudgment = { judgment: 'HIT' };
      this.noteRenderer.addHitFeedback(mockJudgment, lane);
    }

    showHitFeedback(judgment, lane) {
      this.noteRenderer.addHitFeedback(judgment, lane);

      const feedbackEl = document.getElementById('hit-feedback');
      if (feedbackEl) {
        feedbackEl.textContent = this.timingJudge.getJudgmentDescription(judgment.judgment);
        feedbackEl.className = `hit-feedback ${judgment.judgment.toLowerCase()}`;
        setTimeout(() => feedbackEl.classList.add('show'), 10);
        setTimeout(() => feedbackEl.classList.remove('show'), 500);
      }
    }

    showCountdown(count) {
      const overlay = document.getElementById('countdown-overlay');
      if (!overlay) return;

      if (count > 0) {
        overlay.textContent = count;
        overlay.classList.add('show');
      } else {
        overlay.textContent = 'GO!';
        overlay.classList.add('show');
        setTimeout(() => overlay.classList.remove('show'), 500);
      }
    }

    handleGameButtonClick() {
      if (!this.initialized) return;

      switch (this.gamePhase) {
        case 'ready':
          this.start();
          break;
        case 'playing':
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

    async start() {
      if (!this.initialized) return;

      if (!this.audioManager.initialized) {
        await this.audioManager.initialize();
      }
      await this.audioManager.resume();

      this.lastBeat = 0;
      this.isInfiniteLoop = this.isInfiniteLoopMode();
      this.infiniteLoopIteration = 0;

      updateInfiniteLoop(this.isInfiniteLoop, 0);

      if (this.statsManager) {
        this.statsManager.startSession(this.currentPatternType, this.currentBPM);
      }

      hideCompletionPanel();
      this.noteRenderer.clearCompletionView();
      resetScore();

      this.gameState.start();
      this.gamePhase = 'playing';
      updateGamePhase('playing');

      console.log(`Game started${this.isInfiniteLoop ? ' (infinite loop mode)' : ''}`);
    }

    pause() {
      if (!this.initialized) return;

      this.gameState.pause();
      this.gamePhase = 'paused';
      updateGamePhase('paused');
    }

    resume() {
      if (!this.initialized) return;

      this.gameState.resume();
      this.gamePhase = 'playing';
      updateGamePhase('playing');
    }

    stopInfiniteLoop() {
      if (!this.initialized) return;

      this.gameState.stop();
      this.isInfiniteLoop = false;
      updateInfiniteLoop(false, this.infiniteLoopIteration);

      const countdownOverlay = document.getElementById('countdown-overlay');
      if (countdownOverlay) countdownOverlay.classList.remove('show');

      const summary = this.scoreManager.getSummary();

      if (this.statsManager) {
        this.statsManager.endSession();
        this.updateStatsGraph();
      }

      showCompletionPanel(summary);
      this.renderCompletionView();

      this.gamePhase = 'complete';
      updateGamePhase('complete');
    }

    reset() {
      if (!this.initialized) return;

      this.gameState.reset();
      this.scoreManager.reset();
      this.timingJudge.reset();
      this.metronome.reset();
      this.inputDebouncer.reset();
      this.lastBeat = 0;

      if (this.midiHandler && this.midiHandler.hasOutputs()) {
        this.midiHandler.clearAllPadLights();
      }

      this.isInfiniteLoop = false;
      this.infiniteLoopIteration = 0;
      updateInfiniteLoop(false, 0);

      const patternInfo = PATTERNS[this.currentPatternType];
      const loopsOrBars = patternInfo.isLoopBased ? this.getLoopCount() : patternInfo.bars;
      this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, loopsOrBars);
      this.gameState = new GameState(this.currentPattern);

      this.attachGameStateCallbacks();

      hideCompletionPanel();

      const countdownOverlay = document.getElementById('countdown-overlay');
      if (countdownOverlay) countdownOverlay.classList.remove('show');

      this.noteRenderer.clearCompletionView();
      this.showingCompletionView = false;

      this.gamePhase = 'ready';
      updateGamePhase('ready');
      resetScore();
      resetSequenceMode();

      // Apply sequence mode setting to new game state
      if (get(sequenceMode)) {
        this.gameState.setSequenceMode(true);
      }

      this.noteRenderer.render(this.gameState);
      this.metronome.render({ beatNumber: 1, phase: 0 });
    }

    handlePatternComplete() {
      const countdownOverlay = document.getElementById('countdown-overlay');
      if (countdownOverlay) countdownOverlay.classList.remove('show');

      if (this.isInfiniteLoop) {
        this.infiniteLoopIteration++;
        updateInfiniteLoop(true, this.infiniteLoopIteration);

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

        this.appendMoreNotesToInfiniteLoop();
        return;
      }

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
        this.statsManager.endSession();
        this.updateStatsGraph();
      }

      showCompletionPanel(summary);
      this.renderCompletionView();

      this.gamePhase = 'complete';
      updateGamePhase('complete');
    }

    renderCompletionView() {
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
      this.showingCompletionView = true;
    }

    appendMoreNotesToInfiniteLoop() {
      const { singlePatternDuration } = this.currentPattern;
      const additionalLoops = 4;
      const additionalPattern = createPattern(this.currentPatternType, this.currentBPM, additionalLoops);
      const timeOffset = this.currentPattern.duration;

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

      this.currentPattern.duration += additionalPattern.duration;
      this.currentPattern.loopCount += additionalLoops;

      this.gameState.continueLoop();
    }

    getLoopCount() {
      const loopSelect = document.getElementById('loop-count');
      if (!loopSelect) return 4;
      const value = loopSelect.value;
      if (value === 'infinite') return 4;
      return parseInt(value);
    }

    isInfiniteLoopMode() {
      const loopSelect = document.getElementById('loop-count');
      return loopSelect && loopSelect.value === 'infinite';
    }

    changeBPM(newBPM) {
      if (this.gameState && this.gameState.isPlaying) return;

      this.currentBPM = newBPM;
      const patternInfo = PATTERNS[this.currentPatternType];
      const loopsOrBars = patternInfo.isLoopBased ? this.getLoopCount() : patternInfo.bars;
      this.currentPattern = createPattern(this.currentPatternType, newBPM, loopsOrBars);

      this.regenerateGameState();
    }

    changeLoopCount(loopValue) {
      if (this.gameState && this.gameState.isPlaying) return;

      const patternInfo = PATTERNS[this.currentPatternType];
      const isInfinite = loopValue === 'infinite';
      const loops = isInfinite ? 4 : parseInt(loopValue);
      const loopsOrBars = patternInfo.isLoopBased ? loops : patternInfo.bars;
      this.currentPattern = createPattern(this.currentPatternType, this.currentBPM, loopsOrBars);

      this.regenerateGameState();
    }

    changePattern(patternType) {
      if (this.gameState && this.gameState.isPlaying) return;

      this.currentPatternType = patternType;
      const patternInfo = PATTERNS[patternType];

      this.currentBPM = patternInfo.defaultBPM;
      bpm.set(this.currentBPM);
      updateCurrentPatternInfo(patternInfo);

      const loopsOrBars = patternInfo.isLoopBased ? this.getLoopCount() : patternInfo.bars;
      this.currentPattern = createPattern(patternType, this.currentBPM, loopsOrBars);

      this.regenerateGameState();
      this.updateStatsGraph();
    }

    quantizeCurrentPattern() {
      if (this.gameState && this.gameState.isPlaying) return;
      if (!this.currentPattern || !this.currentPattern.notes || this.currentPattern.notes.length === 0) return;

      const analysis = Quantizer.analyzePattern(this.currentPattern.notes, this.currentBPM);
      const quantizedNotes = Quantizer.quantizeNotes(
        this.currentPattern.notes,
        this.currentBPM,
        analysis.subdivision
      );

      this.currentPattern.notes = quantizedNotes;
      this.regenerateGameState();

      // Show feedback
      const feedback = document.getElementById('hit-feedback');
      if (feedback) {
        feedback.textContent = `Quantized to ${analysis.subdivision.name} grid`;
        feedback.className = 'hit-feedback show';
        setTimeout(() => feedback.className = 'hit-feedback', 1500);
      }
    }

    regenerateGameState() {
      this.metronome.setBPM(this.currentBPM);
      this.lastBeat = 0;

      this.gameState = new GameState(this.currentPattern);
      this.attachGameStateCallbacks();

      this.noteRenderer.render(this.gameState);
      this.metronome.render({ beatNumber: 1, phase: 0 });
    }

    scheduleNoteSounds() {
      if (!this.gameState.isPlaying || this.gameState.currentTime < 0) return;

      const currentTime = this.gameState.currentTime;
      const soundWindow = 50;
      const padLightLeadTime = 100;

      this.gameState.activeNotes.forEach(note => {
        const isMuted = this.noteRenderer.isMuted(note.midiNote);

        if (!note.sounded && Math.abs(note.time - currentTime) <= soundWindow) {
          if (!isMuted) {
            this.audioManager.playDrumSound(note.midiNote, note.velocity);
          }
          note.sounded = true;
        }

        const timeUntilNote = note.time - currentTime;
        if (!note.padLit && timeUntilNote > 0 && timeUntilNote <= padLightLeadTime) {
          if (!isMuted && this.midiHandler && this.midiHandler.hasOutputs()) {
            this.midiHandler.flashPad(note.midiNote, 200, 127);
          }
          note.padLit = true;
        }
      });
    }

    handleResize() {
      if (!this.noteRenderer) return;
      this.noteRenderer.updateCanvasSize();

      if (this.gameState) {
        if (this.showingCompletionView) {
          this.renderCompletionView();
        } else {
          this.noteRenderer.render(this.gameState);
        }
      }
    }

    updateDeviceStatus() {
      const devices = [];

      if (this.midiHandler.hasDevices()) {
        const midiDevices = this.midiHandler.getAvailableDevices();
        midiDevices.forEach(device => {
          devices.push({ id: device.id, name: device.name });
        });
      }

      // Always add keyboard option
      devices.unshift({ id: 'keyboard', name: 'Keyboard (A/S/D/J/K/L)' });

      updateMidiDevices(devices);

      const isKeyboard = !this.midiHandler.hasDevices() ||
        this.midiHandler.getSelectedDeviceId() === 'none';
      isKeyboardMode.set(isKeyboard);

      if (this.noteRenderer) {
        this.noteRenderer.setInputMode(isKeyboard);
      }
    }

    handleDeviceSelection(deviceId) {
      if (deviceId === 'all') {
        this.midiHandler.selectDevice(null);
      } else if (deviceId === 'none' || deviceId === 'keyboard') {
        this.midiHandler.selectDevice('none');
      } else {
        this.midiHandler.selectDevice(deviceId);
      }
    }

    updateStatsGraph() {
      if (!this.statsGraph || !this.statsManager) return;

      const graphData = this.statsManager.getGraphData(this.currentPatternType, this.currentBPM);
      this.statsGraph.render(graphData, { showHistorical: true });

      const currentStats = this.statsManager.getCurrentSessionStats();
      const patternStats = this.statsManager.getPatternStats(this.currentPatternType, this.currentBPM);

      let infoText = `Practice @ ${this.currentBPM} BPM to see progress`;

      if (currentStats && currentStats.loopResults.length > 0) {
        const lastLoop = currentStats.loopResults[currentStats.loopResults.length - 1];
        infoText = `Loop ${lastLoop.loopNumber}: ${lastLoop.accuracy.toFixed(1)}% @ ${this.currentBPM} BPM`;
      } else if (patternStats && patternStats.sessions.length > 0) {
        const trend = patternStats.recentTrend;
        const trendSymbol = trend >= 0 ? '+' : '';
        infoText = `${patternStats.sessions.length} sessions @ ${this.currentBPM} BPM | Trend: ${trendSymbol}${trend}%`;
      }

      updateStatsInfo(infoText);
    }

    updateDebounceStats() {
      if (this.inputDebouncer) {
        const stats = this.inputDebouncer.getStats();
        updateDebounceFiltered(stats.filteredInputs);
      }
    }
  }

  onMount(async () => {
    // Initialize theme
    ThemeManager.init();

    // Wait for canvas elements to be mounted
    await new Promise(resolve => setTimeout(resolve, 0));

    // Create and initialize game engine
    gameEngine = new DrumGameEngine();
    setGameEngine(gameEngine);

    await gameEngine.init(gameCanvasEl, metronomeCanvasEl, statsCanvasEl);

    // Expose for debugging
    window.drumGame = gameEngine;

    loading = false;
  });

  onDestroy(() => {
    // Cleanup if needed
  });
</script>

<div class="container">
  {#if loading}
    <LoadingOverlay />
  {/if}

  <Header />

  <ControlsRow bind:metronomeCanvas={metronomeCanvasEl} />

  <MidiUpload />

  <SequenceModeToggle />

  <GameCanvas bind:canvas={gameCanvasEl} />

  <GameButton />

  <StatsScoreRow bind:statsCanvas={statsCanvasEl} />

  <CompletionPanel />

  <SettingsRow />
</div>

<style>
  /* Container styles are in main.css */
</style>
