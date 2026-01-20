// Canvas-based note renderer (horizontal layout - notes flow right to left)

import { GAME_CONFIG, MIDI_NOTE_MAP } from './constants.js';

export class NoteRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.config = GAME_CONFIG;

    // Recent hit feedback for display
    this.recentHits = [];

    this.setupCanvas();
  }

  /**
   * Set up canvas dimensions and initial draw
   */
  setupCanvas() {
    this.canvas.width = this.config.CANVAS_WIDTH;
    this.canvas.height = this.config.CANVAS_HEIGHT;

    // Set rendering quality
    this.ctx.imageSmoothingEnabled = true;
  }

  /**
   * Main render function called each frame
   * @param {GameState} gameState - Current game state
   */
  render(gameState) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawBackground();

    // Draw lane dividers
    this.drawLanes();

    // Draw hit line
    this.drawHitLine();

    // Draw active notes
    gameState.activeNotes.forEach(note => {
      this.drawNote(note, gameState.currentTime);
    });

    // Draw recent hit effects
    this.drawHitEffects(gameState.currentTime);
  }

  /**
   * Draw background gradient (horizontal, darker on left)
   */
  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#0a0a0a');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw horizontal lane dividers and labels on left side
   */
  drawLanes() {
    const laneCount = Object.keys(MIDI_NOTE_MAP).length;

    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    // Draw horizontal dividers
    for (let i = 0; i <= laneCount; i++) {
      const y = i * this.config.LANE_HEIGHT;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Draw lane labels on the left side
    this.ctx.fillStyle = '#888';
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    Object.entries(MIDI_NOTE_MAP).forEach(([midiNote, info]) => {
      const y = info.lane * this.config.LANE_HEIGHT + this.config.LANE_HEIGHT / 2;
      const x = 8;

      this.ctx.fillText(info.name, x, y);
    });
  }

  /**
   * Draw the hit line where notes should be struck (vertical line on left)
   */
  drawHitLine() {
    const x = this.config.HIT_LINE_X;

    // Draw glowing vertical line
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#FFFFFF';

    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.ctx.stroke();

    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  /**
   * Draw a single note
   * @param {Object} note - Note to draw
   * @param {number} currentTime - Current game time
   */
  drawNote(note, currentTime) {
    const noteInfo = MIDI_NOTE_MAP[note.midiNote];
    if (!noteInfo) return; // Unknown note type

    // Calculate X position based on time until hit (notes come from right)
    const xPosition = this.calculateXPosition(note.time, currentTime);

    // Don't draw if off screen
    if (xPosition < -this.config.NOTE_WIDTH || xPosition > this.canvas.width) {
      return;
    }

    // Calculate Y position based on lane
    const yPosition = noteInfo.lane * this.config.LANE_HEIGHT;

    // Draw note rectangle with glow
    this.ctx.fillStyle = noteInfo.color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = noteInfo.color;

    const padding = 4;
    this.ctx.fillRect(
      xPosition,
      yPosition + padding,
      this.config.NOTE_WIDTH,
      this.config.LANE_HEIGHT - padding * 2
    );

    // Draw note border
    this.ctx.strokeStyle = '#FFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      xPosition,
      yPosition + padding,
      this.config.NOTE_WIDTH,
      this.config.LANE_HEIGHT - padding * 2
    );

    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  /**
   * Calculate X position of note based on time until hit
   * Notes scroll from right to left, hit line is on left
   * @param {number} noteTime - Time when note should be hit
   * @param {number} currentTime - Current game time
   * @returns {number} X position on canvas
   */
  calculateXPosition(noteTime, currentTime) {
    const timeUntilHit = noteTime - currentTime;
    const hitLineX = this.config.HIT_LINE_X;

    // Notes scroll from right to left
    // When timeUntilHit is positive (future), note is to the right of hit line
    // When timeUntilHit is 0, note is at hit line
    // When timeUntilHit is negative (past), note is to the left of hit line
    const xOffset = timeUntilHit * this.config.SCROLL_SPEED;
    return hitLineX + xOffset;
  }

  /**
   * Add hit feedback to be displayed
   * @param {Object} judgment - Judgment object
   * @param {number} lane - Lane number where hit occurred
   */
  addHitFeedback(judgment, lane) {
    this.recentHits.push({
      judgment: judgment.judgment,
      lane: lane,
      startTime: performance.now(),
      duration: 500 // ms to display
    });
  }

  /**
   * Draw hit effect animations
   * @param {number} currentTime - Current game time
   */
  drawHitEffects(currentTime) {
    const now = performance.now();

    // Remove old hit effects
    this.recentHits = this.recentHits.filter(hit => {
      return (now - hit.startTime) < hit.duration;
    });

    // Draw each hit effect
    this.recentHits.forEach(hit => {
      const elapsed = now - hit.startTime;
      const progress = elapsed / hit.duration;
      const alpha = 1 - progress;

      // Position at hit line (vertical line on left)
      const x = this.config.HIT_LINE_X;
      const y = hit.lane * this.config.LANE_HEIGHT + this.config.LANE_HEIGHT / 2;

      // Draw expanding circle
      this.ctx.strokeStyle = this.getJudgmentColor(hit.judgment);
      this.ctx.lineWidth = 3;
      this.ctx.globalAlpha = alpha;

      const radius = 15 + (progress * 25); // Expand from 15 to 40
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.globalAlpha = 1.0;
    });
  }

  /**
   * Get color for judgment type
   * @param {string} judgment - Judgment type
   * @returns {string} Color code
   */
  getJudgmentColor(judgment) {
    const colors = {
      PERFECT: '#4CAF50',
      GOOD: '#8BC34A',
      OK: '#FFC107',
      EARLY: '#FF9800',
      LATE: '#FF9800',
      MISS: '#F44336',
      WRONG_NOTE: '#F44336',
      HIT: '#FFFFFF'  // White for generic lane indicator
    };

    return colors[judgment] || '#888';
  }

  /**
   * Draw progress bar at top
   * @param {number} progress - Progress percentage (0-100)
   */
  drawProgressBar(progress) {
    const barHeight = 5;
    const barWidth = this.canvas.width;

    // Background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, 0, barWidth, barHeight);

    // Progress
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillRect(0, 0, (barWidth * progress) / 100, barHeight);
  }
}
