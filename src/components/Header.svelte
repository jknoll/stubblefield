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
  <div class="header-logo-container">
    <img src="/img/groovelab.jpg" alt="GrooveLab" class="header-logo" />
  </div>
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
  .header-logo-container {
    height: 60px;
    width: 240px;
    overflow: hidden;
    position: relative;
    -webkit-mask-image:
      linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%),
      linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
    mask-image:
      linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%),
      linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }

  .header-logo {
    position: absolute;
    height: 140px;
    width: auto;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
