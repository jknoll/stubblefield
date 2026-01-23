// Pattern Quantizer - snaps notes to grid positions

/**
 * Quantize pattern notes to the best-fit grid
 */
export class Quantizer {
  /**
   * Available grid subdivisions (notes per beat)
   */
  static SUBDIVISIONS = {
    QUARTER: { name: 'Quarter', notesPerBeat: 1 },
    EIGHTH: { name: '8th', notesPerBeat: 2 },
    EIGHTH_TRIPLET: { name: '8th Triplet', notesPerBeat: 3 },
    SIXTEENTH: { name: '16th', notesPerBeat: 4 },
    SIXTEENTH_TRIPLET: { name: '16th Triplet', notesPerBeat: 6 },
    THIRTY_SECOND: { name: '32nd', notesPerBeat: 8 }
  };

  /**
   * Analyze a pattern and determine the best grid subdivision
   * @param {Array} notes - Array of note objects with time property (in ms)
   * @param {number} bpm - Beats per minute
   * @returns {Object} Analysis result with subdivision and confidence
   */
  static analyzePattern(notes, bpm) {
    if (!notes || notes.length === 0) {
      return { subdivision: this.SUBDIVISIONS.SIXTEENTH, confidence: 0 };
    }

    const beatDuration = (60 / bpm) * 1000; // ms per beat
    const results = [];

    // Test each subdivision
    for (const [key, sub] of Object.entries(this.SUBDIVISIONS)) {
      const gridInterval = beatDuration / sub.notesPerBeat;
      let totalDeviation = 0;
      let maxDeviation = 0;

      notes.forEach(note => {
        const nearestGrid = Math.round(note.time / gridInterval) * gridInterval;
        const deviation = Math.abs(note.time - nearestGrid);
        totalDeviation += deviation;
        maxDeviation = Math.max(maxDeviation, deviation);
      });

      const avgDeviation = totalDeviation / notes.length;
      // Score: lower deviation is better, penalize overly fine grids
      const complexityPenalty = sub.notesPerBeat * 0.5; // Small penalty for finer grids
      const score = avgDeviation + complexityPenalty;

      results.push({
        subdivision: sub,
        key,
        avgDeviation,
        maxDeviation,
        score
      });
    }

    // Sort by score (lower is better)
    results.sort((a, b) => a.score - b.score);

    const best = results[0];
    // Confidence based on how well the grid fits (inverse of deviation)
    const confidence = Math.max(0, 100 - (best.avgDeviation / 10));

    return {
      subdivision: best.subdivision,
      key: best.key,
      avgDeviation: best.avgDeviation,
      maxDeviation: best.maxDeviation,
      confidence: Math.round(confidence),
      allResults: results
    };
  }

  /**
   * Quantize notes to a specific grid
   * @param {Array} notes - Array of note objects with time property
   * @param {number} bpm - Beats per minute
   * @param {Object} subdivision - Subdivision from SUBDIVISIONS
   * @returns {Array} New array with quantized notes
   */
  static quantizeNotes(notes, bpm, subdivision = null) {
    if (!notes || notes.length === 0) {
      return [];
    }

    // Auto-detect best subdivision if not specified
    if (!subdivision) {
      const analysis = this.analyzePattern(notes, bpm);
      subdivision = analysis.subdivision;
    }

    const beatDuration = (60 / bpm) * 1000;
    const gridInterval = beatDuration / subdivision.notesPerBeat;

    return notes.map(note => ({
      ...note,
      originalTime: note.time,
      time: Math.round(note.time / gridInterval) * gridInterval
    }));
  }

  /**
   * Get human-readable description of quantization changes
   * @param {Array} originalNotes - Original notes
   * @param {Array} quantizedNotes - Quantized notes
   * @returns {Object} Summary of changes
   */
  static getQuantizationSummary(originalNotes, quantizedNotes) {
    if (!originalNotes || !quantizedNotes) {
      return { totalShift: 0, avgShift: 0, maxShift: 0, notesChanged: 0 };
    }

    let totalShift = 0;
    let maxShift = 0;
    let notesChanged = 0;

    quantizedNotes.forEach((note, i) => {
      const original = originalNotes[i];
      if (original) {
        const shift = Math.abs(note.time - original.time);
        if (shift > 0.1) { // More than 0.1ms difference
          totalShift += shift;
          maxShift = Math.max(maxShift, shift);
          notesChanged++;
        }
      }
    });

    return {
      totalShift: Math.round(totalShift),
      avgShift: notesChanged > 0 ? Math.round(totalShift / notesChanged) : 0,
      maxShift: Math.round(maxShift),
      notesChanged,
      totalNotes: originalNotes.length
    };
  }
}
