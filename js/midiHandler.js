// MIDI input handler using Web MIDI API

export class MidiHandler {
  constructor() {
    this.midiAccess = null;
    this.allInputs = [];        // All available MIDI inputs
    this.activeInputs = [];      // Currently enabled inputs
    this.selectedDeviceId = null; // Currently selected device ID (null = all)
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
    this.allInputs = [];
    this.activeInputs = [];

    if (!this.midiAccess) return;

    const inputs = this.midiAccess.inputs.values();
    for (let input of inputs) {
      this.allInputs.push(input);

      // Set up message handler for this input
      input.onmidimessage = (event) => {
        this.onMidiMessage(event, input.id);
      };
    }

    // Update active inputs based on selection
    this.applyDeviceSelection();

    console.log(`Found ${this.allInputs.length} MIDI input(s)`);
  }

  /**
   * Apply the current device selection
   */
  applyDeviceSelection() {
    if (this.selectedDeviceId === null) {
      // All devices active
      this.activeInputs = [...this.allInputs];
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
}
