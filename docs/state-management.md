# State Management Architecture

This document describes the state management design decisions for GrooveLab, a browser-based drum practice game requiring low-latency audio and precise canvas rendering.

## Performance Requirements

### Critical Constraints

1. **Audio Latency**: Web Audio API scheduling must happen with precise timing. The audio thread is separate from JavaScript, but scheduling decisions happen on the main thread.

2. **Canvas Rendering**: The piano roll uses `requestAnimationFrame` for 60fps rendering. Frame budget is ~16ms, and any framework overhead directly impacts rendering time.

3. **Input Responsiveness**: MIDI and keyboard input must be processed with minimal latency (<10ms added delay).

## Architecture Decisions

### Separation of Concerns

The application is divided into two distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (Svelte)                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Control Panel Components                             │   │
│  │ - BPM controls (slider, +/- buttons)                │   │
│  │ - Pattern selector dropdown                          │   │
│  │ - Loop count selector                                │   │
│  │ - Start/Stop/Pause button                           │   │
│  │ - Score display                                      │   │
│  │ - Volume sliders                                     │   │
│  │ - Kit/Tone/Reverb controls                          │   │
│  │ - MIDI device selector                              │   │
│  │ - Theme toggle                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          │ Events & State Updates           │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Centralized UI State Store (Svelte Store)           │   │
│  │ - bpm, pattern, loopCount, gamePhase                │   │
│  │ - volumes, kit, tone, reverb                        │   │
│  │ - score, combo, accuracy, judgments                 │   │
│  │ - midiDevices, selectedDevice                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Imperative calls (not reactive)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Game Engine Layer (Vanilla JS - OUTSIDE Svelte)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ GameState    │  │ NoteRenderer │  │ AudioManager │      │
│  │ - currentTime│  │ - canvas ctx │  │ - Web Audio  │      │
│  │ - activeNotes│  │ - 60fps loop │  │ - scheduling │      │
│  │ - timing     │  │ - hit effects│  │ - low latency│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TimingJudge  │  │ ScoreManager │  │ MidiHandler  │      │
│  │ - hit windows│  │ - scoring    │  │ - MIDI input │      │
│  │ - judgment   │  │ - combos     │  │ - devices    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  requestAnimationFrame loop - never blocked by UI           │
└─────────────────────────────────────────────────────────────┘
```

### Why This Separation?

1. **Game state changes 60 times per second** - putting this in Svelte's reactive system would cause 60 re-renders per second, stealing frame budget from canvas rendering.

2. **Audio scheduling happens in the rAF callback** - if Svelte's reactivity triggers during this callback, it could delay audio scheduling and cause jitter.

3. **UI controls change infrequently** - BPM, pattern, volume changes happen at human speed (maybe a few times per minute), so Svelte's overhead is negligible for these.

### Communication Patterns

#### UI → Game Engine (User Actions)

```javascript
// Svelte component dispatches action
function handleBpmChange(newBpm) {
  uiStore.setBpm(newBpm);           // Update UI state
  gameEngine.changeBPM(newBpm);     // Direct call to game engine
}
```

#### Game Engine → UI (State Updates)

```javascript
// Game engine calls store update (throttled for score display)
scoreManager.onScoreUpdate = (data) => {
  // Only update UI every 100ms to avoid overwhelming Svelte
  uiStore.updateScore(data);
};
```

### Key Design Rules

1. **Never put frame-by-frame state in Svelte stores**
   - `currentTime`, `activeNotes`, `notePositions` stay in vanilla JS
   - These change every 16ms and would cause constant re-renders

2. **Canvas elements are refs, not reactive**
   - Svelte gives us the canvas element via `bind:this`
   - All drawing is imperative, not declarative

3. **Game loop owns timing**
   - `requestAnimationFrame` runs independently of Svelte
   - Svelte components never call `requestAnimationFrame`

4. **UI updates are batched and throttled**
   - Score display updates every 100ms, not every frame
   - Stats graph updates only on pattern completion

5. **No reactive bindings to game engine properties**
   - Don't do: `$: noteCount = gameState.activeNotes.length`
   - Do: Update a store value when the count changes meaningfully

## State Store Design

### UI State (Svelte Writable Stores)

```typescript
interface UIState {
  // Playback
  bpm: number;
  pattern: string;
  loopCount: number | 'infinite';
  gamePhase: 'ready' | 'playing' | 'paused' | 'complete';

  // Audio settings
  metronomeVolume: number;
  drumsVolume: number;
  kit: string;
  tone: number;
  reverb: number;
  debounce: number;

  // Score (updated periodically, not per-frame)
  score: number;
  combo: number;
  accuracy: number;
  judgments: { perfect: number; good: number; ok: number; miss: number };

  // Devices
  midiDevices: MidiDevice[];
  selectedDevice: string | null;

  // Theme
  theme: 'light' | 'dark';
}
```

### Game State (Vanilla JS, not reactive)

```typescript
interface GameEngineState {
  // Real-time (changes every frame)
  currentTime: number;
  activeNotes: Note[];
  upcomingNotes: Note[];
  hitNotes: Note[];
  missedNotes: Note[];

  // Per-frame rendering
  hitEffects: HitEffect[];
  beatPhase: number;

  // Audio scheduling
  scheduledSounds: ScheduledSound[];
}
```

## Framework Choice: Svelte

### Why Svelte?

1. **Compiles to vanilla JS** - minimal runtime overhead
2. **No virtual DOM** - direct DOM updates when state changes
3. **Fine-grained reactivity** - only updates what changed
4. **Small bundle size** - ~5KB gzipped for the runtime

### Why Not React?

1. **Virtual DOM overhead** - diffing can take 5-15ms on complex updates
2. **Reconciliation during gameplay** - could steal frame budget
3. **Unnecessary for our use case** - we don't have complex component trees

### Why Not Vue?

1. **Similar to React** - virtual DOM with reconciliation
2. **Heavier runtime** - more overhead than Svelte
3. **Two-way binding can cause issues** - reactive cascades

## Build System

### Vite Configuration

Vite is used as the build tool because:
- Fast HMR (Hot Module Replacement) during development
- Native ES modules support
- Optimized production builds
- First-class Svelte support via `@sveltejs/vite-plugin-svelte`

### Development vs Production

**Development:**
- `npm run dev` - Vite dev server with HMR
- Source maps enabled
- No minification

**Production:**
- `npm run build` - Outputs to `dist/`
- Tree shaking removes unused code
- Minified and optimized

## Migration Strategy

### Phase 1: Setup (Current)
- Add Svelte + Vite build system
- Create centralized UI state store
- Keep existing vanilla JS game engine intact

### Phase 2: Component Migration
- Create Svelte components for each UI section
- Wire components to state store
- Connect store to game engine via imperative calls

### Phase 3: Testing
- Verify audio latency unchanged
- Verify canvas rendering at 60fps
- Test UI state coordination

### Phase 4: Cleanup
- Remove old DOM manipulation code from main.js
- Consolidate event handlers into components
- Document component API

## Measuring Performance

### Key Metrics

1. **Frame time** - should stay under 16ms
   ```javascript
   const start = performance.now();
   // ... rendering code ...
   const frameTime = performance.now() - start;
   if (frameTime > 16) console.warn(`Frame took ${frameTime}ms`);
   ```

2. **Audio scheduling jitter** - should be < 5ms variance
   ```javascript
   // Compare scheduled time vs actual play time
   const jitter = actualTime - scheduledTime;
   ```

3. **Input latency** - from MIDI event to visual feedback
   ```javascript
   const inputTime = performance.now();
   // ... after feedback shown ...
   const latency = performance.now() - inputTime;
   ```

### Acceptable Thresholds

| Metric | Target | Maximum |
|--------|--------|---------|
| Frame time | < 12ms | 16ms |
| Audio jitter | < 2ms | 5ms |
| Input latency | < 5ms | 10ms |
| UI update time | < 3ms | 10ms |

## Troubleshooting

### If frame rate drops:
1. Check if Svelte stores are being updated too frequently
2. Ensure game state is not bound to reactive variables
3. Profile with Chrome DevTools Performance tab

### If audio stutters:
1. Increase look-ahead scheduling window
2. Check for expensive computations in rAF callback
3. Ensure UI updates don't block the audio scheduling

### If UI feels unresponsive:
1. Check if game engine is blocking the main thread
2. Ensure long computations are chunked or deferred
3. Profile with Chrome DevTools to find bottlenecks
