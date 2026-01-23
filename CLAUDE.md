# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stubblefield is a browser-based drum practice game that uses the Web MIDI API to accept input from electronic drum kits. Players hit notes in time with scrolling patterns (similar to Guitar Hero/Rock Band) and receive timing-based judgments (Perfect, Good, OK, Miss).

Named after Clyde Stubblefield, the legendary drummer known for pioneering funk drumming.

## Running the Application

This is a vanilla JavaScript application with no build step. To run:
```bash
node serve.js
```
Then open `http://localhost:8080` in Chrome or Edge.

**Note for Claude Code:** Use `run_in_background: true` parameter instead of appending `&` to run the server in background. This ensures proper permission handling.

Alternatively, serve the project root with any static file server.

### Input Methods
- **Keyboard**: A=Kick, S=Snare, D=Tom1, J=Tom2, K=HH-Closed, L=HH-Open
- **MIDI**: Connect a MIDI drum kit (Web MIDI API supported in Chrome/Edge)

## Architecture

### Core Game Loop

The game uses `requestAnimationFrame` for the main loop, coordinated through:

1. **DrumGame** (`js/main.js`) - Main orchestrator that wires all modules together
2. **GameState** (`js/gameState.js`) - Manages game time, note lifecycle (upcoming → active → hit/missed), and the animation loop
3. **NoteRenderer** (`js/noteRenderer.js`) - Canvas-based renderer drawing scrolling notes and hit effects

### Input/Output Pipeline

```
MidiHandler ──┐
              ├──→ InputDebouncer → DrumGame.handleMidiInput() → TimingJudge.findMatchingNote()
KeyboardHandler┘                    → TimingJudge.judgeHit() → ScoreManager.recordJudgment()
                                    → GameState.recordHit() → NoteRenderer (visual feedback)
```

### Module Responsibilities

- **MidiHandler** - Web MIDI API wrapper, filters for Note On events
- **KeyboardHandler** - Keyboard input handler, maps keys to MIDI notes, prevents key repeat
- **InputDebouncer** - Filters double-triggers from unreliable hardware (defective kick pedals, etc.); configurable window (0-100ms) via UI slider
- **TimingJudge** - Evaluates hit timing against windows defined in `constants.js`, finds best matching note within active notes
- **ScoreManager** - Tracks score with combo multipliers, calculates accuracy and letter grades
- **AudioManager** - Web Audio API synthesis for drum sounds and metronome clicks (no audio files)
- **Metronome** - Visual beat indicator rendered to separate canvas
- **MidiParser** - Parses Standard MIDI files to extract drum patterns
- **patterns.js** - Pattern generators for different drum styles (rock, house, hip-hop, amen break, funk, funky drummer from MIDI)

### Key Constants (`js/constants.js`)

- `MIDI_NOTE_MAP` - Maps MIDI note numbers to drum names and lanes (36=Kick, 38=Snare, 42=HH Closed, 46=HH Open)
- `KEYBOARD_MAP` - Maps keyboard codes to MIDI note numbers (KeyA=36, KeyS=38, etc.)
- `TIMING_WINDOWS` - Hit accuracy thresholds in ms (PERFECT: ±50ms, GOOD: ±100ms, OK: ±150ms)
- `GAME_CONFIG` - Horizontal scroll speed, canvas dimensions (800x360), hit line position, lead-in time

### Layout

Notes flow horizontally from right to left. The hit line is a vertical line on the left side of the canvas (x=100). Each drum lane is a horizontal row (60px height).

### Note Lifecycle

Notes move through states: `upcomingNotes` → `activeNotes` (when within lookahead window) → `hitNotes` or `missedNotes`. Each note has `judged`, `hit`, and `sounded` flags to track state.

### Accuracy Terminology

- **Rushing**: Hitting a note early (before its scheduled time); negative `timeDiff` value
- **Dragging**: Hitting a note late (after its scheduled time); positive `timeDiff` value
- **Wrong Pad**: Hitting an incorrect drum when a note is expected (e.g., hitting snare when kick was expected)
- **Missed**: A note that passed without being hit within the timing window
- **Per-note accuracy**: Tracking of timing offset (`timeDiff`), rushing/dragging flags, and judgment for each individual note in the pattern; stored in `note.accuracy` object after judgment

### Completion Visualization

On pattern completion, the game canvas displays a piano roll view showing all notes color-coded by accuracy:
- **Green**: Accurate hits (PERFECT = bright, GOOD = medium)
- **Yellow**: OK timing
- **Orange**: Early/Late (within timing window but poor accuracy)
- **Red**: Missed or wrong pad

## Browser Requirements

- Chrome or Edge for Web MIDI API
- User interaction required before audio plays (Web Audio API autoplay policy)

## Testing changes
Test using Claude for Chrome. Verify edits and modifications.