<script>
  import {
    theme,
    midiDevices,
    selectedDevice,
    selectMidiDevice,
    toggleTheme
  } from '../stores/uiStore.js';

  function handleDeviceChange(e) {
    selectMidiDevice(e.target.value);
  }

  function handleThemeToggle() {
    toggleTheme();
  }

  $: themeIcon = $theme === 'light' ? '☀️' : '🌙';
  $: statusClass = $midiDevices.length > 1 ? 'status-connected' : 'status-connected';
</script>

<header>
  <h1>GrooveLab</h1>
  <div class="header-controls">
    <!-- Theme Toggle -->
    <button
      id="theme-toggle"
      class="theme-toggle"
      title="Toggle light/dark mode"
      on:click={handleThemeToggle}
    >
      {themeIcon}
    </button>

    <!-- User Auth Status (placeholder - kept for compatibility) -->
    <div id="auth-status" class="auth-status">
      <button id="sign-in-btn" class="btn btn-auth">Sign In</button>
      <div id="user-info" class="user-info hidden">
        <img id="user-avatar" class="user-avatar" alt="User" />
        <span id="user-name">Guest</span>
        <button id="sign-out-btn" class="btn btn-auth-small">Sign Out</button>
      </div>
    </div>

    <!-- MIDI Status -->
    <div id="midi-status">
      <span id="midi-indicator" class={statusClass}>●</span>
      <select
        id="midi-device-select"
        value={$selectedDevice || ($midiDevices[0]?.id || 'keyboard')}
        on:change={handleDeviceChange}
      >
        {#each $midiDevices as device}
          <option value={device.id}>{device.name}</option>
        {/each}
      </select>
    </div>
  </div>
</header>

<style>
  /* Styles inherited from main.css */
</style>
