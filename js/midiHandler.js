// MIDI input handler using Web MIDI API

export class MidiHandler {
  constructor() {
    this.midiAccess = null;
    this.activeInputs = [];
    this.onNoteCallback = null;
    this.onDeviceChangeCallback = null;
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
   * Update the list of active MIDI inputs
   */
  updateInputs() {
    this.activeInputs = [];

    if (!this.midiAccess) return;

    const inputs = this.midiAccess.inputs.values();
    for (let input of inputs) {
      this.activeInputs.push(input);

      // Set up message handler for this input
      input.onmidimessage = (event) => {
        this.onMidiMessage(event);
      };
    }

    console.log(`Found ${this.activeInputs.length} MIDI input(s)`);
  }

  /**
   * Handle incoming MIDI messages
   * @param {MIDIMessageEvent} event
   */
  onMidiMessage(event) {
    const [status, note, velocity] = event.data;
    const command = status >> 4;
    const channel = status & 0xf;

    // We only care about note on events (command = 9)
    // Note: Some devices send note on with velocity 0 instead of note off
    if (command === 9 && velocity > 0) {
      const timestamp = event.timeStamp || performance.now();

      console.log(`MIDI Note: ${note}, Velocity: ${velocity}, Time: ${timestamp.toFixed(2)}`);

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
}
