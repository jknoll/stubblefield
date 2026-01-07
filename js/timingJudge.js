// Timing accuracy evaluation

import { TIMING_WINDOWS, TIMING_SCORES } from './constants.js';

export class TimingJudge {
  constructor() {
    this.windows = TIMING_WINDOWS;
    this.scores = TIMING_SCORES;
    this.lastHitTime = {}; // Track last hit time per MIDI note to prevent double hits
  }

  /**
   * Judge the accuracy of a hit
   * @param {number} noteTime - Expected time of note
   * @param {number} hitTime - Actual time of hit
   * @param {boolean} isCorrectNote - Whether correct note was hit
   * @returns {Object} Judgment object
   */
  judgeHit(noteTime, hitTime, isCorrectNote) {
    const timeDiff = hitTime - noteTime;
    const absTimeDiff = Math.abs(timeDiff);

    // Wrong note always scores poorly
    if (!isCorrectNote) {
      return {
        judgment: 'WRONG_NOTE',
        score: this.scores.WRONG_NOTE,
        timeDiff: timeDiff,
        isCorrect: false
      };
    }

    // Determine timing accuracy
    let judgment;

    if (absTimeDiff <= this.windows.PERFECT) {
      judgment = 'PERFECT';
    } else if (absTimeDiff <= this.windows.GOOD) {
      judgment = 'GOOD';
    } else if (absTimeDiff <= this.windows.OK) {
      judgment = 'OK';
    } else if (absTimeDiff <= this.windows.MISS) {
      // Within hit window but not accurate
      judgment = timeDiff < 0 ? 'EARLY' : 'LATE';
    } else {
      judgment = 'MISS';
    }

    return {
      judgment: judgment,
      score: this.scores[judgment],
      timeDiff: timeDiff,
      isCorrect: true,
      isEarly: timeDiff < 0,
      isLate: timeDiff > 0
    };
  }

  /**
   * Find the best matching note for a MIDI input
   * @param {number} midiNote - MIDI note number
   * @param {number} hitTime - Time of hit
   * @param {Array} activeNotes - Currently active notes
   * @returns {Object|null} Best matching note or null
   */
  findMatchingNote(midiNote, hitTime, activeNotes) {
    let bestMatch = null;
    let bestTimeDiff = Infinity;

    // Check for double hits (ignore if too soon after last hit)
    if (this.lastHitTime[midiNote]) {
      const timeSinceLastHit = hitTime - this.lastHitTime[midiNote];
      if (timeSinceLastHit < 50) { // 50ms debounce
        console.log(`Ignoring double hit on MIDI ${midiNote}`);
        return null;
      }
    }

    // Find closest matching note within hit window
    for (const note of activeNotes) {
      if (note.midiNote === midiNote && !note.judged) {
        const timeDiff = Math.abs(hitTime - note.time);

        // Within hit window and closer than previous best
        if (timeDiff <= this.windows.MISS && timeDiff < bestTimeDiff) {
          bestMatch = note;
          bestTimeDiff = timeDiff;
        }
      }
    }

    // Record hit time if we found a match
    if (bestMatch) {
      this.lastHitTime[midiNote] = hitTime;
    }

    return bestMatch;
  }

  /**
   * Reset the double-hit prevention tracking
   */
  reset() {
    this.lastHitTime = {};
  }

  /**
   * Get human-readable description of judgment
   * @param {string} judgment - Judgment type
   * @returns {string} Description
   */
  getJudgmentDescription(judgment) {
    const descriptions = {
      PERFECT: 'Perfect!',
      GOOD: 'Good!',
      OK: 'OK',
      EARLY: 'Too Early',
      LATE: 'Too Late',
      MISS: 'Miss',
      WRONG_NOTE: 'Wrong Note'
    };

    return descriptions[judgment] || judgment;
  }
}
