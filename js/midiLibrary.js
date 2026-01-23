// MIDI Library - Dynamic loader for MIDI drum patterns

import { MidiParser } from './midiParser.js';

/**
 * MIDI Library class for managing and loading MIDI drum patterns
 */
export class MidiLibrary {
  constructor() {
    this.patterns = new Map();
    this.parser = new MidiParser();
    this.initialized = false;
  }

  /**
   * Initialize the library by scanning the midi directory
   * @param {Array<string>} midiFiles - List of MIDI file paths to load
   */
  async initialize(midiFiles) {
    console.log('Initializing MIDI Library...');

    for (const filePath of midiFiles) {
      try {
        await this.loadPattern(filePath);
      } catch (error) {
        console.error(`Failed to load ${filePath}:`, error);
      }
    }

    this.initialized = true;
    console.log(`MIDI Library initialized with ${this.patterns.size} patterns`);
    return this.patterns;
  }

  /**
   * Load a single MIDI pattern file
   * @param {string} filePath - Path to the MIDI file
   */
  async loadPattern(filePath) {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const parsed = await this.parser.parse(buffer);

    // Extract pattern info from filename
    const filename = filePath.split('/').pop().replace('.mid', '');
    const patternInfo = this.parseFilename(filename);

    // Store pattern with metadata
    const patternId = this.generatePatternId(filename);
    const pattern = {
      id: patternId,
      name: patternInfo.name,
      filename: filename,
      filePath: filePath,
      bpm: patternInfo.bpm || parsed.bpm,
      defaultBPM: patternInfo.bpm || parsed.bpm,
      category: patternInfo.category,
      isFill: patternInfo.isFill,
      isVariation: patternInfo.isVariation,
      variationLetter: patternInfo.variationLetter,
      notes: parsed.notes,
      ticksPerQuarter: parsed.ticksPerQuarter,
      rawDuration: this.calculateDuration(parsed.notes)
    };

    this.patterns.set(patternId, pattern);
    console.log(`Loaded pattern: ${pattern.name} (${pattern.notes.length} notes at ${pattern.bpm} BPM)`);

    return pattern;
  }

  /**
   * Parse pattern information from filename
   * Expected format: "[BPM] [Pattern Name].mid"
   * @param {string} filename - MIDI filename without extension
   */
  parseFilename(filename) {
    // Try to extract BPM from start of filename (e.g., "076 Chilled Beat 1")
    const bpmMatch = filename.match(/^(\d{2,3})\s+(.+)$/);

    let bpm = null;
    let name = filename;

    if (bpmMatch) {
      bpm = parseInt(bpmMatch[1], 10);
      name = bpmMatch[2];
    }

    // Detect if it's a fill
    const isFill = /fill\s*\d*/i.test(name);

    // Detect if it's a variation (ends with letter like 1A, 1B, 1C)
    const variationMatch = name.match(/(\d+)([A-Z])$/i);
    const isVariation = variationMatch !== null;
    const variationLetter = isVariation ? variationMatch[2].toUpperCase() : null;

    // Extract category from name (e.g., "Chilled Beat" from "Chilled Beat 1")
    const categoryMatch = name.match(/^(.+?)\s+\d/);
    const category = categoryMatch ? categoryMatch[1] : 'Unknown';

    return {
      bpm,
      name,
      category,
      isFill,
      isVariation,
      variationLetter
    };
  }

  /**
   * Generate a unique pattern ID from filename
   */
  generatePatternId(filename) {
    return filename
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Calculate pattern duration from notes
   */
  calculateDuration(notes) {
    if (!notes || notes.length === 0) return 0;
    return Math.max(...notes.map(n => n.time));
  }

  /**
   * Get all loaded patterns
   */
  getPatterns() {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category) {
    return this.getPatterns().filter(p => p.category === category);
  }

  /**
   * Get only main beats (no fills or variations)
   */
  getMainBeats() {
    return this.getPatterns().filter(p => !p.isFill && !p.isVariation);
  }

  /**
   * Get fills for a specific beat pattern
   */
  getFillsForBeat(beatName) {
    return this.getPatterns().filter(p =>
      p.isFill && p.name.includes(beatName.replace(/ Fill.*$/, ''))
    );
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId) {
    return this.patterns.get(patternId);
  }

  /**
   * Get pattern notes prepared for game use
   * @param {string} patternId - Pattern ID
   * @param {number} bpm - Target BPM (scales timing if different from default)
   * @param {number} loops - Number of times to loop the pattern
   */
  getPatternNotes(patternId, bpm, loops = 1) {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`Pattern not found: ${patternId}`);
      return [];
    }

    const notes = [];
    const timeScale = pattern.defaultBPM / bpm;
    const scaledDuration = pattern.rawDuration * timeScale;

    // Calculate bar duration for looping
    const beatDuration = (60 / bpm) * 1000;
    const barDuration = beatDuration * 4;

    // Estimate bars in pattern (round to nearest bar)
    const estimatedBars = Math.max(1, Math.round(scaledDuration / barDuration));
    const loopDuration = estimatedBars * barDuration;

    for (let loop = 0; loop < loops; loop++) {
      const loopOffset = loop * loopDuration;

      pattern.notes.forEach((note, i) => {
        notes.push({
          time: (note.time * timeScale) + loopOffset,
          midiNote: note.midiNote,
          velocity: note.velocity,
          id: `${patternId}_${loop}_${i}_${note.midiNote}`,
          hit: false,
          judged: false,
          sounded: false
        });
      });
    }

    // Sort by time
    notes.sort((a, b) => a.time - b.time);

    return notes;
  }

  /**
   * Create a full pattern object for the game
   */
  createGamePattern(patternId, bpm, loops = 4) {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.error(`Pattern not found: ${patternId}`);
      return null;
    }

    const targetBpm = bpm || pattern.defaultBPM;
    const notes = this.getPatternNotes(patternId, targetBpm, loops);

    const beatDuration = (60 / targetBpm) * 1000;
    const barDuration = beatDuration * 4;
    const estimatedBars = Math.max(1, Math.round((pattern.rawDuration * (pattern.defaultBPM / targetBpm)) / barDuration));
    const duration = barDuration * estimatedBars * loops;

    return {
      name: pattern.name,
      type: patternId,
      bpm: targetBpm,
      defaultBPM: pattern.defaultBPM,
      timeSignature: [4, 4],
      duration: duration,
      singlePatternDuration: barDuration * estimatedBars,
      loopCount: loops,
      notes: notes,
      category: pattern.category,
      isFill: pattern.isFill
    };
  }

  /**
   * Get categories of all loaded patterns
   */
  getCategories() {
    const categories = new Set();
    this.getPatterns().forEach(p => categories.add(p.category));
    return Array.from(categories).sort();
  }
}

// Singleton instance
export const midiLibrary = new MidiLibrary();
