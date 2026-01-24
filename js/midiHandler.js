// MIDI input handler using Web MIDI API

export class MidiHandler {
  constructor() {
    this.midiAccess = null;
    this.allInputs = [];        // All available MIDI inputs
    this.allOutputs = [];       // All available MIDI outputs
    this.activeInputs = [];      // Currently enabled inputs
    this.selectedDeviceId = null; // Currently selected device ID (null = all)
    this.selectedOutputId = null; // Selected output device for pad lights
    this.onNoteCallback = null;
    this.onDeviceChangeCallback = null;

    // Pad light state tracking
    this.litPads = new Set();    // Currently lit pads
    this.padLightEnabled = true; // Enable/disable pad light feature
  }

  /**
   * Initialize Web MIDI API
   * @returns {Promise<boolean>} True if successful
   */
  async initialize() {
    // Check if Web MIDI API is supported
    if (!navigator.requestMIDIAccess) {
      console.error('Web MIDI API not supported in this browser');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      console.log('MIDI Access granted');

      // Set up state change listener for device connections
      this.midiAccess.onstatechange = (e) => {
        console.log('MIDI device state changed:', e.port.name, e.port.state);
        this.updateInputs();
        if (this.onDeviceChangeCallback) {
          this.onDeviceChangeCallback(this.getAvailableDevices());
        }
      };

      // Initialize inputs
      this.updateInputs();

      return true;
    } catch (error) {
      console.error('Failed to get MIDI access:', error);
      return false;
    }
  }

  /**
   * Update the list of active MIDI inputs and outputs
   */
  updateInputs() {
    this.allInputs = [];
    this.allOutputs = [];
    this.activeInputs = [];

    if (!this.midiAccess) return;

    // Collect inputs
    const inputs = this.midiAccess.inputs.values();
    for (let input of inputs) {
      this.allInputs.push(input);

      // Set up message handler for this input
      input.onmidimessage = (event) => {
        this.onMidiMessage(event, input.id);
      };
    }

    // Collect outputs (for pad lights)
    const outputs = this.midiAccess.outputs.values();
    for (let output of outputs) {
      this.allOutputs.push(output);
    }

    // Update active inputs based on selection
    this.applyDeviceSelection();

    // Auto-select first output for pad lights if none selected
    if (!this.selectedOutputId && this.allOutputs.length > 0) {
      this.selectedOutputId = this.allOutputs[0].id;
    }

    console.log(`Found ${this.allInputs.length} MIDI input(s), ${this.allOutputs.length} output(s)`);
  }

  /**
   * Apply the current device selection
   */
  applyDeviceSelection() {
    if (this.selectedDeviceId === null) {
      // All devices active
      this.activeInputs = [...this.allInputs];
    } else if (this.selectedDeviceId === 'none') {
      // No MIDI devices - keyboard only mode
      this.activeInputs = [];
    } else {
      // Only selected device active
      this.activeInputs = this.allInputs.filter(input => input.id === this.selectedDeviceId);
    }
  }

  /**
   * Select a specific MIDI device by ID
   * @param {string|null} deviceId - Device ID to select, or null for all devices
   */
  selectDevice(deviceId) {
    this.selectedDeviceId = deviceId;
    this.applyDeviceSelection();
    console.log(`Selected MIDI device: ${deviceId || 'All devices'}`);

    if (this.onDeviceChangeCallback) {
      this.onDeviceChangeCallback(this.getAvailableDevices());
    }
  }

  /**
   * Get the currently selected device ID
   * @returns {string|null}
   */
  getSelectedDeviceId() {
    return this.selectedDeviceId;
  }

  /**
   * Handle incoming MIDI messages
   * @param {MIDIMessageEvent} event
   * @param {string} deviceId - ID of the device that sent the message
   */
  onMidiMessage(event, deviceId) {
    // Filter by selected device
    if (this.selectedDeviceId !== null && deviceId !== this.selectedDeviceId) {
      return;
    }

    const [status, note, velocity] = event.data;
    const command = status >> 4;
    const channel = status & 0xf;

    // We only care about note on events (command = 9)
    // Note: Some devices send note on with velocity 0 instead of note off
    if (command === 9 && velocity > 0) {
      const timestamp = event.timeStamp || performance.now();

      console.log(`MIDI Note: ${note}, Velocity: ${velocity}, Device: ${deviceId}`);

      // Call registered callback
      if (this.onNoteCallback) {
        this.onNoteCallback(note, velocity, timestamp);
      }
    }
  }

  /**
   * Register a callback for note events
   * @param {Function} callback - Function(midiNote, velocity, timestamp)
   */
  registerNoteCallback(callback) {
    this.onNoteCallback = callback;
  }

  /**
   * Register a callback for device connection changes
   * @param {Function} callback - Function(devices)
   */
  registerDeviceChangeCallback(callback) {
    this.onDeviceChangeCallback = callback;
  }

  /**
   * Get list of available MIDI devices
   * @returns {Array} Array of device objects
   */
  getAvailableDevices() {
    return this.activeInputs.map(input => ({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer,
      state: input.state
    }));
  }

  /**
   * Check if any MIDI devices are connected
   * @returns {boolean}
   */
  hasDevices() {
    return this.activeInputs.length > 0;
  }

  /**
   * Get available MIDI output devices
   * @returns {Array} Array of output device objects
   */
  getAvailableOutputs() {
    return this.allOutputs.map(output => ({
      id: output.id,
      name: output.name,
      manufacturer: output.manufacturer,
      state: output.state
    }));
  }

  /**
   * Check if any MIDI outputs are available for pad lights
   * @returns {boolean}
   */
  hasOutputs() {
    return this.allOutputs.length > 0;
  }

  /**
   * Select a MIDI output device for pad lights
   * @param {string} outputId - Output device ID
   */
  selectOutput(outputId) {
    this.selectedOutputId = outputId;
    console.log(`Selected MIDI output: ${outputId}`);
  }

  /**
   * Enable or disable pad light feature
   * @param {boolean} enabled
   */
  setPadLightEnabled(enabled) {
    this.padLightEnabled = enabled;
    if (!enabled) {
      this.clearAllPadLights();
    }
  }

  /**
   * Get the selected output device
   * @returns {MIDIOutput|null}
   */
  getSelectedOutput() {
    if (!this.selectedOutputId) return null;
    return this.allOutputs.find(o => o.id === this.selectedOutputId) || null;
  }

  /**
   * Light up a pad by sending MIDI Note On
   * @param {number} midiNote - MIDI note number (e.g., 36 for kick)
   * @param {number} velocity - Light intensity (1-127), default 127
   */
  lightPad(midiNote, velocity = 127) {
    if (!this.padLightEnabled) return;

    const output = this.getSelectedOutput();
    if (!output) return;

    // Note On message: 0x90 = channel 1 note on (or 0x99 for channel 10/drums)
    // Using channel 1 (0x90) as many controllers respond to this
    const noteOn = [0x90, midiNote, velocity];
    output.send(noteOn);
    this.litPads.add(midiNote);

    console.log(`Pad light ON: note ${midiNote}, velocity ${velocity}`);
  }

  /**
   * Turn off a pad light by sending Note Off
   * @param {number} midiNote - MIDI note number
   */
  unlightPad(midiNote) {
    if (!this.padLightEnabled) return;

    const output = this.getSelectedOutput();
    if (!output) return;

    // Note Off message: 0x80 = channel 1 note off
    // Alternatively, Note On with velocity 0
    const noteOff = [0x80, midiNote, 0];
    output.send(noteOff);
    this.litPads.delete(midiNote);

    console.log(`Pad light OFF: note ${midiNote}`);
  }

  /**
   * Flash a pad light briefly
   * @param {number} midiNote - MIDI note number
   * @param {number} duration - Flash duration in ms (default 200)
   * @param {number} velocity - Light intensity (default 127)
   */
  flashPad(midiNote, duration = 200, velocity = 127) {
    this.lightPad(midiNote, velocity);
    setTimeout(() => {
      this.unlightPad(midiNote);
    }, duration);
  }

  /**
   * Clear all currently lit pads
   */
  clearAllPadLights() {
    const output = this.getSelectedOutput();
    if (!output) return;

    // Send note off for all lit pads
    for (const note of this.litPads) {
      const noteOff = [0x80, note, 0];
      output.send(noteOff);
    }
    this.litPads.clear();

    console.log('All pad lights cleared');
  }

  /**
   * Light multiple pads at once
   * @param {Array<number>} midiNotes - Array of MIDI note numbers
   * @param {number} velocity - Light intensity (default 127)
   */
  lightPads(midiNotes, velocity = 127) {
    midiNotes.forEach(note => this.lightPad(note, velocity));
  }

  /**
   * Schedule a pad light to turn on at a specific time
   * @param {number} midiNote - MIDI note number
   * @param {number} delay - Delay in ms from now
   * @param {number} duration - How long to keep lit (0 = until manually turned off)
   * @param {number} velocity - Light intensity
   */
  schedulePadLight(midiNote, delay, duration = 200, velocity = 127) {
    setTimeout(() => {
      if (duration > 0) {
        this.flashPad(midiNote, duration, velocity);
      } else {
        this.lightPad(midiNote, velocity);
      }
    }, delay);
  }
}
