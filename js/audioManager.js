// Audio playback manager using Web Audio API

import { MIDI_NOTE_MAP } from './constants.js';

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.metronomeGain = null;
    this.drumsGain = null;
    this.trackPanner = null;  // Panner for MIDI track playback (left)
    this.userPanner = null;   // Panner for user input (right)

    this.metronomeVolume = 0.5;
    this.drumsVolume = 0.7;

    this.initialized = false;
  }

  /**
   * Initialize Web Audio API
   * Note: Must be called after user interaction due to browser autoplay policies
   */
  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create gain nodes for volume control
      this.metronomeGain = this.audioContext.createGain();
      this.metronomeGain.gain.value = this.metronomeVolume;
      this.metronomeGain.connect(this.audioContext.destination);

      this.drumsGain = this.audioContext.createGain();
      this.drumsGain.gain.value = this.drumsVolume;

      // Create stereo panners for track (left) and user input (right)
      this.trackPanner = this.audioContext.createStereoPanner();
      this.trackPanner.pan.value = -1;  // Hard left
      // Route track panner through drums gain so volume slider controls it
      this.trackPanner.connect(this.drumsGain);

      this.userPanner = this.audioContext.createStereoPanner();
      this.userPanner.pan.value = 1;   // Hard right
      this.userPanner.connect(this.audioContext.destination);

      // Connect drums gain to destination (practice track routes through this)
      this.drumsGain.connect(this.audioContext.destination);

      this.initialized = true;
      console.log('AudioManager initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Web Audio API:', error);
      return false;
    }
  }

  /**
   * Resume audio context if suspended (required after user interaction)
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Play metronome click
   * @param {number} beat - Beat number (1-4), where 1 is accented
   */
  playMetronomeClick(beat) {
    if (!this.initialized || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    // Create oscillator for click sound
    const oscillator = this.audioContext.createOscillator();
    const clickGain = this.audioContext.createGain();

    // Beat 1 is higher pitch and louder (accent)
    // Increased accent ratio for more noticeable downbeat
    const frequency = beat === 1 ? 1200 : 800;
    const volume = beat === 1 ? 1.0 : 0.4;

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Quick attack and decay for "click" sound
    clickGain.gain.setValueAtTime(volume, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    oscillator.connect(clickGain);
    clickGain.connect(this.metronomeGain);

    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  /**
   * Play drum sound (for track playback - panned left)
   * @param {number} midiNote - MIDI note number
   * @param {number} velocity - Velocity (0-127)
   */
  playDrumSound(midiNote, velocity = 100) {
    this.playDrumSoundPanned(midiNote, velocity, 'left');
  }

  /**
   * Play drum sound for user input (panned right)
   * @param {number} midiNote - MIDI note number
   * @param {number} velocity - Velocity (0-127)
   */
  playUserDrumSound(midiNote, velocity = 100) {
    this.playDrumSoundPanned(midiNote, velocity, 'right');
  }

  /**
   * Play drum sound with panning
   * @param {number} midiNote - MIDI note number
   * @param {number} velocity - Velocity (0-127)
   * @param {string} pan - 'left', 'right', or 'center'
   */
  playDrumSoundPanned(midiNote, velocity = 100, pan = 'center') {
    if (!this.initialized || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const normalizedVelocity = velocity / 127;

    // Select destination based on pan
    let destination;
    switch (pan) {
      case 'left':
        destination = this.trackPanner;
        break;
      case 'right':
        destination = this.userPanner;
        break;
      default:
        destination = this.drumsGain;
    }

    // Different synthesis for different drums
    switch (midiNote) {
      case 36: // Kick
        this.playKick(now, normalizedVelocity, destination);
        break;
      case 38: // Snare
        this.playSnare(now, normalizedVelocity, destination);
        break;
      case 42: // Hi-hat closed
      case 46: // Hi-hat open
        this.playHiHat(now, normalizedVelocity, midiNote === 46, destination);
        break;
      default:
        // Generic tom sound for other notes
        this.playTom(now, normalizedVelocity, destination);
    }
  }

  /**
   * Synthesize kick drum sound
   */
  playKick(time, velocity, destination) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Pitch envelope: starts at 150Hz, drops to 40Hz
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    // Amplitude envelope
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  /**
   * Synthesize snare drum sound
   */
  playSnare(time, velocity, destination) {
    // Tone component
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    oscGain.gain.setValueAtTime(velocity * 0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.connect(oscGain);
    oscGain.connect(destination);

    // Noise component
    const bufferSize = this.audioContext.sampleRate * 0.15;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();

    noise.buffer = buffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    noiseGain.gain.setValueAtTime(velocity * 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.15);
    noise.start(time);
  }

  /**
   * Synthesize hi-hat sound
   */
  playHiHat(time, velocity, isOpen, destination) {
    const bufferSize = this.audioContext.sampleRate * (isOpen ? 0.3 : 0.05);
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const duration = isOpen ? 0.3 : 0.05;
    gain.gain.setValueAtTime(velocity * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(time);
  }

  /**
   * Synthesize tom sound
   */
  playTom(time, velocity, destination) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.2);

    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  /**
   * Set metronome volume
   * @param {number} volume - Volume 0-1
   */
  setMetronomeVolume(volume) {
    this.metronomeVolume = Math.max(0, Math.min(1, volume));
    if (this.metronomeGain) {
      this.metronomeGain.gain.value = this.metronomeVolume;
    }
  }

  /**
   * Set drums volume
   * @param {number} volume - Volume 0-1
   */
  setDrumsVolume(volume) {
    this.drumsVolume = Math.max(0, Math.min(1, volume));
    if (this.drumsGain) {
      this.drumsGain.gain.value = this.drumsVolume;
    }
  }

  /**
   * Get metronome volume
   * @returns {number} Volume 0-1
   */
  getMetronomeVolume() {
    return this.metronomeVolume;
  }

  /**
   * Get drums volume
   * @returns {number} Volume 0-1
   */
  getDrumsVolume() {
    return this.drumsVolume;
  }
}
