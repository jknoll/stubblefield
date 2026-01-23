// Audio playback manager using Web Audio API

import { MIDI_NOTE_MAP } from './constants.js';

// Drum kit presets with synthesis parameters
const DRUM_KITS = {
  rock: {
    name: 'Classic Rock',
    kick: { startFreq: 150, endFreq: 40, decay: 0.3 },
    snare: { toneFreq: 200, toneDecay: 0.15, noiseDecay: 0.15, noiseFilter: 1000 },
    hihat: { filterFreq: 7000, closedDecay: 0.05, openDecay: 0.3 },
    tom: { startFreq: 200, endFreq: 80, decay: 0.3 }
  },
  funk: {
    name: 'Soul/Funk',
    kick: { startFreq: 120, endFreq: 45, decay: 0.2 },
    snare: { toneFreq: 180, toneDecay: 0.1, noiseDecay: 0.12, noiseFilter: 1200 },
    hihat: { filterFreq: 8000, closedDecay: 0.03, openDecay: 0.2 },
    tom: { startFreq: 180, endFreq: 90, decay: 0.25 }
  },
  tr808: {
    name: 'TR-808',
    kick: { startFreq: 60, endFreq: 30, decay: 0.8 },
    snare: { toneFreq: 150, toneDecay: 0.2, noiseDecay: 0.25, noiseFilter: 800 },
    hihat: { filterFreq: 9000, closedDecay: 0.04, openDecay: 0.4 },
    tom: { startFreq: 120, endFreq: 50, decay: 0.5 }
  },
  tr909: {
    name: 'TR-909',
    kick: { startFreq: 180, endFreq: 35, decay: 0.25 },
    snare: { toneFreq: 220, toneDecay: 0.12, noiseDecay: 0.18, noiseFilter: 1500 },
    hihat: { filterFreq: 10000, closedDecay: 0.035, openDecay: 0.25 },
    tom: { startFreq: 250, endFreq: 70, decay: 0.35 }
  }
};

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.metronomeGain = null;
    this.drumsGain = null;
    this.trackPanner = null;  // Panner for MIDI track playback (left)
    this.userPanner = null;   // Panner for user input (right)

    // Audio effects
    this.reverbGain = null;
    this.reverbConvolver = null;
    this.toneFilter = null;
    this.dryGain = null;
    this.wetGain = null;

    this.metronomeVolume = 0.5;
    this.drumsVolume = 0.7;
    this.toneValue = 0.5;    // 0-1 for tone control
    this.reverbValue = 0;    // 0-1 for reverb mix

    this.currentKit = 'rock';
    this.initialized = false;
  }

  /**
   * Get available drum kits
   */
  static getKits() {
    return Object.entries(DRUM_KITS).map(([id, kit]) => ({
      id,
      name: kit.name
    }));
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

      // Create tone filter (lowpass for darker tone, bypass for brighter)
      this.toneFilter = this.audioContext.createBiquadFilter();
      this.toneFilter.type = 'lowpass';
      this.updateToneFilter();

      // Create reverb using convolver with generated impulse response
      await this.createReverb();

      // Create dry/wet mix for reverb
      this.dryGain = this.audioContext.createGain();
      this.wetGain = this.audioContext.createGain();
      this.updateReverbMix();

      // Create stereo panners for track (left) and user input (right)
      this.trackPanner = this.audioContext.createStereoPanner();
      this.trackPanner.pan.value = -1;  // Hard left
      // Route: trackPanner -> toneFilter -> dryGain/wetGain -> drumsGain
      this.trackPanner.connect(this.toneFilter);

      this.userPanner = this.audioContext.createStereoPanner();
      this.userPanner.pan.value = 1;   // Hard right
      this.userPanner.connect(this.toneFilter);

      // Tone filter splits to dry and wet paths
      this.toneFilter.connect(this.dryGain);
      this.toneFilter.connect(this.reverbConvolver);
      this.reverbConvolver.connect(this.wetGain);

      // Both dry and wet connect to drums gain
      this.dryGain.connect(this.drumsGain);
      this.wetGain.connect(this.drumsGain);

      // Connect drums gain to destination
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
   * Create reverb impulse response
   */
  async createReverb() {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * 1.5; // 1.5 second reverb
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with some randomness for natural sound
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    this.reverbConvolver = this.audioContext.createConvolver();
    this.reverbConvolver.buffer = impulse;
  }

  /**
   * Update tone filter based on tone value
   */
  updateToneFilter() {
    if (!this.toneFilter) return;
    // Map 0-1 to 1000Hz-20000Hz (darker to brighter)
    const minFreq = 1000;
    const maxFreq = 20000;
    this.toneFilter.frequency.value = minFreq + (this.toneValue * (maxFreq - minFreq));
  }

  /**
   * Update reverb dry/wet mix
   */
  updateReverbMix() {
    if (!this.dryGain || !this.wetGain) return;
    // Crossfade between dry and wet
    this.dryGain.gain.value = 1 - (this.reverbValue * 0.5);
    this.wetGain.gain.value = this.reverbValue;
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
    const kit = DRUM_KITS[this.currentKit];
    const params = kit.kick;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Pitch envelope using kit parameters
    osc.frequency.setValueAtTime(params.startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, time + 0.1);

    // Amplitude envelope
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + params.decay);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + params.decay);
  }

  /**
   * Synthesize snare drum sound
   */
  playSnare(time, velocity, destination) {
    const kit = DRUM_KITS[this.currentKit];
    const params = kit.snare;

    // Tone component
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(params.toneFreq, time);
    osc.frequency.exponentialRampToValueAtTime(params.toneFreq * 0.5, time + 0.1);

    oscGain.gain.setValueAtTime(velocity * 0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + params.toneDecay);

    osc.connect(oscGain);
    oscGain.connect(destination);

    // Noise component
    const bufferSize = this.audioContext.sampleRate * params.noiseDecay;
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
    noiseFilter.frequency.value = params.noiseFilter;

    noiseGain.gain.setValueAtTime(velocity * 0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + params.noiseDecay);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    osc.start(time);
    osc.stop(time + params.toneDecay);
    noise.start(time);
  }

  /**
   * Synthesize hi-hat sound
   */
  playHiHat(time, velocity, isOpen, destination) {
    const kit = DRUM_KITS[this.currentKit];
    const params = kit.hihat;

    const duration = isOpen ? params.openDecay : params.closedDecay;
    const bufferSize = this.audioContext.sampleRate * duration;
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
    filter.frequency.value = params.filterFreq;

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
    const kit = DRUM_KITS[this.currentKit];
    const params = kit.tom;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(params.startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(params.endFreq, time + 0.2);

    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + params.decay);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + params.decay);
  }

  /**
   * Set current drum kit
   * @param {string} kitId - Kit identifier (rock, funk, tr808, tr909)
   */
  setKit(kitId) {
    if (DRUM_KITS[kitId]) {
      this.currentKit = kitId;
    }
  }

  /**
   * Get current drum kit
   * @returns {string} Current kit identifier
   */
  getKit() {
    return this.currentKit;
  }

  /**
   * Set tone control (brightness)
   * @param {number} value - 0-1 (darker to brighter)
   */
  setTone(value) {
    this.toneValue = Math.max(0, Math.min(1, value));
    this.updateToneFilter();
  }

  /**
   * Get tone value
   * @returns {number} Tone value 0-1
   */
  getTone() {
    return this.toneValue;
  }

  /**
   * Set reverb amount
   * @param {number} value - 0-1 (dry to wet)
   */
  setReverb(value) {
    this.reverbValue = Math.max(0, Math.min(1, value));
    this.updateReverbMix();
  }

  /**
   * Get reverb value
   * @returns {number} Reverb value 0-1
   */
  getReverb() {
    return this.reverbValue;
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
