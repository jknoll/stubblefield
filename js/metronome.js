// Visual metronome for beat indication

export class Metronome {
  constructor(bpm, canvasElement) {
    this.bpm = bpm;
    this.beatDuration = (60 / bpm) * 1000; // ms per beat
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.currentBeat = 0;
  }

  /**
   * Update metronome state based on current time
   * @param {number} currentTime - Current game time in ms
   * @returns {Object} Beat info { beatNumber, phase }
   */
  update(currentTime) {
    // Calculate which beat we're on, handling negative times (countdown)
    const beatNumber = Math.floor(currentTime / this.beatDuration);

    // Proper modulo that handles negative numbers correctly
    // JavaScript's % operator doesn't work correctly with negatives for cycling
    let beatInBar = ((beatNumber % 4) + 4) % 4;  // Always 0-3
    this.currentBeat = beatInBar + 1; // 1-4 for 4/4 time

    // Calculate beat phase (0-1), handling negative times
    let beatPhase = (currentTime % this.beatDuration) / this.beatDuration;
    if (beatPhase < 0) beatPhase += 1;  // Normalize negative phase

    return {
      beatNumber: this.currentBeat,
      phase: beatPhase
    };
  }

  /**
   * Render metronome visualization
   * Visual beat indicator has been removed - metronome is audio-only now
   * @param {Object} beatInfo - Beat information from update()
   */
  render(beatInfo) {
    // Visual metronome removed - audio-only mode
    // Canvas is hidden via CSS, but clear it just in case
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Update BPM
   * @param {number} bpm - New BPM value
   */
  setBPM(bpm) {
    this.bpm = bpm;
    this.beatDuration = (60 / bpm) * 1000;
  }

  /**
   * Reset metronome state
   */
  reset() {
    this.currentBeat = 0;
  }
}
