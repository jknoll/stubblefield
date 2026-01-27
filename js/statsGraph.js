// Statistics Graph Renderer - draws accuracy line graphs on canvas

export class StatsGraph {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Handle high-DPI displays for crisp rendering
    this.setupHighDPI();

    // Theme color palettes - matching design system
    this.themeColors = {
      dark: {
        background: '#1e1e28',
        grid: '#2e2e38',
        currentLine: '#00d4aa',
        currentFill: 'rgba(0, 212, 170, 0.2)',
        historicalLine: '#00aaff',
        historicalFill: 'rgba(0, 170, 255, 0.15)',
        axis: '#606068',
        text: '#9898a0',
        highlight: '#ff3399'
      },
      light: {
        background: '#f0f0f5',
        grid: '#d8d8e0',
        currentLine: '#00a080',
        currentFill: 'rgba(0, 160, 128, 0.2)',
        historicalLine: '#0088cc',
        historicalFill: 'rgba(0, 136, 204, 0.15)',
        axis: '#888890',
        text: '#555560',
        highlight: '#cc2277'
      }
    };

    // Current colors (start with dark theme)
    this.colors = { ...this.themeColors.dark };

    // Padding
    this.padding = {
      left: 50,
      right: 20,
      top: 20,
      bottom: 30
    };
  }

  /**
   * Setup high-DPI canvas for crisp rendering on Retina displays
   */
  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    // Store logical dimensions
    this.logicalWidth = rect.width || this.canvas.width;
    this.logicalHeight = rect.height || this.canvas.height;

    // Set canvas buffer size to match device pixels
    this.canvas.width = this.logicalWidth * dpr;
    this.canvas.height = this.logicalHeight * dpr;

    // Set display size via CSS
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.height = `${this.logicalHeight}px`;

    // Scale context to match device pixel ratio
    this.ctx.scale(dpr, dpr);

    // Store dpr for later use
    this.dpr = dpr;
  }

  /**
   * Update theme colors
   * @param {string} theme - 'light' or 'dark'
   */
  updateTheme(theme) {
    const palette = this.themeColors[theme] || this.themeColors.dark;
    this.colors = { ...palette };
  }

  /**
   * Render the statistics graph
   * @param {Object} graphData - Data from StatsManager.getGraphData()
   * @param {Object} options - Rendering options
   */
  render(graphData, options = {}) {
    // Use logical dimensions for drawing (high-DPI aware)
    const width = this.logicalWidth || this.canvas.width;
    const height = this.logicalHeight || this.canvas.height;
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = this.colors.background;
    ctx.fillRect(0, 0, width, height);

    const graphWidth = width - this.padding.left - this.padding.right;
    const graphHeight = height - this.padding.top - this.padding.bottom;

    // Draw grid
    this.drawGrid(graphWidth, graphHeight);

    // Draw Y axis (0-100%)
    this.drawYAxis(graphHeight);

    // Determine what to show
    const hasCurrentSession = graphData.currentSession && graphData.currentSession.length > 0;
    const hasHistorical = graphData.historicalSessions && graphData.historicalSessions.length > 0;

    if (!hasCurrentSession && !hasHistorical) {
      // No data - show placeholder
      this.drawNoDataMessage();
      return;
    }

    // Draw historical sessions first (behind current)
    if (hasHistorical && options.showHistorical !== false) {
      this.drawHistoricalLine(graphData.historicalSessions, graphWidth, graphHeight);
    }

    // Draw current session line (on top)
    if (hasCurrentSession) {
      this.drawCurrentSessionLine(graphData.currentSession, graphWidth, graphHeight);
    }

    // Draw legend with BPM indicator
    this.drawLegend(hasCurrentSession, hasHistorical, graphData.bpm);
  }

  /**
   * Draw grid lines
   */
  drawGrid(graphWidth, graphHeight) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;

    // Horizontal grid lines (every 20%)
    for (let i = 0; i <= 5; i++) {
      const y = this.padding.top + (graphHeight * (5 - i) / 5);
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(this.padding.left + graphWidth, y);
      ctx.stroke();
    }
  }

  /**
   * Draw Y axis labels
   */
  drawYAxis(graphHeight) {
    const ctx = this.ctx;
    ctx.fillStyle = this.colors.text;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Y axis labels (0%, 20%, 40%, 60%, 80%, 100%)
    for (let i = 0; i <= 5; i++) {
      const y = this.padding.top + (graphHeight * (5 - i) / 5);
      const label = `${i * 20}%`;
      ctx.fillText(label, this.padding.left - 8, y);
    }
  }

  /**
   * Draw line for current session (real-time)
   */
  drawCurrentSessionLine(data, graphWidth, graphHeight) {
    if (data.length === 0) return;

    const ctx = this.ctx;
    const maxX = Math.max(data.length, 4); // Minimum 4 points on x-axis

    // Calculate points
    const points = data.map((d, i) => ({
      x: this.padding.left + (d.x / maxX) * graphWidth,
      y: this.padding.top + graphHeight - (d.y / 100) * graphHeight,
      accuracy: d.y
    }));

    // Draw filled area
    ctx.fillStyle = this.colors.currentFill;
    ctx.beginPath();
    ctx.moveTo(points[0].x, this.padding.top + graphHeight);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, this.padding.top + graphHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = this.colors.currentLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Draw points
    points.forEach((p, i) => {
      const isLastPoint = i === points.length - 1;
      const pointRadius = isLastPoint ? 6 : 4;

      // Draw larger highlight ring around last point
      if (isLastPoint) {
        ctx.strokeStyle = this.colors.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = isLastPoint ? this.colors.highlight : this.colors.currentLine;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw accuracy label on last point
      if (isLastPoint) {
        ctx.fillStyle = this.colors.highlight;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${p.accuracy.toFixed(1)}%`, p.x + 14, p.y - 4);
      }
    });

    // Draw X axis labels (loop numbers)
    ctx.fillStyle = this.colors.text;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const labelInterval = Math.max(1, Math.floor(data.length / 8));
    data.forEach((d, i) => {
      if (i % labelInterval === 0 || i === data.length - 1) {
        const x = this.padding.left + (d.x / maxX) * graphWidth;
        ctx.fillText(d.x.toString(), x, this.canvas.height - 8);
      }
    });
  }

  /**
   * Draw historical sessions line
   */
  drawHistoricalLine(data, graphWidth, graphHeight) {
    if (data.length === 0) return;

    const ctx = this.ctx;
    const maxX = data.length;

    // Calculate points
    const points = data.map((d, i) => ({
      x: this.padding.left + ((i + 0.5) / maxX) * graphWidth,
      y: this.padding.top + graphHeight - (d.y / 100) * graphHeight,
      accuracy: d.y,
      date: d.date
    }));

    // Draw filled area
    ctx.fillStyle = this.colors.historicalFill;
    ctx.beginPath();
    ctx.moveTo(points[0].x, this.padding.top + graphHeight);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, this.padding.top + graphHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = this.colors.historicalLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points
    points.forEach(p => {
      ctx.fillStyle = this.colors.historicalLine;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Draw legend
   */
  drawLegend(hasCurrentSession, hasHistorical, bpm = null) {
    const ctx = this.ctx;
    let x = this.canvas.width - this.padding.right - 10;
    const y = this.padding.top + 10;

    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    // Show BPM indicator if provided
    if (bpm) {
      ctx.fillStyle = this.colors.highlight;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${bpm} BPM`, x, y);
    }

    const bpmOffset = bpm ? 16 : 0;

    if (hasCurrentSession) {
      // Current session indicator
      ctx.fillStyle = this.colors.currentLine;
      ctx.fillRect(x - 30, y + bpmOffset - 5, 20, 3);
      ctx.fillStyle = this.colors.text;
      ctx.font = '10px sans-serif';
      ctx.fillText('Current', x - 35, y + bpmOffset);
    }

    if (hasHistorical) {
      // Historical indicator
      const yOffset = (hasCurrentSession ? 18 : 0) + bpmOffset;
      ctx.strokeStyle = this.colors.historicalLine;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x - 30, y + yOffset - 2);
      ctx.lineTo(x - 10, y + yOffset - 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = this.colors.text;
      ctx.fillText('History', x - 35, y + yOffset);
    }
  }

  /**
   * Draw message when no data available
   */
  drawNoDataMessage() {
    const ctx = this.ctx;
    ctx.fillStyle = this.colors.text;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No practice data yet', this.canvas.width / 2, this.canvas.height / 2);
    ctx.font = '11px sans-serif';
    ctx.fillText('Complete a session to see your progress', this.canvas.width / 2, this.canvas.height / 2 + 20);
  }

  /**
   * Clear the graph
   */
  clear() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
