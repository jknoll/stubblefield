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
    this.wrongPadHits = [];                  // Wrong pad hits for visual feedback

    // Frame timing
    this.lastFrameTime = 0;
    this.animationFrameId = null;

    // Sequence mode (play in order, not in time)
    this.sequenceMode = false;
    this.sequenceWaitingForHit = false;
    this.sequenceCurrentNoteIndex = 0;
    this.sequenceCorrectHits = 0;
    this.sequenceWrongHits = 0;
    this.sequencePausedTime = null;  // Time when we paused for the current note

    // Callbacks
    this.onUpdate = null;
    this.onPatternComplete = null;
    this.onCountdown = null;
    this.onSequenceProgress = null;  // Called when sequence progress updates
  }

  /**
   * Enable or disable sequence mode
   * @param {boolean} enabled - Whether sequence mode is enabled
   */
  setSequenceMode(enabled) {
    this.sequenceMode = enabled;
    console.log(`Sequence mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Start or resume the game
   */
  start() {
    if (this.isPlaying) return;

    // Start with negative time for lead-in countdown
    // Calculate lead-in time based on BPM to ensure beat alignment
    if (this.currentTime === 0) {
      const beatDuration = (60 / this.pattern.bpm) * 1000;
      this.leadInTime = GAME_CONFIG.COUNTDOWN_BEATS * beatDuration;
      this.currentTime = -this.leadInTime;
      this.isCountingDown = true;
    }

    this.startTime = performance.now() - this.currentTime;
    this.lastFrameTime = performance.now();
    this.isPlaying = true;
    this.isPaused = false;

    console.log(`Game started with ${GAME_CONFIG.COUNTDOWN_BEATS} beat countdown (${Math.round(this.leadInTime)}ms at ${this.pattern.bpm} BPM)`);
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
    // In sequence mode, handle time differently
    if (this.sequenceMode) {
      this.updateSequenceMode(deltaTime);
      return;
    }

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
   * Update logic for sequence mode (play in order, not in time)
   * Time only advances when the correct note is hit
   */
  updateSequenceMode(deltaTime) {
    // Always make notes active so they're visible
    this.updateActiveNotes();

    // Check if we're waiting for a hit
    if (!this.sequenceWaitingForHit && this.activeNotes.length > 0) {
      // Find the next note to hit (earliest unjudged note)
      const nextNote = this.activeNotes.find(n => !n.judged);
      if (nextNote) {
        this.sequenceWaitingForHit = true;
        this.sequencePausedTime = nextNote.time;
        // Position time just before the next note
        this.currentTime = nextNote.time - 50;
      }
    }

    // If we're waiting for a hit, freeze time at the note position
    if (this.sequenceWaitingForHit) {
      this.currentTime = this.sequencePausedTime - 50;
      this.startTime = performance.now() - this.currentTime;
    } else {
      // Not waiting - advance time normally
      this.currentTime = performance.now() - this.startTime;
    }

    // Check if pattern is complete
    if (this.sequenceCurrentNoteIndex >= this.pattern.notes.length) {
      this.checkPatternComplete();
    }

    // Always notify renderer to update
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  /**
   * Handle a hit in sequence mode
   * @param {number} midiNote - The MIDI note that was hit
   * @returns {Object} Result with isCorrect, note, and shouldAdvance
   */
  handleSequenceHit(midiNote) {
    if (!this.sequenceMode || !this.sequenceWaitingForHit) {
      return { isCorrect: false, note: null, shouldAdvance: false };
    }

    // Find the current note we're waiting for
    const currentNote = this.activeNotes.find(n => !n.judged);
    if (!currentNote) {
      return { isCorrect: false, note: null, shouldAdvance: false };
    }

    const isCorrect = currentNote.midiNote === midiNote;

    if (isCorrect) {
      // Correct hit - mark the note and advance
      currentNote.judged = true;
      currentNote.hit = true;
      currentNote.accuracy = {
        timeDiff: 0,
        rushing: false,
        dragging: false,
        wrongPad: false,
        missed: false,
        judgment: 'PERFECT',  // In sequence mode, correct = perfect
        sequenceMode: true
      };

      // Move to hit notes
      const index = this.activeNotes.indexOf(currentNote);
      if (index > -1) {
        this.activeNotes.splice(index, 1);
      }
      this.hitNotes.push(currentNote);

      this.sequenceCorrectHits++;
      this.sequenceCurrentNoteIndex++;
      this.sequenceWaitingForHit = false;

      // Notify progress
      if (this.onSequenceProgress) {
        this.onSequenceProgress(this.sequenceCurrentNoteIndex, this.sequenceCorrectHits, this.sequenceWrongHits);
      }

      return { isCorrect: true, note: currentNote, shouldAdvance: true };
    } else {
      // Wrong hit - count it but don't advance
      this.sequenceWrongHits++;

      // Record wrong pad hit for feedback
      this.wrongPadHits.push({
        time: this.currentTime,
        midiNote,
        expectedMidiNote: currentNote.midiNote,
        timestamp: performance.now()
      });

      // Notify progress
      if (this.onSequenceProgress) {
        this.onSequenceProgress(this.sequenceCurrentNoteIndex, this.sequenceCorrectHits, this.sequenceWrongHits);
      }

      return { isCorrect: false, note: currentNote, shouldAdvance: false };
    }
  }

  /**
   * Get the current expected note in sequence mode
   * @returns {Object|null} The note we're waiting for, or null
   */
  getSequenceCurrentNote() {
    if (!this.sequenceMode) return null;
    return this.activeNotes.find(n => !n.judged) || null;
  }

  /**
   * Get sequence mode statistics
   * @returns {Object} Stats including correct, wrong, remaining, accuracy
   */
  getSequenceStats() {
    const total = this.pattern.notes.length;
    const remaining = total - this.sequenceCurrentNoteIndex;
    const accuracy = this.sequenceCorrectHits + this.sequenceWrongHits > 0
      ? (this.sequenceCorrectHits / (this.sequenceCorrectHits + this.sequenceWrongHits)) * 100
      : 100;

    return {
      correct: this.sequenceCorrectHits,
      wrong: this.sequenceWrongHits,
      remaining: remaining,
      total: total,
      currentIndex: this.sequenceCurrentNoteIndex,
      accuracy: accuracy.toFixed(1)
    };
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

        // Add accuracy data for missed note
        note.accuracy = {
          timeDiff: null,
          rushing: false,
          dragging: false,
          wrongPad: false,
          missed: true,
          judgment: 'MISS'
        };

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

    // Add per-note accuracy data
    note.accuracy = {
      timeDiff: judgment.timeDiff || 0,
      rushing: judgment.isEarly || false,
      dragging: judgment.isLate || false,
      wrongPad: !judgment.isCorrect,
      missed: false,
      judgment: judgment.judgment
    };

    // Move from active to hit
    const index = this.activeNotes.indexOf(note);
    if (index > -1) {
      this.activeNotes.splice(index, 1);
    }

    this.hitNotes.push(note);
  }

  /**
   * Record a wrong pad hit for visual feedback
   * @param {number} midiNote - The MIDI note that was hit
   * @param {number} lane - The lane of the hit pad
   */
  recordWrongPadHit(midiNote, lane) {
    this.wrongPadHits.push({
      time: this.currentTime,
      midiNote,
      lane,
      timestamp: performance.now()
    });
  }

  /**
   * Get all notes with their accuracy data (for visualization)
   * @returns {Array} All notes sorted by time with accuracy info
   */
  getAllNotesWithAccuracy() {
    return [...this.hitNotes, ...this.missedNotes].sort((a, b) => a.time - b.time);
  }

  /**
   * Get notes with averaged accuracy data for multi-loop patterns
   * Groups notes by their position within a single loop and averages accuracy
   * @param {number} singlePatternDuration - Duration of a single pattern instance
   * @param {number} loopCount - Number of loops
   * @returns {Array} Single pattern's worth of notes with averaged accuracy
   */
  getAveragedNotesForVisualization(singlePatternDuration, loopCount) {
    if (loopCount <= 1) {
      return this.getAllNotesWithAccuracy();
    }

    const allNotes = this.getAllNotesWithAccuracy();

    // Group notes by their position within a single loop
    // Use a tolerance for floating point comparison
    const tolerance = 10; // 10ms tolerance for grouping
    const noteGroups = new Map();

    allNotes.forEach(note => {
      // Calculate position within single pattern
      const positionInPattern = note.time % singlePatternDuration;

      // Find existing group or create new one
      let foundGroup = null;
      for (const [key, group] of noteGroups.entries()) {
        if (Math.abs(key - positionInPattern) < tolerance && group[0].midiNote === note.midiNote) {
          foundGroup = key;
          break;
        }
      }

      if (foundGroup !== null) {
        noteGroups.get(foundGroup).push(note);
      } else {
        noteGroups.set(positionInPattern, [note]);
      }
    });

    // Average the accuracy data for each group
    const averagedNotes = [];

    for (const [positionInPattern, notes] of noteGroups.entries()) {
      // Create averaged note
      const firstNote = notes[0];

      // Count accuracy types
      let perfectCount = 0;
      let goodCount = 0;
      let okCount = 0;
      let earlyCount = 0;
      let lateCount = 0;
      let missCount = 0;
      let wrongPadCount = 0;
      let totalTimeDiff = 0;
      let timeDiffCount = 0;

      notes.forEach(n => {
        if (n.accuracy) {
          if (n.accuracy.missed) missCount++;
          else if (n.accuracy.wrongPad) wrongPadCount++;
          else {
            switch (n.accuracy.judgment) {
              case 'PERFECT': perfectCount++; break;
              case 'GOOD': goodCount++; break;
              case 'OK': okCount++; break;
              case 'EARLY': earlyCount++; break;
              case 'LATE': lateCount++; break;
            }
          }

          if (n.accuracy.timeDiff !== null) {
            totalTimeDiff += n.accuracy.timeDiff;
            timeDiffCount++;
          }
        } else {
          missCount++;
        }
      });

      // Determine overall judgment based on most common outcome
      let avgJudgment;
      const total = notes.length;
      const hitCount = total - missCount - wrongPadCount;

      if (missCount >= total / 2) {
        avgJudgment = 'MISS';
      } else if (wrongPadCount >= total / 2) {
        avgJudgment = 'WRONG_NOTE';
      } else if (perfectCount >= hitCount / 2) {
        avgJudgment = 'PERFECT';
      } else if (goodCount >= hitCount / 3) {
        avgJudgment = 'GOOD';
      } else if (okCount >= hitCount / 3) {
        avgJudgment = 'OK';
      } else if (earlyCount > lateCount) {
        avgJudgment = 'EARLY';
      } else if (lateCount > earlyCount) {
        avgJudgment = 'LATE';
      } else {
        avgJudgment = 'OK';
      }

      averagedNotes.push({
        time: positionInPattern,
        midiNote: firstNote.midiNote,
        accuracy: {
          timeDiff: timeDiffCount > 0 ? totalTimeDiff / timeDiffCount : null,
          rushing: earlyCount > lateCount,
          dragging: lateCount > earlyCount,
          wrongPad: wrongPadCount >= total / 2,
          missed: missCount >= total / 2,
          judgment: avgJudgment,
          // Extra info for debugging
          loopResults: notes.map(n => n.accuracy?.judgment || 'MISS')
        }
      });
    }

    return averagedNotes.sort((a, b) => a.time - b.time);
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
   * Continue the game loop (for infinite loop mode)
   * Resumes without resetting time or showing countdown
   */
  continueLoop() {
    if (this.isPlaying) return;

    this.startTime = performance.now() - this.currentTime;
    this.lastFrameTime = performance.now();
    this.isPlaying = true;
    this.isPaused = false;

    console.log('Game loop continued');
    this.gameLoop();
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
    this.wrongPadHits = [];

    // Reset sequence mode state
    this.sequenceWaitingForHit = false;
    this.sequenceCurrentNoteIndex = 0;
    this.sequenceCorrectHits = 0;
    this.sequenceWrongHits = 0;
    this.sequencePausedTime = null;

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
