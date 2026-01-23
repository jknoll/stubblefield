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
   * @param {Object} beatInfo - Beat information from update()
   */
  render(beatInfo) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw 4 beat indicators
    const circleRadius = 20;
    const spacing = 70;
    const startX = (this.canvas.width - (spacing * 3)) / 2;
    const y = this.canvas.height / 2;

    for (let i = 1; i <= 4; i++) {
      const x = startX + (i - 1) * spacing;

      if (i === beatInfo.beatNumber) {
        // Active beat - pulse effect
        const scale = 1 + (0.3 * (1 - beatInfo.phase));
        const radius = circleRadius * scale;

        // Highlight beat 1 differently
        const color = i === 1 ? '#FF4444' : '#4CAF50';

        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Reset shadow
        this.ctx.shadowBlur = 0;
      } else {
        // Inactive beat
        this.ctx.fillStyle = '#333';
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }

      // Beat number
      this.ctx.fillStyle = i === beatInfo.beatNumber ? '#000' : '#888';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(i.toString(), x, y);
    }
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
