// MIDI file parser for drum patterns

export class MidiParser {
  constructor() {
    this.ticksPerQuarter = 480;
    this.tempo = 500000; // microseconds per quarter (default 120 BPM)
  }

  /**
   * Parse a MIDI file ArrayBuffer
   * @param {ArrayBuffer} buffer - MIDI file data
   * @returns {Object} Parsed pattern data with notes array
   */
  async parse(buffer) {
    const data = new DataView(buffer);
    let offset = 0;

    // Verify MThd header
    const headerType = this.readString(data, offset, 4);
    if (headerType !== 'MThd') {
      throw new Error('Invalid MIDI file: missing MThd header');
    }
    offset += 4;

    const headerLength = data.getUint32(offset);
    offset += 4;

    // Parse header data
    const format = data.getUint16(offset);
    const numTracks = data.getUint16(offset + 2);
    this.ticksPerQuarter = data.getUint16(offset + 4);
    offset += headerLength;

    console.log(`MIDI format: ${format}, tracks: ${numTracks}, PPQ: ${this.ticksPerQuarter}`);

    // Parse all tracks and collect notes
    let allNotes = [];

    for (let track = 0; track < numTracks; track++) {
      // Find track chunk
      const trackType = this.readString(data, offset, 4);
      if (trackType !== 'MTrk') {
        console.warn(`Expected MTrk at offset ${offset}, got ${trackType}`);
        break;
      }
      offset += 4;

      const trackLength = data.getUint32(offset);
      offset += 4;

      // Parse track events
      const trackNotes = this.parseTrack(data, offset, trackLength);
      allNotes = allNotes.concat(trackNotes);

      // Move to next track
      offset += trackLength;
    }

    // Sort all notes by time
    allNotes.sort((a, b) => a.time - b.time);

    const bpm = Math.round(60000000 / this.tempo);

    return {
      ticksPerQuarter: this.ticksPerQuarter,
      tempo: this.tempo,
      bpm: bpm,
      notes: allNotes
    };
  }

  /**
   * Read a string from the buffer
   */
  readString(data, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(data.getUint8(offset + i));
    }
    return str;
  }

  /**
   * Read a variable-length quantity from MIDI data
   */
  readVariableLength(data, offset) {
    let value = 0;
    let bytesRead = 0;

    while (true) {
      const byte = data.getUint8(offset + bytesRead);
      bytesRead++;
      value = (value << 7) | (byte & 0x7F);

      if ((byte & 0x80) === 0) {
        break;
      }
    }

    return { value, bytesRead };
  }

  /**
   * Parse a MIDI track and extract note events
   */
  parseTrack(data, offset, length) {
    const notes = [];
    const endOffset = offset + length;
    let currentTick = 0;
    let runningStatus = 0;

    while (offset < endOffset) {
      // Read delta time
      const { value: deltaTime, bytesRead: deltaBytes } = this.readVariableLength(data, offset);
      offset += deltaBytes;
      currentTick += deltaTime;

      // Read status byte
      let status = data.getUint8(offset);

      // Handle running status
      if (status < 0x80) {
        // Running status - reuse previous status
        status = runningStatus;
      } else {
        offset++;
        if (status < 0xF0) {
          runningStatus = status;
        }
      }

      const command = status >> 4;
      const channel = status & 0x0F;

      // Handle different event types
      if (command === 0x8 || command === 0x9) {
        // Note off (0x8) or Note on (0x9)
        const note = data.getUint8(offset);
        const velocity = data.getUint8(offset + 1);
        offset += 2;

        // Only record note-on events with velocity > 0 (note-on with vel=0 is note-off)
        if (command === 0x9 && velocity > 0) {
          // Convert tick time to milliseconds
          const timeMs = this.ticksToMs(currentTick);

          // Remap MIDI notes to match our game's expected notes
          const mappedNote = this.remapNote(note);

          if (mappedNote !== null) {
            notes.push({
              time: timeMs,
              midiNote: mappedNote,
              velocity: velocity,
              originalNote: note
            });
          }
        }
      } else if (command === 0xA) {
        // Polyphonic aftertouch
        offset += 2;
      } else if (command === 0xB) {
        // Control change
        offset += 2;
      } else if (command === 0xC) {
        // Program change
        offset += 1;
      } else if (command === 0xD) {
        // Channel aftertouch
        offset += 1;
      } else if (command === 0xE) {
        // Pitch bend
        offset += 2;
      } else if (status === 0xFF) {
        // Meta event
        const metaType = data.getUint8(offset);
        offset++;

        const { value: metaLength, bytesRead: metaLenBytes } = this.readVariableLength(data, offset);
        offset += metaLenBytes;

        if (metaType === 0x51 && metaLength === 3) {
          // Tempo change - 3 bytes of microseconds per quarter note
          this.tempo = (data.getUint8(offset) << 16) |
                       (data.getUint8(offset + 1) << 8) |
                       data.getUint8(offset + 2);
          console.log(`Tempo: ${this.tempo} us/quarter = ${Math.round(60000000 / this.tempo)} BPM`);
        }

        offset += metaLength;
      } else if (status === 0xF0 || status === 0xF7) {
        // SysEx event
        const { value: sysexLength, bytesRead: sysexLenBytes } = this.readVariableLength(data, offset);
        offset += sysexLenBytes + sysexLength;
      }
    }

    // Sort notes by time
    notes.sort((a, b) => a.time - b.time);

    console.log(`Parsed ${notes.length} drum notes from MIDI file`);

    return notes;
  }

  /**
   * Convert MIDI ticks to milliseconds
   */
  ticksToMs(ticks) {
    // microseconds per quarter / 1000 = ms per quarter
    // ms per tick = (ms per quarter) / ticksPerQuarter
    const msPerQuarter = this.tempo / 1000;
    return (ticks / this.ticksPerQuarter) * msPerQuarter;
  }

  /**
   * Remap MIDI drum notes to game's expected notes
   * The Funky Drummer MIDI file uses different note numbers
   */
  remapNote(midiNote) {
    const noteMap = {
      // Standard GM drum mappings
      35: 36,  // Acoustic Bass Drum -> Kick
      36: 36,  // Bass Drum 1 -> Kick
      37: 38,  // Side Stick -> Snare
      38: 38,  // Acoustic Snare -> Snare
      40: 38,  // Electric Snare -> Snare
      42: 42,  // Closed Hi-Hat -> HH Closed
      44: 42,  // Pedal Hi-Hat -> HH Closed
      46: 46,  // Open Hi-Hat -> HH Open
      41: 48,  // Low Floor Tom -> Tom 1
      43: 48,  // High Floor Tom -> Tom 1
      45: 48,  // Low Tom -> Tom 1
      47: 50,  // Low-Mid Tom -> Tom 2
      48: 50,  // Hi-Mid Tom -> Tom 2
      50: 50,  // High Tom -> Tom 2
    };

    return noteMap[midiNote] || null;
  }
}
