# GrooveLab

<p align="center">
  <img src="img/groovelab-header.jpg" alt="GrooveLab" width="600">
</p>

<p align="center">
  <a href="https://github.com/jknoll/stubblefield/actions/workflows/test.yml"><img src="https://github.com/jknoll/stubblefield/actions/workflows/test.yml/badge.svg" alt="Playwright Tests"></a>
  <a href="https://groovelab.vercel.app"><img src="https://img.shields.io/badge/demo-groovelab.vercel.app-blue" alt="Live Demo"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
</p>

A browser-based drum practice game that uses the Web MIDI API to accept input from electronic drum kits. Hit notes in time with scrolling patterns — like Guitar Hero, but for real drummers.

Named after [Clyde Stubblefield](https://en.wikipedia.org/wiki/Clyde_Stubblefield), the legendary drummer known for pioneering funk drumming.

<p align="center">
  <img src="img/Screenshot 2026-03-05 at 2.09.10 PM.png" alt="GrooveLab gameplay screenshot" width="700">
</p>

## Features

- Scrolling note visualization with real-time timing judgments (Perfect, Good, OK, Miss)
- MIDI drum kit support via Web MIDI API
- Keyboard fallback for practice without hardware
- Built-in patterns: Funky Drummer, Rock, House, Hip-Hop, Amen Break, Funk
- Combo scoring system with letter grades
- Historical accuracy tracking with progress graphs
- Infinite loop mode for continuous practice
- Adjustable tempo and visual metronome
- MIDI pad light support for compatible controllers (MPD-218, etc.)

## Try It

**[groovelab.vercel.app](https://groovelab.vercel.app)** — works in Chrome or Edge.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:8080` in Chrome or Edge.

## Controls

### Keyboard

| Key | Drum |
|-----|------|
| A | Kick |
| S | Snare |
| D | Tom 1 |
| J | Tom 2 |
| K | Hi-Hat Closed |
| L | Hi-Hat Open |

### MIDI

Connect any MIDI drum kit — the app auto-detects standard GM drum mapping:

| Note | Drum |
|------|------|
| 36 | Kick |
| 38 | Snare |
| 42 | Hi-Hat Closed |
| 46 | Hi-Hat Open |
| 48 | Tom 1 |
| 50 | Tom 2 |

## Browser Requirements

- **Chrome or Edge** required for Web MIDI API
- User interaction required before audio plays (Web Audio API policy)

## Development

Built with **Svelte** (UI) + **vanilla JS** (game engine) + **Vite** (build tool).

```
src/                  # Svelte UI layer
├── App.svelte        # Main application component
├── stores/           # Centralized UI state
└── components/       # UI components

js/                   # Game engine (vanilla JS for 60fps performance)
├── gameState.js      # Game time, note lifecycle, animation loop
├── noteRenderer.js   # Canvas-based renderer
├── audioManager.js   # Web Audio API synthesis (no audio files)
├── timingJudge.js    # Hit detection and scoring
├── midiHandler.js    # Web MIDI API wrapper
└── ...
```

### Testing

```bash
npm run test:e2e          # Headless
npm run test:e2e:headed   # Visible browser
npm run test:e2e:ui       # Interactive UI
```

See [docs/BROWSER-TESTING.md](docs/BROWSER-TESTING.md) for details.

### Optional: Google Sign-In

Enable user authentication to sync progress across devices. See [FIREBASE.md](FIREBASE.md) for setup.

## License

MIT
