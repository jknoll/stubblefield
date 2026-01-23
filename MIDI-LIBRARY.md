# MIDI Library Documentation

## Overview

This document describes the process for importing MIDI drum patterns into the Stubblefield drum practice application.

## Directory Structure

All MIDI files are stored in the `/midi` directory. The application automatically scans this directory and registers patterns based on the MIDI filenames.

## MIDI File Naming Convention

MIDI files should follow this naming pattern:
```
[BPM] [Pattern Name].mid
```

Example: `076 Chilled Beat 1.mid` indicates a pattern at 76 BPM called "Chilled Beat 1".

### Pattern Types

- **Beat files**: Main patterns (e.g., `076 Chilled Beat 1.mid`)
- **Fill files**: Drum fills, identified by "Fill" in the name (e.g., `076 Chilled Beat 1 Fill 1.mid`)
- **Variation files**: Pattern variations, identified by letter suffixes (e.g., `076 Chilled Beat 1A.mid`)

## Supported MIDI Note Mappings

The application maps General MIDI drum notes to the game's 6-lane system:

| MIDI Note | GM Name | Game Lane |
|-----------|---------|-----------|
| 35, 36 | Bass Drum | Kick |
| 37, 38, 40 | Snare/Side Stick | Snare |
| 42, 44 | Closed Hi-Hat | HH Closed |
| 46 | Open Hi-Hat | HH Open |
| 41, 43, 45 | Low/Floor Toms | Tom 1 |
| 47, 48, 50 | Mid/High Toms | Tom 2 |

## Import Process

1. Place MIDI files in the `/midi` directory
2. The `MidiLibrary` module automatically scans for `.mid` files on initialization
3. Patterns are parsed and registered in the pattern dropdown
4. BPM is extracted from the filename or MIDI tempo events

## Source Collections

### Groovemonkee Beat Farm (Free MIDI Beats)

Source: https://groovemonkee.com/pages/beat-farm-free-midi-beats

Available collections:
- Chilled Beats
- Hip Hop Beats
- Funk Set
- Motown MIDI Beats
- DnB MIDI Beats

### Import Guidelines

When importing from collections:
- Import snare variations only
- Skip patterns with claps or side stick (unless mapped to snare)
- Import both beats and fills
- Preserve original BPM from filename

## Technical Notes

- MIDI files are parsed using the `MidiParser` class
- Patterns are cached after first load for performance
- Tempo changes within MIDI files are respected
- Notes outside the supported mapping are ignored
