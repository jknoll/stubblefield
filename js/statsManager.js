// Statistics Manager - tracks accuracy and score over time per pattern

export class StatsManager {
  constructor() {
    this.storageKey = 'groovelab_stats';
    this.currentSession = null;
    this.stats = this.loadStats();

    // Callback for UI updates
    this.onStatsUpdate = null;
  }

  /**
   * Load stats from localStorage
   */
  loadStats() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
    return { patterns: {} };
  }

  /**
   * Save stats to localStorage
   */
  saveStats() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    } catch (e) {
      console.error('Failed to save stats:', e);
    }
  }

  /**
   * Start a new practice session
   * @param {string} patternId - The pattern being practiced
   * @param {number} bpm - BPM setting
   */
  startSession(patternId, bpm) {
    this.currentSession = {
      patternId,
      bpm,
      startTime: Date.now(),
      loopResults: []  // Array of results per loop iteration
    };

    // Initialize pattern stats if needed
    if (!this.stats.patterns[patternId]) {
      this.stats.patterns[patternId] = {
        sessions: []
      };
    }

    console.log(`Stats: Started session for ${patternId} at ${bpm} BPM`);
  }

  /**
   * Record results for a single loop iteration
   * @param {Object} loopData - Data for this loop iteration
   */
  recordLoopIteration(loopData) {
    if (!this.currentSession) return;

    const iterationResult = {
      loopNumber: this.currentSession.loopResults.length + 1,
      timestamp: Date.now(),
      accuracy: loopData.accuracy,
      score: loopData.score,
      perfect: loopData.perfect || 0,
      good: loopData.good || 0,
      ok: loopData.ok || 0,
      miss: loopData.miss || 0,
      combo: loopData.maxCombo || 0
    };

    this.currentSession.loopResults.push(iterationResult);

    console.log(`Stats: Recorded loop ${iterationResult.loopNumber} - Accuracy: ${iterationResult.accuracy}%`);

    // Notify UI of update
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getCurrentSessionStats());
    }
  }

  /**
   * End the current session and save to storage
   */
  endSession() {
    if (!this.currentSession || this.currentSession.loopResults.length === 0) {
      this.currentSession = null;
      return;
    }

    // Calculate session summary
    const loopResults = this.currentSession.loopResults;
    const avgAccuracy = loopResults.reduce((sum, r) => sum + r.accuracy, 0) / loopResults.length;
    const totalScore = loopResults.reduce((sum, r) => sum + r.score, 0);
    const maxCombo = Math.max(...loopResults.map(r => r.combo));

    const sessionSummary = {
      date: this.currentSession.startTime,
      bpm: this.currentSession.bpm,
      totalLoops: loopResults.length,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      totalScore,
      maxCombo,
      loopResults: loopResults
    };

    // Add to pattern's sessions
    this.stats.patterns[this.currentSession.patternId].sessions.push(sessionSummary);

    // Keep only last 50 sessions per pattern to avoid localStorage bloat
    const patternStats = this.stats.patterns[this.currentSession.patternId];
    if (patternStats.sessions.length > 50) {
      patternStats.sessions = patternStats.sessions.slice(-50);
    }

    this.saveStats();

    console.log(`Stats: Session ended - ${loopResults.length} loops, avg accuracy: ${avgAccuracy.toFixed(1)}%`);

    this.currentSession = null;
  }

  /**
   * Get stats for current session (for real-time graph updates)
   */
  getCurrentSessionStats() {
    if (!this.currentSession) return null;

    return {
      patternId: this.currentSession.patternId,
      bpm: this.currentSession.bpm,
      loopResults: this.currentSession.loopResults,
      isActive: true
    };
  }

  /**
   * Get all stats for a specific pattern (for historical graph)
   * @param {string} patternId - Pattern ID
   */
  getPatternStats(patternId) {
    const patternStats = this.stats.patterns[patternId];
    if (!patternStats) return null;

    return {
      patternId,
      sessions: patternStats.sessions,
      // Calculate trends
      recentTrend: this.calculateTrend(patternStats.sessions.slice(-10))
    };
  }

  /**
   * Calculate accuracy trend from recent sessions
   */
  calculateTrend(sessions) {
    if (sessions.length < 2) return 0;

    const recentAvg = sessions.slice(-3).reduce((sum, s) => sum + s.avgAccuracy, 0) / Math.min(3, sessions.length);
    const olderAvg = sessions.slice(0, -3).reduce((sum, s) => sum + s.avgAccuracy, 0) / Math.max(1, sessions.length - 3);

    return Math.round((recentAvg - olderAvg) * 10) / 10;
  }

  /**
   * Get data formatted for line graph rendering
   * @param {string} patternId - Pattern ID
   * @param {number} maxDataPoints - Maximum number of points to return
   */
  getGraphData(patternId, maxDataPoints = 50) {
    const currentStats = this.getCurrentSessionStats();
    const historicalStats = this.getPatternStats(patternId);

    const graphData = {
      currentSession: [],
      historicalSessions: []
    };

    // Current session data (real-time)
    if (currentStats && currentStats.patternId === patternId) {
      graphData.currentSession = currentStats.loopResults.map((r, i) => ({
        x: i + 1,
        y: r.accuracy,
        label: `Loop ${r.loopNumber}`,
        score: r.score
      }));
    }

    // Historical data - aggregate by session
    if (historicalStats && historicalStats.sessions.length > 0) {
      // Show last N sessions
      const recentSessions = historicalStats.sessions.slice(-maxDataPoints);

      graphData.historicalSessions = recentSessions.map((session, i) => ({
        x: i + 1,
        y: session.avgAccuracy,
        date: new Date(session.date).toLocaleDateString(),
        loops: session.totalLoops,
        bpm: session.bpm
      }));
    }

    return graphData;
  }

  /**
   * Clear all stats (for testing/reset)
   */
  clearAllStats() {
    this.stats = { patterns: {} };
    this.saveStats();
    console.log('Stats: All statistics cleared');
  }

  /**
   * Clear stats for a specific pattern
   */
  clearPatternStats(patternId) {
    if (this.stats.patterns[patternId]) {
      delete this.stats.patterns[patternId];
      this.saveStats();
      console.log(`Stats: Cleared statistics for ${patternId}`);
    }
  }
}
