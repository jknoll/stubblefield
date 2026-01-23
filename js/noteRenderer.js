// Canvas-based note renderer (horizontal layout - notes flow right to left)

import { GAME_CONFIG, MIDI_NOTE_MAP, MIDI_TO_KEY } from './constants.js';

export class NoteRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.baseConfig = GAME_CONFIG;

    // Dynamic config that can change with resize
    this.config = { ...GAME_CONFIG };

    // Recent hit feedback for display
    this.recentHits = [];

    // Flag to prevent rendering over completion view
    this.showingCompletionView = false;

    // Input mode tracking for displaying keyboard labels
    this.isKeyboardMode = true; // Default to keyboard mode

    // Hover state for tooltips
    this.hoveredLane = null;

    // Muted instruments tracking
    this.mutedInstruments = new Set();

    // Callback for mute toggle
    this.onMuteToggle = null;

    this.setupCanvas();
    this.setupMouseEvents();
  }

  /**
   * Set up mouse events for lane hover tooltips and mute toggle
   */
  setupMouseEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const lane = Math.floor(y / this.config.LANE_HEIGHT);

      if (lane >= 0 && lane < Object.keys(MIDI_NOTE_MAP).length) {
        this.hoveredLane = lane;
      } else {
        this.hoveredLane = null;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredLane = null;
    });

    // Handle click on mute icon area
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is in the mute icon area (left 70px of canvas)
      if (x < 70) {
        const lane = Math.floor(y / this.config.LANE_HEIGHT);
        if (lane >= 0 && lane < Object.keys(MIDI_NOTE_MAP).length) {
          // Find the MIDI note for this lane
          const midiNote = Object.entries(MIDI_NOTE_MAP).find(([_, info]) => info.lane === lane)?.[0];
          if (midiNote) {
            this.toggleMute(parseInt(midiNote));
          }
        }
      }
    });
  }

  /**
   * Toggle mute state for an instrument
   * @param {number} midiNote - MIDI note number
   */
  toggleMute(midiNote) {
    if (this.mutedInstruments.has(midiNote)) {
      this.mutedInstruments.delete(midiNote);
    } else {
      this.mutedInstruments.add(midiNote);
    }

    // Notify callback
    if (this.onMuteToggle) {
      this.onMuteToggle(midiNote, this.mutedInstruments.has(midiNote));
    }
  }

  /**
   * Check if an instrument is muted
   * @param {number} midiNote - MIDI note number
   * @returns {boolean} True if muted
   */
  isMuted(midiNote) {
    return this.mutedInstruments.has(midiNote);
  }

  /**
   * Set mute callback
   * @param {Function} callback - Callback(midiNote, isMuted)
   */
  setMuteCallback(callback) {
    this.onMuteToggle = callback;
  }

  /**
   * Set the input mode (keyboard or MIDI)
   * @param {boolean} isKeyboard - True if using keyboard input
   */
  setInputMode(isKeyboard) {
    this.isKeyboardMode = isKeyboard;
  }

  /**
   * Set up canvas dimensions and initial draw
   */
  setupCanvas() {
    this.updateCanvasSize();

    // Set rendering quality
    this.ctx.imageSmoothingEnabled = true;
  }

  /**
   * Update canvas size based on container width
   * Call this on window resize
   */
  updateCanvasSize() {
    // Get available width from container
    const container = this.canvas.parentElement;
    const containerWidth = container ? container.clientWidth : this.baseConfig.CANVAS_WIDTH;

    // Constrain width between min and max
    const newWidth = Math.max(
      this.baseConfig.CANVAS_MIN_WIDTH,
      Math.min(this.baseConfig.CANVAS_MAX_WIDTH, containerWidth - 4) // -4 for border
    );

    // Update canvas dimensions
    this.canvas.width = newWidth;
    this.canvas.height = this.baseConfig.CANVAS_HEIGHT;

    // Update dynamic config
    this.config.CANVAS_WIDTH = newWidth;
    // Center the hit line
    this.config.HIT_LINE_X = Math.floor(newWidth / 2);

    return newWidth;
  }

  /**
   * Main render function called each frame
   * @param {GameState} gameState - Current game state
   */
  render(gameState) {
    // Don't render over completion view
    if (this.showingCompletionView) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawBackground();

    // Draw lane dividers
    this.drawLanes();

    // Draw pattern boundary lines (before notes so notes appear on top)
    this.drawPatternBoundaries(gameState);

    // Draw hit line
    this.drawHitLine();

    // Draw active notes (upcoming, not yet hit)
    gameState.activeNotes.forEach(note => {
      this.drawNote(note, gameState.currentTime);
    });

    // Draw hit notes with accuracy-based positioning (on left side of hit line)
    this.drawHitNotesWithAccuracy(gameState.hitNotes, gameState.currentTime);

    // Draw missed notes (faded, at their actual position on left side)
    this.drawMissedNotes(gameState.missedNotes, gameState.currentTime);

    // Draw recent hit effects
    this.drawHitEffects(gameState.currentTime);
  }

  /**
   * Draw hit notes with X-offset based on timing accuracy
   * Notes that were hit early (rushing) appear further left
   * Notes that were hit late (dragging) appear closer to hit line
   * @param {Array} hitNotes - Array of hit notes with accuracy data
   * @param {number} currentTime - Current game time
   */
  drawHitNotesWithAccuracy(hitNotes, currentTime) {
    const maxVisibleTime = 2000; // Keep hit notes visible for 2 seconds after they pass

    hitNotes.forEach(note => {
      const noteInfo = MIDI_NOTE_MAP[note.midiNote];
      if (!noteInfo) return;

      const timeSinceHit = currentTime - note.time;

      // Only show notes that haven't faded out yet
      if (timeSinceHit > maxVisibleTime) return;

      // Base X position (where the note would be at its scheduled time)
      const baseX = this.calculateXPosition(note.time, currentTime);

      // Don't draw if way off screen to the left
      if (baseX < -100) return;

      // Apply accuracy offset: positive timeDiff (late) = note closer to hit line
      // negative timeDiff (early) = note further from hit line
      const accuracyOffset = note.accuracy ? (note.accuracy.timeDiff || 0) * this.config.SCROLL_SPEED : 0;
      const xPosition = baseX + accuracyOffset;

      // Calculate Y position based on lane
      const yPosition = noteInfo.lane * this.config.LANE_HEIGHT;

      // Check if this instrument is muted
      const isMuted = this.mutedInstruments.has(note.midiNote);

      // Fade out gradually
      const fadeProgress = Math.min(timeSinceHit / maxVisibleTime, 1);
      let alpha = 1 - (fadeProgress * 0.7); // Fade to 30% opacity
      if (isMuted) alpha *= 0.4; // Further reduce alpha for muted

      // Get color based on accuracy (gray if muted)
      const color = isMuted ? '#444' : this.getAccuracyColor(note.accuracy);

      // Draw note with accuracy color
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = color;
      this.ctx.shadowBlur = isMuted ? 0 : 8;
      this.ctx.shadowColor = color;

      const padding = 4;
      this.ctx.fillRect(
        xPosition,
        yPosition + padding,
        this.config.NOTE_WIDTH,
        this.config.LANE_HEIGHT - padding * 2
      );

      // Draw note border
      this.ctx.strokeStyle = isMuted ? 'rgba(100, 100, 100, 0.5)' : 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        xPosition,
        yPosition + padding,
        this.config.NOTE_WIDTH,
        this.config.LANE_HEIGHT - padding * 2
      );

      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1.0;
    });
  }

  /**
   * Draw missed notes (faded red, at their actual position)
   * @param {Array} missedNotes - Array of missed notes
   * @param {number} currentTime - Current game time
   */
  drawMissedNotes(missedNotes, currentTime) {
    const maxVisibleTime = 1500; // Keep missed notes visible for 1.5 seconds

    missedNotes.forEach(note => {
      const noteInfo = MIDI_NOTE_MAP[note.midiNote];
      if (!noteInfo) return;

      // Check if this instrument is muted - skip showing missed indicator for muted notes
      const isMuted = this.mutedInstruments.has(note.midiNote);
      if (isMuted) return; // Don't show missed notes for muted instruments

      const timeSinceMiss = currentTime - note.time;

      // Only show notes that haven't faded out yet
      if (timeSinceMiss > maxVisibleTime) return;

      // Calculate X position at actual note time
      const xPosition = this.calculateXPosition(note.time, currentTime);

      // Don't draw if way off screen to the left
      if (xPosition < -100) return;

      // Calculate Y position based on lane
      const yPosition = noteInfo.lane * this.config.LANE_HEIGHT;

      // Fade out gradually
      const fadeProgress = Math.min(timeSinceMiss / maxVisibleTime, 1);
      const alpha = 0.6 - (fadeProgress * 0.5); // Start at 60%, fade to 10%

      // Draw note with red color for miss
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#FF4444';
      this.ctx.shadowBlur = 5;
      this.ctx.shadowColor = '#FF4444';

      const padding = 4;
      this.ctx.fillRect(
        xPosition,
        yPosition + padding,
        this.config.NOTE_WIDTH,
        this.config.LANE_HEIGHT - padding * 2
      );

      // Draw X mark for missed note
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.lineWidth = 2;
      const centerX = xPosition + this.config.NOTE_WIDTH / 2;
      const centerY = yPosition + this.config.LANE_HEIGHT / 2;
      const markSize = 8;

      this.ctx.beginPath();
      this.ctx.moveTo(centerX - markSize, centerY - markSize);
      this.ctx.lineTo(centerX + markSize, centerY + markSize);
      this.ctx.moveTo(centerX + markSize, centerY - markSize);
      this.ctx.lineTo(centerX - markSize, centerY + markSize);
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1.0;
    });
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
   * Shows keyboard key labels when in keyboard mode
   * Shows mute toggle icons on the left edge
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
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    Object.entries(MIDI_NOTE_MAP).forEach(([midiNote, info]) => {
      const y = info.lane * this.config.LANE_HEIGHT + this.config.LANE_HEIGHT / 2;
      const x = 8;
      const isHovered = this.hoveredLane === info.lane;
      const isMuted = this.mutedInstruments.has(parseInt(midiNote));

      // Draw muted lane background overlay
      if (isMuted) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(0, info.lane * this.config.LANE_HEIGHT, this.canvas.width, this.config.LANE_HEIGHT);
      }

      // Draw mute icon (speaker) on the far left
      this.drawMuteIcon(2, y, isMuted, isHovered);

      // Draw drum name (offset for mute icon)
      const labelX = x + 15;
      this.ctx.fillStyle = isMuted ? '#555' : (isHovered ? '#FFF' : '#888');
      this.ctx.font = isHovered ? 'bold 11px Arial' : '11px Arial';
      this.ctx.fillText(info.name, labelX, y - (this.isKeyboardMode ? 8 : 0));

      // Show keyboard key when in keyboard mode
      if (this.isKeyboardMode) {
        const keyName = MIDI_TO_KEY[midiNote];
        if (keyName) {
          // Draw key in a small box
          this.ctx.fillStyle = isMuted ? '#444' : info.color;
          this.ctx.font = 'bold 12px Arial';
          this.ctx.fillText(keyName, labelX, y + 10);
        }
      }

      // Show MIDI note number tooltip on hover
      if (isHovered && !isMuted) {
        const tooltipText = `MIDI ${midiNote}`;
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(tooltipText, labelX + 48, y);
      }
    });
  }

  /**
   * Draw a mute icon (speaker with/without X)
   * @param {number} x - X position
   * @param {number} y - Y position (center)
   * @param {boolean} isMuted - Whether instrument is muted
   * @param {boolean} isHovered - Whether lane is hovered
   */
  drawMuteIcon(x, y, isMuted, isHovered) {
    const size = 10;
    const ctx = this.ctx;

    // Speaker body
    ctx.fillStyle = isMuted ? '#F44336' : (isHovered ? '#4CAF50' : '#666');
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 3);
    ctx.lineTo(x + 6, y - 3);
    ctx.lineTo(x + 10, y - 6);
    ctx.lineTo(x + 10, y + 6);
    ctx.lineTo(x + 6, y + 3);
    ctx.lineTo(x + 2, y + 3);
    ctx.closePath();
    ctx.fill();

    // X mark when muted
    if (isMuted) {
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 4);
      ctx.lineTo(x + 18, y + 4);
      ctx.moveTo(x + 18, y - 4);
      ctx.lineTo(x + 12, y + 4);
      ctx.stroke();
    }
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
   * Draw pattern boundary lines to show where loops end/begin
   * Double vertical gray lines mark the end of each pattern loop
   * @param {GameState} gameState - Current game state
   */
  drawPatternBoundaries(gameState) {
    const pattern = gameState.pattern;
    if (!pattern || !pattern.singlePatternDuration) return;

    const singleDuration = pattern.singlePatternDuration;
    const loopCount = pattern.loopCount || 1;
    const currentTime = gameState.currentTime;

    // Set line style for boundary markers
    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = 2;

    // Draw boundary at the end of each loop
    for (let loop = 1; loop <= loopCount; loop++) {
      const boundaryTime = loop * singleDuration;
      const xPosition = this.calculateXPosition(boundaryTime, currentTime);

      // Only draw if on screen
      if (xPosition >= -10 && xPosition <= this.canvas.width + 10) {
        // Draw double line (two lines ~4px apart)
        const lineGap = 4;

        // First line
        this.ctx.beginPath();
        this.ctx.moveTo(xPosition - lineGap / 2, 0);
        this.ctx.lineTo(xPosition - lineGap / 2, this.canvas.height);
        this.ctx.stroke();

        // Second line
        this.ctx.beginPath();
        this.ctx.moveTo(xPosition + lineGap / 2, 0);
        this.ctx.lineTo(xPosition + lineGap / 2, this.canvas.height);
        this.ctx.stroke();
      }
    }
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

    // Check if this instrument is muted
    const isMuted = this.mutedInstruments.has(note.midiNote);

    // Draw note rectangle with glow (grayed out if muted)
    const noteColor = isMuted ? '#444' : noteInfo.color;
    this.ctx.fillStyle = noteColor;
    this.ctx.shadowBlur = isMuted ? 0 : 10;
    this.ctx.shadowColor = noteColor;
    this.ctx.globalAlpha = isMuted ? 0.4 : 1.0;

    const padding = 4;
    this.ctx.fillRect(
      xPosition,
      yPosition + padding,
      this.config.NOTE_WIDTH,
      this.config.LANE_HEIGHT - padding * 2
    );

    // Draw note border
    this.ctx.strokeStyle = isMuted ? '#555' : '#FFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      xPosition,
      yPosition + padding,
      this.config.NOTE_WIDTH,
      this.config.LANE_HEIGHT - padding * 2
    );

    // Reset shadow and alpha
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1.0;
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

  /**
   * Render completion view showing all notes with accuracy coloring
   * Uses same spacing as during playback (SCROLL_SPEED), not scaled to fit
   * @param {Array} notes - All notes with accuracy data
   * @param {number} patternDuration - Total duration of the pattern
   */
  renderCompletionView(notes, patternDuration) {
    // Set flag to prevent regular render from overwriting
    this.showingCompletionView = true;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawBackground();

    // Draw lane dividers
    this.drawLanes();

    // Draw hit line (same as during playback)
    this.drawHitLine();

    // Use same positioning as during playback:
    // - Hit line is at center (this.config.HIT_LINE_X)
    // - Notes positioned using SCROLL_SPEED
    // - Show notes as if viewing from end of pattern (all notes to left of hit line)
    const hitLineX = this.config.HIT_LINE_X;
    const scrollSpeed = this.baseConfig.SCROLL_SPEED;

    // Draw each note using playback-consistent positioning
    notes.forEach(note => {
      const noteInfo = MIDI_NOTE_MAP[note.midiNote];
      if (!noteInfo) return;

      // Calculate X position same as during playback
      // At end of pattern, timeUntilHit = note.time - patternDuration (negative, so notes are left of hit line)
      const timeUntilHit = note.time - patternDuration;
      const xPosition = hitLineX + (timeUntilHit * scrollSpeed);

      // Apply accuracy offset if note was hit (same as real-time feedback)
      let finalX = xPosition;
      if (note.accuracy && !note.accuracy.missed) {
        const accuracyOffset = (note.accuracy.timeDiff || 0) * scrollSpeed;
        finalX = xPosition + accuracyOffset;
      }

      // Skip notes that are way off screen
      if (finalX < -this.baseConfig.NOTE_WIDTH || finalX > this.canvas.width + this.baseConfig.NOTE_WIDTH) {
        return;
      }

      // Calculate Y position based on lane
      const yPosition = noteInfo.lane * this.config.LANE_HEIGHT;

      // Check if this instrument is muted
      const isMuted = this.mutedInstruments.has(note.midiNote);

      // Get accuracy-based color (gray if muted)
      const color = isMuted ? '#444' : this.getAccuracyColor(note.accuracy);

      // Use fixed note width matching playback
      const noteWidth = this.baseConfig.NOTE_WIDTH;

      // Draw note rectangle with glow (reduced for muted)
      this.ctx.fillStyle = color;
      this.ctx.shadowBlur = isMuted ? 0 : 8;
      this.ctx.shadowColor = color;
      this.ctx.globalAlpha = isMuted ? 0.4 : 1.0;

      const padding = 4;
      this.ctx.fillRect(
        finalX - noteWidth / 2,
        yPosition + padding,
        noteWidth,
        this.config.LANE_HEIGHT - padding * 2
      );

      // Draw note border
      this.ctx.strokeStyle = isMuted ? 'rgba(100, 100, 100, 0.5)' : 'rgba(255, 255, 255, 0.7)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        finalX - noteWidth / 2,
        yPosition + padding,
        noteWidth,
        this.config.LANE_HEIGHT - padding * 2
      );

      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1.0;
    });
  }

  /**
   * Get color based on accuracy data
   * @param {Object} accuracy - Accuracy object from note
   * @returns {string} Color code
   */
  getAccuracyColor(accuracy) {
    if (!accuracy) return '#888888';

    // Missed or wrong pad = red
    if (accuracy.missed || accuracy.wrongPad) {
      return '#FF4444';
    }

    // Color based on judgment quality
    switch (accuracy.judgment) {
      case 'PERFECT':
        return '#44FF44'; // Bright green
      case 'GOOD':
        return '#88CC88'; // Medium green
      case 'OK':
        return '#CCCC44'; // Yellowish
      case 'EARLY':
      case 'LATE':
        return '#FF9944'; // Orange
      default:
        return '#888888';
    }
  }

  /**
   * Clear completion view flag to allow normal rendering
   */
  clearCompletionView() {
    this.showingCompletionView = false;
  }

  /**
   * Draw accuracy legend at the bottom of the canvas
   */
  drawAccuracyLegend() {
    const legendItems = [
      { label: 'Perfect', color: '#44FF44' },
      { label: 'Good', color: '#88CC88' },
      { label: 'OK', color: '#CCCC44' },
      { label: 'Early/Late', color: '#FF9944' },
      { label: 'Miss', color: '#FF4444' }
    ];

    const y = this.canvas.height - 15;
    const itemWidth = 80;
    const startX = (this.canvas.width - (legendItems.length * itemWidth)) / 2;

    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'left';

    legendItems.forEach((item, index) => {
      const x = startX + index * itemWidth;

      // Draw color swatch
      this.ctx.fillStyle = item.color;
      this.ctx.fillRect(x, y - 8, 12, 12);

      // Draw label
      this.ctx.fillStyle = '#AAA';
      this.ctx.fillText(item.label, x + 16, y + 2);
    });
  }
}
