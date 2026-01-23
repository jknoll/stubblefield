# GrooveLab

A browser-based drum practice game that uses the Web MIDI API to accept input from electronic drum kits. Players hit notes in time with scrolling patterns (similar to Guitar Hero/Rock Band) and receive timing-based judgments.

Named after Clyde Stubblefield, the legendary drummer known for pioneering funk drumming.

## Features

- Real-time drum practice with scrolling note visualization
- Support for MIDI drum kits via Web MIDI API
- Keyboard fallback for practice without hardware
- Multiple drum patterns (Funky Drummer, Rock, House, Hip-Hop, Amen Break, Funk)
- Timing judgments (Perfect, Good, OK, Miss) with combo system
- Progress tracking with historical accuracy graphs
- Infinite loop mode for continuous practice
- Adjustable tempo and metronome
- MIDI pad light support for compatible controllers (MPD-218, etc.)

## Quick Start

1. Clone the repository
2. Start the server:
   ```bash
   node serve.js
   ```
3. Open `http://localhost:8080` in Chrome or Edge

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
Connect any MIDI drum kit - the app automatically detects:
- Note 36: Kick
- Note 38: Snare
- Note 42: Hi-Hat Closed
- Note 46: Hi-Hat Open
- Note 48: Tom 1
- Note 50: Tom 2

## Browser Requirements

- Chrome or Edge (required for Web MIDI API)
- User interaction required before audio plays (Web Audio API policy)

## Optional Features

### Google Sign-In
Enable user authentication to sync progress across devices. See [FIREBASE.md](FIREBASE.md) for setup instructions.

### Deployment
The app includes Vercel configuration for easy deployment:
```bash
vercel
```

## Development

This is a vanilla JavaScript application with no build step. The main files are:

- `index.html` - Main page structure
- `js/main.js` - Game orchestration
- `js/gameState.js` - Game state management
- `js/noteRenderer.js` - Canvas rendering
- `js/midiHandler.js` - MIDI input/output
- `js/audioManager.js` - Sound synthesis
- `css/main.css` - Styling

## License

MIT
