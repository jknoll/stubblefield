// Keyboard input handler for drum game

import { KEYBOARD_MAP } from './constants.js';

export class KeyboardHandler {
  constructor() {
    this.onNoteCallback = null;
    this.pressedKeys = new Set(); // Prevent key repeat
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
  }

  /**
   * Initialize keyboard event listeners
   */
  initialize() {
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    console.log('KeyboardHandler initialized');
  }

  /**
   * Register a callback for note events
   * @param {Function} callback - Function(midiNote, velocity, timestamp)
   */
  registerNoteCallback(callback) {
    this.onNoteCallback = callback;
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    // Ignore if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const keyCode = event.code;

    // Check if this key is mapped to a drum
    if (KEYBOARD_MAP[keyCode] !== undefined) {
      event.preventDefault();

      // Prevent key repeat
      if (this.pressedKeys.has(keyCode)) {
        return;
      }

      this.pressedKeys.add(keyCode);

      const midiNote = KEYBOARD_MAP[keyCode];
      const velocity = 100; // Fixed velocity for keyboard
      const timestamp = performance.now();

      console.log(`Keyboard: ${keyCode} -> MIDI ${midiNote}`);

      if (this.onNoteCallback) {
        this.onNoteCallback(midiNote, velocity, timestamp);
      }
    }
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} event
   */
  handleKeyUp(event) {
    const keyCode = event.code;
    this.pressedKeys.delete(keyCode);
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    this.pressedKeys.clear();
  }
}
