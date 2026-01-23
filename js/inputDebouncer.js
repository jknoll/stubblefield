// Input debouncer for filtering double-triggers from unreliable drum hardware

export class InputDebouncer {
  constructor(debounceWindowMs = 30) {
    // Map of midiNote -> last trigger timestamp
    this.lastTriggerTime = new Map();
    // Debounce window in milliseconds (triggers within this window are ignored)
    this.debounceWindowMs = debounceWindowMs;
    // Statistics for debugging
    this.stats = {
      totalInputs: 0,
      filteredInputs: 0
    };
  }

  /**
   * Set the debounce window in milliseconds
   * @param {number} ms - Debounce window (0 = no debouncing)
   */
  setDebounceWindow(ms) {
    this.debounceWindowMs = Math.max(0, ms);
  }

  /**
   * Get the current debounce window
   * @returns {number}
   */
  getDebounceWindow() {
    return this.debounceWindowMs;
  }

  /**
   * Check if an input should be allowed through (not a double-trigger)
   * @param {number} midiNote - The MIDI note number
   * @param {number} timestamp - The timestamp of the input
   * @returns {boolean} - True if input should be processed, false if filtered
   */
  shouldAllowInput(midiNote, timestamp) {
    this.stats.totalInputs++;

    // If debouncing is disabled, allow everything
    if (this.debounceWindowMs <= 0) {
      this.lastTriggerTime.set(midiNote, timestamp);
      return true;
    }

    const lastTime = this.lastTriggerTime.get(midiNote);

    if (lastTime !== undefined) {
      const timeSinceLastTrigger = timestamp - lastTime;

      if (timeSinceLastTrigger < this.debounceWindowMs) {
        // This is a double-trigger, filter it out
        this.stats.filteredInputs++;
        console.log(`Debounce: Filtered double-trigger on note ${midiNote} (${timeSinceLastTrigger.toFixed(1)}ms since last)`);
        return false;
      }
    }

    // Valid input, update last trigger time
    this.lastTriggerTime.set(midiNote, timestamp);
    return true;
  }

  /**
   * Process an input and return it only if it passes the debounce filter
   * @param {number} midiNote - The MIDI note number
   * @param {number} velocity - The velocity value
   * @param {number} timestamp - The timestamp of the input
   * @returns {object|null} - Input object if allowed, null if filtered
   */
  processInput(midiNote, velocity, timestamp) {
    if (this.shouldAllowInput(midiNote, timestamp)) {
      return { midiNote, velocity, timestamp };
    }
    return null;
  }

  /**
   * Get statistics about filtered inputs
   * @returns {object}
   */
  getStats() {
    const filterRate = this.stats.totalInputs > 0
      ? ((this.stats.filteredInputs / this.stats.totalInputs) * 100).toFixed(1)
      : 0;

    return {
      ...this.stats,
      filterRate: `${filterRate}%`
    };
  }

  /**
   * Reset the debouncer state
   */
  reset() {
    this.lastTriggerTime.clear();
    this.stats = {
      totalInputs: 0,
      filteredInputs: 0
    };
  }
}
