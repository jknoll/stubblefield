<script>
  import {
    metronomeVolume,
    drumsVolume,
    kit,
    tone,
    reverb,
    debounce,
    debounceDisplay,
    debounceFiltered,
    setMetronomeVolume,
    setDrumsVolume,
    setKit,
    setTone,
    setReverb,
    setDebounce
  } from '../stores/uiStore.js';

  function handleMetronomeVolume(e) {
    setMetronomeVolume(parseInt(e.target.value));
  }

  function handleDrumsVolume(e) {
    setDrumsVolume(parseInt(e.target.value));
  }

  function handleKitChange(e) {
    setKit(e.target.value);
  }

  function handleTone(e) {
    setTone(parseInt(e.target.value));
  }

  function handleReverb(e) {
    setReverb(parseInt(e.target.value));
  }

  function handleDebounce(e) {
    setDebounce(parseInt(e.target.value));
  }

  // Update CSS custom properties for dial visuals
  $: toneStyle = `--dial-value: ${$tone}`;
  $: reverbStyle = `--dial-value: ${$reverb}`;
</script>

<section class="settings-row">
  <div class="setting-group" title="Select drum kit sound (Classic Rock, Soul/Funk, TR-808, TR-909)">
    <label for="kit-select">Kit</label>
    <select
      id="kit-select"
      value={$kit}
      on:change={handleKitChange}
    >
      <option value="rock">Classic Rock</option>
      <option value="funk">Soul/Funk</option>
      <option value="tr808">TR-808</option>
      <option value="tr909">TR-909</option>
    </select>
  </div>

  <div class="setting-group dial-group" title="Adjust drum tone/brightness (low filter). 0% = muffled, 100% = bright">
    <label for="tone-dial">Tone</label>
    <div class="dial-container">
      <input
        type="range"
        id="tone-dial"
        class="dial"
        min="0"
        max="100"
        value={$tone}
        step="1"
        style={toneStyle}
        on:input={handleTone}
      />
      <span class="dial-label" id="tone-display">{$tone}%</span>
    </div>
  </div>

  <div class="setting-group dial-group" title="Add room reverb/ambiance to drum sounds. 0% = dry, 100% = wet">
    <label for="reverb-dial">Room</label>
    <div class="dial-container">
      <input
        type="range"
        id="reverb-dial"
        class="dial"
        min="0"
        max="100"
        value={$reverb}
        step="1"
        style={reverbStyle}
        on:input={handleReverb}
      />
      <span class="dial-label" id="reverb-display">{$reverb}%</span>
    </div>
  </div>

  <div class="setting-group" title="Volume of the click track that plays on each beat">
    <label for="metronome-volume">Metronome</label>
    <input
      type="range"
      id="metronome-volume"
      min="0"
      max="100"
      value={$metronomeVolume}
      step="1"
      on:input={handleMetronomeVolume}
    />
    <span id="metronome-volume-display">{$metronomeVolume}%</span>
  </div>

  <div class="setting-group" title="Volume of the backing drum track (pattern playback)">
    <label for="drums-volume">Track</label>
    <input
      type="range"
      id="drums-volume"
      min="0"
      max="100"
      value={$drumsVolume}
      step="1"
      on:input={handleDrumsVolume}
    />
    <span id="drums-volume-display">{$drumsVolume}%</span>
  </div>

  <div class="setting-group debounce-group">
    <label
      for="debounce-slider"
      title="Filters rapid double-triggers from drum pads. Increase if you hear ghost notes."
    >
      Debounce
    </label>
    <input
      type="range"
      id="debounce-slider"
      min="0"
      max="100"
      value={$debounce}
      step="5"
      on:input={handleDebounce}
    />
    <span id="debounce-display">{$debounceDisplay}</span>
    <span id="debounce-stats" class="debounce-stats">
      {#if $debounceFiltered > 0}
        ({$debounceFiltered} double-triggers filtered)
      {/if}
    </span>
  </div>
</section>

<style>
  /* Styles inherited from main.css */
</style>
