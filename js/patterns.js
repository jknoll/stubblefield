// Practice patterns for the drum game

import { MidiParser } from './midiParser.js';

// MIDI Library - stores all loaded patterns
const midiPatterns = new Map();
let libraryInitialized = false;

/**
 * Load the MIDI pattern manifest and all patterns
 */
export async function initializeMidiLibrary() {
  if (libraryInitialized) {
    return midiPatterns;
  }

  try {
    // Load manifest
    const manifestResponse = await fetch('./midi/manifest.json');
    if (!manifestResponse.ok) {
      throw new Error(`Failed to load manifest: ${manifestResponse.status}`);
    }
    const manifest = await manifestResponse.json();

    // Load each pattern
    const parser = new MidiParser();
    for (const patternDef of manifest.patterns) {
      try {
        const filePath = `./midi/${encodeURIComponent(patternDef.file)}`;
        const response = await fetch(filePath);
        if (!response.ok) {
          console.warn(`Failed to load ${patternDef.file}: ${response.status}`);
          continue;
        }

        const buffer = await response.arrayBuffer();
        const parsed = await parser.parse(buffer);

        // Generate pattern ID
        const patternId = patternDef.file
          .replace('.mid', '')
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');

        // Calculate raw duration and bar info
        const rawDuration = parsed.notes.length > 0
          ? Math.max(...parsed.notes.map(n => n.time))
          : 0;
        const beatDuration = (60 / (patternDef.defaultBPM || parsed.bpm)) * 1000;
        const barDuration = beatDuration * 4;
        const estimatedBars = Math.max(1, Math.round(rawDuration / barDuration));

        const pattern = {
          id: patternId,
          name: patternDef.name,
          filename: patternDef.file,
          category: patternDef.category,
          bpm: patternDef.defaultBPM || parsed.bpm,
          defaultBPM: patternDef.defaultBPM || parsed.bpm,
          isLoopBased: patternDef.isLoopBased || false,
          isFill: patternDef.isFill || false,
          isVariation: patternDef.isVariation || false,
          featured: patternDef.featured || false,
          notes: parsed.notes,
          rawDuration: rawDuration,
          estimatedBars: estimatedBars
        };

        midiPatterns.set(patternId, pattern);
        console.log(`Loaded: ${pattern.name} (${pattern.notes.length} notes at ${pattern.bpm} BPM)`);
      } catch (error) {
        console.error(`Failed to load pattern ${patternDef.file}:`, error);
      }
    }

    libraryInitialized = true;
    console.log(`MIDI Library initialized with ${midiPatterns.size} patterns`);

    return midiPatterns;
  } catch (error) {
    console.error('Failed to initialize MIDI library:', error);
    return midiPatterns;
  }
}

/**
 * Get all available patterns for UI dropdown
 */
export function getAvailablePatterns() {
  const patterns = [];

  for (const [id, pattern] of midiPatterns) {
    patterns.push({
      id: id,
      name: pattern.name,
      category: pattern.category,
      defaultBPM: pattern.defaultBPM,
      isLoopBased: pattern.isLoopBased,
      isFill: pattern.isFill,
      isVariation: pattern.isVariation,
      featured: pattern.featured
    });
  }

  // Sort: featured first, then by category, then by name
  patterns.sort((a, b) => {
    if (a.featured !== b.featured) return b.featured - a.featured;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return patterns;
}

/**
 * Get pattern categories
 */
export function getPatternCategories() {
  const categories = new Set();
  for (const pattern of midiPatterns.values()) {
    categories.add(pattern.category);
  }
  return Array.from(categories).sort();
}

/**
 * Create a pattern object with the given type and BPM
 * @param {string} patternType - Pattern ID
 * @param {number} bpm - Beats per minute
 * @param {number} loops - Number of loops
 * @returns {Object} Complete pattern object
 */
export function createPattern(patternType, bpm, loops = 4) {
  const pattern = midiPatterns.get(patternType);

  if (!pattern) {
    console.error(`Pattern not found: ${patternType}`);
    // Return a simple default pattern
    return createDefaultPattern(bpm, loops);
  }

  const targetBpm = bpm || pattern.defaultBPM;
  const timeScale = pattern.defaultBPM / targetBpm;

  const beatDuration = (60 / targetBpm) * 1000;
  const barDuration = beatDuration * 4;
  const scaledBarDuration = barDuration;

  // For fills, don't loop by default
  const actualLoops = pattern.isFill ? 1 : loops;

  // Generate notes with looping
  const notes = [];
  for (let loop = 0; loop < actualLoops; loop++) {
    const loopOffset = loop * scaledBarDuration * pattern.estimatedBars;

    pattern.notes.forEach((note, i) => {
      notes.push({
        time: (note.time * timeScale) + loopOffset,
        midiNote: note.midiNote,
        velocity: note.velocity,
        id: `${patternType}_${loop}_${i}_${note.midiNote}`,
        hit: false,
        judged: false,
        sounded: false
      });
    });
  }

  // Sort by time
  notes.sort((a, b) => a.time - b.time);

  const duration = scaledBarDuration * pattern.estimatedBars * actualLoops;

  return {
    name: pattern.name,
    type: patternType,
    bpm: targetBpm,
    defaultBPM: pattern.defaultBPM,
    timeSignature: [4, 4],
    duration: duration,
    singlePatternDuration: scaledBarDuration * pattern.estimatedBars,
    loopCount: actualLoops,
    notes: notes,
    category: pattern.category,
    isFill: pattern.isFill
  };
}

/**
 * Create a simple default pattern (fallback)
 */
function createDefaultPattern(bpm = 120, bars = 4) {
  const notes = [];
  const beatDuration = (60 / bpm) * 1000;
  const barDuration = beatDuration * 4;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDuration;

    // Simple kick on 1 and 3, snare on 2 and 4
    notes.push(
      { time: barStart, midiNote: 36, velocity: 100 },
      { time: barStart + beatDuration, midiNote: 38, velocity: 100 },
      { time: barStart + beatDuration * 2, midiNote: 36, velocity: 100 },
      { time: barStart + beatDuration * 3, midiNote: 38, velocity: 100 }
    );
  }

  return {
    name: "Default Beat",
    type: "default",
    bpm: bpm,
    defaultBPM: bpm,
    timeSignature: [4, 4],
    duration: barDuration * bars,
    singlePatternDuration: barDuration * bars,
    loopCount: 1,
    notes: notes.map((note, i) => ({
      ...note,
      id: `default_${i}_${note.time}_${note.midiNote}`,
      hit: false,
      judged: false,
      sounded: false
    }))
  };
}

/**
 * Get pattern info for PATTERNS object compatibility
 */
export function getPatternInfo(patternId) {
  const pattern = midiPatterns.get(patternId);
  if (!pattern) return null;

  return {
    name: pattern.name,
    defaultBPM: pattern.defaultBPM,
    bars: pattern.estimatedBars,
    isLoopBased: pattern.isLoopBased
  };
}

// Legacy PATTERNS object - now dynamically generated
export function getPATTERNS() {
  const patterns = {};
  for (const [id, pattern] of midiPatterns) {
    patterns[id] = {
      name: pattern.name,
      defaultBPM: pattern.defaultBPM,
      bars: pattern.estimatedBars,
      isLoopBased: pattern.isLoopBased
    };
  }
  return patterns;
}

// Export for backwards compatibility
export const PATTERNS = new Proxy({}, {
  get(target, prop) {
    const pattern = midiPatterns.get(prop);
    if (pattern) {
      return {
        name: pattern.name,
        defaultBPM: pattern.defaultBPM,
        bars: pattern.estimatedBars,
        isLoopBased: pattern.isLoopBased
      };
    }
    return undefined;
  },
  ownKeys() {
    return Array.from(midiPatterns.keys());
  },
  getOwnPropertyDescriptor(target, prop) {
    if (midiPatterns.has(prop)) {
      return { enumerable: true, configurable: true };
    }
    return undefined;
  }
});
