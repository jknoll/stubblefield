// Practice patterns for the drum game

import { MidiParser } from './midiParser.js';

// Cached Funky Drummer pattern loaded from MIDI file
let cachedFunkyDrummerNotes = null;
let cachedFunkyDrummerBPM = 101;
let cachedFunkyDrummerBarDuration = 0;

/**
 * Load and cache the Funky Drummer pattern from MIDI file
 * Call this once during initialization
 */
export async function loadFunkyDrummerPattern() {
  if (cachedFunkyDrummerNotes) {
    return cachedFunkyDrummerNotes;
  }

  try {
    const response = await fetch('./Funky%20Drummer%20Break%20Intro.mid');
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const parser = new MidiParser();
    const parsed = await parser.parse(buffer);

    cachedFunkyDrummerBPM = parsed.bpm;

    // Calculate bar duration at original BPM
    const beatDuration = (60 / cachedFunkyDrummerBPM) * 1000;
    cachedFunkyDrummerBarDuration = beatDuration * 4;

    // Store the raw notes (without game state) for looping
    cachedFunkyDrummerNotes = parsed.notes.map((note) => ({
      time: note.time,
      midiNote: note.midiNote,
      velocity: note.velocity
    }));

    console.log(`Loaded Funky Drummer pattern: ${cachedFunkyDrummerNotes.length} notes at ${cachedFunkyDrummerBPM} BPM`);
    return cachedFunkyDrummerNotes;
  } catch (error) {
    console.error('Failed to load Funky Drummer pattern:', error);
    return [];
  }
}

/**
 * Get the Funky Drummer BPM (for UI display)
 */
export function getFunkyDrummerBPM() {
  return cachedFunkyDrummerBPM;
}

/**
 * Generate Funky Drummer pattern from cached MIDI data
 * Loops the 1-bar pattern for the specified number of loops
 * Preserves original velocity data for authentic feel
 */
function generateFunkyDrummer(bpm = 101, loops = 4) {
  if (!cachedFunkyDrummerNotes || cachedFunkyDrummerNotes.length === 0) {
    console.warn('Funky Drummer not loaded, falling back to Funky Groove');
    return generateFunkyGroove(bpm, loops);
  }

  const notes = [];

  // Scale timing if BPM is different from original
  const timeScale = cachedFunkyDrummerBPM / bpm;
  const scaledBarDuration = cachedFunkyDrummerBarDuration * timeScale;

  // Loop the pattern
  for (let loop = 0; loop < loops; loop++) {
    const loopOffset = loop * scaledBarDuration;

    cachedFunkyDrummerNotes.forEach((note, i) => {
      notes.push({
        time: (note.time * timeScale) + loopOffset,
        midiNote: note.midiNote,
        velocity: note.velocity,
        id: `funky_${loop}_${i}_${note.midiNote}`,
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
 * Generate a basic rock beat pattern
 * Pattern: Kick on 1&3, Snare on 2&4, Hi-hat on eighth notes
 * @param {number} bpm - Beats per minute
 * @param {number} bars - Number of bars to generate
 * @returns {Object} Pattern object with notes array
 */
function generateRockBeat(bpm = 120, bars = 8) {
  const notes = [];
  const beatDuration = (60 / bpm) * 1000; // ms per beat
  const barDuration = beatDuration * 4;   // 4/4 time

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDuration;

    // Beat 1: Kick + HH
    notes.push(
      { time: barStart + 0, midiNote: 36, velocity: 100 },     // Kick
      { time: barStart + 0, midiNote: 42, velocity: 80 }       // HH closed
    );

    // Beat 1.5: HH
    notes.push(
      { time: barStart + beatDuration * 0.5, midiNote: 42, velocity: 70 }
    );

    // Beat 2: Snare + HH
    notes.push(
      { time: barStart + beatDuration, midiNote: 38, velocity: 100 },   // Snare
      { time: barStart + beatDuration, midiNote: 42, velocity: 80 }
    );

    // Beat 2.5: HH
    notes.push(
      { time: barStart + beatDuration * 1.5, midiNote: 42, velocity: 70 }
    );

    // Beat 3: Kick + HH
    notes.push(
      { time: barStart + beatDuration * 2, midiNote: 36, velocity: 100 },
      { time: barStart + beatDuration * 2, midiNote: 42, velocity: 80 }
    );

    // Beat 3.5: HH
    notes.push(
      { time: barStart + beatDuration * 2.5, midiNote: 42, velocity: 70 }
    );

    // Beat 4: Snare + HH
    notes.push(
      { time: barStart + beatDuration * 3, midiNote: 38, velocity: 100 },
      { time: barStart + beatDuration * 3, midiNote: 42, velocity: 80 }
    );

    // Beat 4.5: HH
    notes.push(
      { time: barStart + beatDuration * 3.5, midiNote: 42, velocity: 70 }
    );
  }

  // Add unique IDs and state tracking
  return notes.map((note, i) => ({
    ...note,
    id: `note_${i}_${note.time}_${note.midiNote}`,
    hit: false,
    judged: false,
    sounded: false
  }));
}

/**
 * Generate a house beat pattern
 * Pattern: 4-on-the-floor kick, snare on 2&4, hi-hat on 8ths with open on offbeats
 */
function generateHouseBeat(bpm = 128, bars = 8) {
  const notes = [];
  const beatDuration = (60 / bpm) * 1000;
  const barDuration = beatDuration * 4;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDuration;

    // Four-on-the-floor kicks
    for (let beat = 0; beat < 4; beat++) {
      notes.push({ time: barStart + beat * beatDuration, midiNote: 36, velocity: 100 });
    }

    // Snare on 2 and 4
    notes.push(
      { time: barStart + beatDuration, midiNote: 38, velocity: 90 },
      { time: barStart + beatDuration * 3, midiNote: 38, velocity: 90 }
    );

    // Hi-hats on 8ths, alternating closed and open
    for (let i = 0; i < 8; i++) {
      const isOpen = i % 2 === 1;
      notes.push({
        time: barStart + i * (beatDuration / 2),
        midiNote: isOpen ? 46 : 42,
        velocity: isOpen ? 60 : 75
      });
    }
  }

  return notes.map((note, i) => ({
    ...note,
    id: `note_${i}_${note.time}_${note.midiNote}`,
    hit: false,
    judged: false,
    sounded: false
  }));
}

/**
 * Generate a hip-hop breakbeat pattern
 */
function generateHipHopBreak(bpm = 95, bars = 4) {
  const notes = [];
  const beatDuration = (60 / bpm) * 1000;
  const barDuration = beatDuration * 4;
  const sixteenth = beatDuration / 4;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDuration;

    // Kick pattern
    notes.push(
      { time: barStart, midiNote: 36, velocity: 100 },
      { time: barStart + sixteenth * 3, midiNote: 36, velocity: 85 },
      { time: barStart + beatDuration * 2, midiNote: 36, velocity: 100 },
      { time: barStart + beatDuration * 3 + sixteenth * 2, midiNote: 36, velocity: 90 }
    );

    // Snare on 2 and 4
    notes.push(
      { time: barStart + beatDuration, midiNote: 38, velocity: 100 },
      { time: barStart + beatDuration * 3, midiNote: 38, velocity: 100 }
    );

    // Hi-hat pattern (sparse)
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) {
        notes.push({
          time: barStart + i * sixteenth,
          midiNote: 42,
          velocity: i % 4 === 0 ? 80 : 60
        });
      }
    }
  }

  return notes.map((note, i) => ({
    ...note,
    id: `note_${i}_${note.time}_${note.midiNote}`,
    hit: false,
    judged: false,
    sounded: false
  }));
}

/**
 * Generate an Amen-style break pattern
 * Inspired by the famous Winston's break - fast, syncopated with snare rolls
 */
function generateAmenBreak(bpm = 165, bars = 2) {
  const notes = [];
  const beatDuration = (60 / bpm) * 1000;
  const barDuration = beatDuration * 4;
  const sixteenth = beatDuration / 4;
  const triplet = beatDuration / 3;

  // Two-bar pattern
  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDuration;

    if (bar % 2 === 0) {
      // Bar 1
      notes.push(
        { time: barStart, midiNote: 36, velocity: 100 },
        { time: barStart, midiNote: 42, velocity: 75 },
        { time: barStart + sixteenth * 3, midiNote: 38, velocity: 70 },
        { time: barStart + beatDuration, midiNote: 36, velocity: 90 },
        { time: barStart + beatDuration, midiNote: 38, velocity: 100 },
        { time: barStart + beatDuration + sixteenth * 2, midiNote: 42, velocity: 65 },
        { time: barStart + beatDuration * 2, midiNote: 36, velocity: 100 },
        { time: barStart + beatDuration * 2, midiNote: 42, velocity: 75 },
        { time: barStart + beatDuration * 2 + sixteenth * 3, midiNote: 38, velocity: 80 },
        { time: barStart + beatDuration * 3, midiNote: 38, velocity: 100 },
        { time: barStart + beatDuration * 3 + sixteenth, midiNote: 38, velocity: 85 },
        { time: barStart + beatDuration * 3 + sixteenth * 2, midiNote: 38, velocity: 75 }
      );
    } else {
      // Bar 2 - with kick variation
      notes.push(
        { time: barStart, midiNote: 36, velocity: 100 },
        { time: barStart, midiNote: 42, velocity: 75 },
        { time: barStart + sixteenth * 2, midiNote: 36, velocity: 85 },
        { time: barStart + sixteenth * 3, midiNote: 38, velocity: 70 },
        { time: barStart + beatDuration, midiNote: 38, velocity: 100 },
        { time: barStart + beatDuration + sixteenth * 2, midiNote: 42, velocity: 65 },
        { time: barStart + beatDuration * 2, midiNote: 36, velocity: 100 },
        { time: barStart + beatDuration * 2, midiNote: 42, velocity: 75 },
        { time: barStart + beatDuration * 2 + sixteenth * 3, midiNote: 38, velocity: 80 },
        { time: barStart + beatDuration * 3, midiNote: 38, velocity: 100 },
        { time: barStart + beatDuration * 3 + sixteenth, midiNote: 38, velocity: 85 },
        { time: barStart + beatDuration * 3 + sixteenth * 2, midiNote: 38, velocity: 75 }
      );
    }
  }

  return notes.map((note, i) => ({
    ...note,
    id: `note_${i}_${note.time}_${note.midiNote}`,
    hit: false,
    judged: false,
    sounded: false
  }));
}

/**
 * Generate a funky groove pattern
 * Inspired by James Brown/Clyde Stubblefield style - syncopated, ghost notes
 */
function generateFunkyGroove(bpm = 105, bars = 4) {
  const notes = [];
  const beatDuration = (60 / bpm) * 1000;
  const barDuration = beatDuration * 4;
  const sixteenth = beatDuration / 4;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDuration;

    // Syncopated kick pattern
    notes.push(
      { time: barStart, midiNote: 36, velocity: 100 },
      { time: barStart + sixteenth * 3, midiNote: 36, velocity: 75 },
      { time: barStart + beatDuration * 2, midiNote: 36, velocity: 100 },
      { time: barStart + beatDuration * 3 + sixteenth, midiNote: 36, velocity: 80 }
    );

    // Snare on 2 and 4 with ghost notes
    notes.push(
      { time: barStart + beatDuration, midiNote: 38, velocity: 100 },
      { time: barStart + beatDuration + sixteenth, midiNote: 38, velocity: 40 }, // ghost
      { time: barStart + beatDuration * 3, midiNote: 38, velocity: 100 }
    );

    // Hi-hat pattern with emphasis
    for (let i = 0; i < 16; i++) {
      const isAccent = i === 0 || i === 4 || i === 10 || i === 14;
      notes.push({
        time: barStart + i * sixteenth,
        midiNote: 42,
        velocity: isAccent ? 85 : 55
      });
    }
  }

  return notes.map((note, i) => ({
    ...note,
    id: `note_${i}_${note.time}_${note.midiNote}`,
    hit: false,
    judged: false,
    sounded: false
  }));
}

/**
 * Create a pattern object with the given type and BPM
 * @param {string} patternType - Type of pattern
 * @param {number} bpm - Beats per minute
 * @param {number} bars - Number of bars
 * @returns {Object} Complete pattern object
 */
export function createPattern(patternType = 'rock', bpm = 120, bars = 8) {
  let notes, name, defaultBPM;

  switch (patternType) {
    case 'house':
      defaultBPM = 128;
      notes = generateHouseBeat(bpm, bars);
      name = "House Beat";
      break;
    case 'hiphop':
      defaultBPM = 95;
      notes = generateHipHopBreak(bpm, Math.max(4, bars));
      name = "Hip-Hop Break";
      break;
    case 'amen':
      defaultBPM = 165;
      notes = generateAmenBreak(bpm, Math.max(2, bars));
      name = "Amen Break";
      break;
    case 'funk':
      defaultBPM = 105;
      notes = generateFunkyGroove(bpm, Math.max(4, bars));
      name = "Funky Groove";
      break;
    case 'funkydrummer':
      defaultBPM = 101;
      notes = generateFunkyDrummer(bpm, bars);
      name = "Funky Drummer";
      break;
    case 'rock':
    default:
      defaultBPM = 120;
      notes = generateRockBeat(bpm, bars);
      name = "Rock Beat";
      break;
  }

  const beatDuration = (60 / bpm) * 1000;
  const barDuration = beatDuration * 4;
  const duration = barDuration * bars;

  // For loop-based patterns, store single loop info for accuracy averaging
  const patternInfo = PATTERNS[patternType];
  const isLoopBased = patternInfo?.isLoopBased || false;

  // Calculate single pattern duration (for averaging across loops)
  // For funkydrummer: single loop is 1 bar, bars = number of loops
  // For other patterns: single pattern is all bars, no looping
  let singlePatternDuration, loopCount;
  if (isLoopBased) {
    // Loop-based: bars represents number of loops
    singlePatternDuration = barDuration;  // One bar per loop
    loopCount = bars;
  } else {
    // Bar-based: entire pattern is one unit
    singlePatternDuration = duration;
    loopCount = 1;
  }

  return {
    name: name,
    type: patternType,
    bpm: bpm,
    defaultBPM: defaultBPM,
    timeSignature: [4, 4],
    duration: duration,
    singlePatternDuration: singlePatternDuration,
    loopCount: loopCount,
    notes: notes
  };
}

// Pattern presets
export const PATTERNS = {
  rock: { name: "Rock Beat", defaultBPM: 120, bars: 8 },
  house: { name: "House Beat", defaultBPM: 128, bars: 8 },
  hiphop: { name: "Hip-Hop Break", defaultBPM: 95, bars: 4 },
  amen: { name: "Amen Break", defaultBPM: 165, bars: 2 },
  funk: { name: "Funky Groove", defaultBPM: 105, bars: 4 },
  funkydrummer: { name: "Funky Drummer (Intro Break)", defaultBPM: 101, bars: 4, isLoopBased: true }
};

// Pre-generated basic rock beat
export const BASIC_ROCK_BEAT = createPattern('rock', 120, 8);

// Export the generators
export { generateRockBeat, generateHouseBeat, generateHipHopBreak, generateAmenBreak, generateFunkyGroove };
