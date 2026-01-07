// Game state management and game loop

import { GAME_CONFIG, TIMING_WINDOWS } from './constants.js';

export class GameState {
  constructor(pattern) {
    this.pattern = pattern;
    this.currentTime = 0;
    this.startTime = null;
    this.isPlaying = false;
    this.isPaused = false;

    // Lead-in countdown
    this.isCountingDown = false;
    this.countdownValue = 0;

    // Note management
    this.upcomingNotes = [...pattern.notes]; // Notes not yet visible
    this.activeNotes = [];                   // Notes currently on screen
    this.hitNotes = [];                      // Notes already hit
    this.missedNotes = [];                   // Notes that passed without hit

    // Frame timing
    this.lastFrameTime = 0;
    this.animationFrameId = null;

    // Callbacks
    this.onUpdate = null;
    this.onPatternComplete = null;
    this.onCountdown = null;
  }

  /**
   * Start or resume the game
   */
  start() {
    if (this.isPlaying) return;

    // Start with negative time for lead-in countdown
    if (this.currentTime === 0) {
      this.currentTime = -GAME_CONFIG.LEAD_IN_TIME;
      this.isCountingDown = true;
    }

    this.startTime = performance.now() - this.currentTime;
    this.lastFrameTime = performance.now();
    this.isPlaying = true;
    this.isPaused = false;

    console.log('Game started with countdown');
    this.gameLoop();
  }

  /**
   * Main game loop
   */
  gameLoop() {
    const currentFrameTime = performance.now();
    const deltaTime = currentFrameTime - this.lastFrameTime;

    this.update(deltaTime);

    if (this.isPlaying) {
      this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    this.lastFrameTime = currentFrameTime;
  }

  /**
   * Update game state
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    // Update current time
    this.currentTime = performance.now() - this.startTime;

    // Handle countdown
    if (this.isCountingDown) {
      if (this.currentTime < 0) {
        // Calculate countdown value (4, 3, 2, 1)
        const beatDuration = (60 / this.pattern.bpm) * 1000;
        const beatsRemaining = Math.ceil(-this.currentTime / beatDuration);

        if (beatsRemaining !== this.countdownValue) {
          this.countdownValue = beatsRemaining;

          if (this.onCountdown) {
            this.onCountdown(this.countdownValue);
          }
        }
      } else {
        // Countdown complete
        this.isCountingDown = false;
        this.countdownValue = 0;

        if (this.onCountdown) {
          this.onCountdown(0); // Signal countdown complete
        }
      }
    }

    // Always make notes active (even during countdown) so they're visible
    this.updateActiveNotes();

    // Only process missed notes and completion after countdown
    if (this.currentTime >= 0) {
      // Check for missed notes
      this.checkMissedNotes();

      // Check if pattern is complete
      this.checkPatternComplete();
    }

    // Always notify renderer to update
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  /**
   * Move notes from upcoming to active when within lookahead window
   */
  updateActiveNotes() {
    const lookaheadThreshold = this.currentTime + GAME_CONFIG.LOOKAHEAD_TIME;

    // Move notes into active list
    this.upcomingNotes = this.upcomingNotes.filter(note => {
      if (note.time <= lookaheadThreshold) {
        this.activeNotes.push(note);
        return false; // Remove from upcoming
      }
      return true; // Keep in upcoming
    });
  }

  /**
   * Check for notes that passed the hit window without being hit
   */
  checkMissedNotes() {
    const missThreshold = this.currentTime - TIMING_WINDOWS.MISS;

    this.activeNotes = this.activeNotes.filter(note => {
      if (note.time < missThreshold && !note.judged) {
        // Note passed without being hit
        note.judged = true;
        this.missedNotes.push(note);

        // Notify about miss (will be handled by scoreManager)
        if (this.onMiss) {
          this.onMiss(note);
        }

        return false; // Remove from active
      }
      return true; // Keep in active
    });
  }

  /**
   * Record a hit on a note
   * @param {Object} note - The note that was hit
   * @param {Object} judgment - The judgment from timingJudge
   */
  recordHit(note, judgment) {
    note.judged = true;
    note.hit = true;
    note.judgment = judgment;

    // Move from active to hit
    const index = this.activeNotes.indexOf(note);
    if (index > -1) {
      this.activeNotes.splice(index, 1);
    }

    this.hitNotes.push(note);
  }

  /**
   * Check if the pattern is complete
   */
  checkPatternComplete() {
    const allNotesProcessed =
      this.upcomingNotes.length === 0 &&
      this.activeNotes.length === 0;

    if (allNotesProcessed && this.isPlaying) {
      console.log('Pattern complete!');
      this.stop();

      if (this.onPatternComplete) {
        this.onPatternComplete();
      }
    }
  }

  /**
   * Pause the game
   */
  pause() {
    if (!this.isPlaying || this.isPaused) return;

    this.isPlaying = false;
    this.isPaused = true;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log('Game paused');
  }

  /**
   * Resume from pause
   */
  resume() {
    if (!this.isPaused) return;

    this.isPaused = false;
    this.start();

    console.log('Game resumed');
  }

  /**
   * Stop the game
   */
  stop() {
    this.isPlaying = false;
    this.isPaused = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log('Game stopped');
  }

  /**
   * Reset the game state
   */
  reset() {
    this.stop();

    this.currentTime = 0;
    this.startTime = null;

    // Reset countdown
    this.isCountingDown = false;
    this.countdownValue = 0;

    // Reset note lists
    this.upcomingNotes = this.pattern.notes.map(note => ({
      ...note,
      hit: false,
      judged: false,
      sounded: false  // Reset audio playback flag
    }));
    this.activeNotes = [];
    this.hitNotes = [];
    this.missedNotes = [];

    console.log('Game reset');
  }

  /**
   * Get current game progress as percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgress() {
    const totalNotes = this.pattern.notes.length;
    const processedNotes = this.hitNotes.length + this.missedNotes.length;
    return totalNotes > 0 ? (processedNotes / totalNotes) * 100 : 0;
  }
}
