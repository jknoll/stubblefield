<script>
  import {
    uploadMidiFile,
    loadMidiFromUrl,
    uploadStatus,
    uploadError,
    clearUploadStatus,
    userPatterns,
    removeUploadedPattern,
    canChangeSettings
  } from '../stores/uiStore.js';

  let fileInput;
  let urlInput = '';
  let patternName = '';
  let showUrlInput = false;

  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      await uploadMidiFile(file);
      // Reset file input
      if (fileInput) fileInput.value = '';
    }
  }

  async function handleUrlLoad() {
    if (!urlInput.trim()) return;
    const name = patternName.trim() || 'URL Pattern';
    await loadMidiFromUrl(urlInput.trim(), name);
    // Reset inputs
    urlInput = '';
    patternName = '';
    showUrlInput = false;
  }

  function handleRemovePattern(patternId) {
    removeUploadedPattern(patternId);
  }

  function toggleUrlInput() {
    showUrlInput = !showUrlInput;
    if (!showUrlInput) {
      urlInput = '';
      patternName = '';
    }
  }
</script>

<div class="midi-upload">
  <div class="upload-controls">
    <input
      type="file"
      accept=".mid,.midi"
      bind:this={fileInput}
      on:change={handleFileSelect}
      disabled={!$canChangeSettings}
      id="midi-file-input"
      class="file-input"
    />
    <label for="midi-file-input" class="btn btn-small" class:disabled={!$canChangeSettings}>
      Upload MIDI
    </label>

    <button
      class="btn btn-small"
      on:click={toggleUrlInput}
      disabled={!$canChangeSettings}
    >
      {showUrlInput ? 'Cancel' : 'Load URL'}
    </button>
  </div>

  {#if showUrlInput}
    <div class="url-input-section">
      <input
        type="text"
        bind:value={patternName}
        placeholder="Pattern name (optional)"
        class="url-name-input"
        disabled={!$canChangeSettings}
      />
      <input
        type="url"
        bind:value={urlInput}
        placeholder="https://example.com/pattern.mid"
        class="url-input"
        disabled={!$canChangeSettings}
      />
      <button
        class="btn btn-small btn-primary"
        on:click={handleUrlLoad}
        disabled={!$canChangeSettings || !urlInput.trim()}
      >
        Load
      </button>
    </div>
  {/if}

  {#if $uploadStatus === 'loading'}
    <div class="upload-status loading">Loading MIDI file...</div>
  {:else if $uploadStatus === 'success'}
    <div class="upload-status success">
      Pattern loaded successfully!
      <button class="dismiss-btn" on:click={clearUploadStatus}>×</button>
    </div>
  {:else if $uploadStatus === 'error'}
    <div class="upload-status error">
      Error: {$uploadError}
      <button class="dismiss-btn" on:click={clearUploadStatus}>×</button>
    </div>
  {/if}

  {#if $userPatterns.length > 0}
    <div class="user-patterns">
      <span class="user-patterns-label">Your uploads:</span>
      {#each $userPatterns as pat}
        <span class="user-pattern-tag">
          {pat.name}
          <button
            class="remove-btn"
            on:click={() => handleRemovePattern(pat.id)}
            title="Remove pattern"
            disabled={!$canChangeSettings}
          >×</button>
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .midi-upload {
    margin: 10px 0;
    padding: 10px;
    background: var(--surface-bg);
    border-radius: 8px;
  }

  .upload-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .file-input {
    display: none;
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    background: var(--btn-bg);
    color: var(--btn-text);
    transition: background 0.2s;
  }

  .btn:hover:not(:disabled) {
    background: var(--btn-hover);
  }

  .btn:disabled, .btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
  }

  .url-input-section {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .url-input, .url-name-input {
    flex: 1;
    min-width: 150px;
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 12px;
  }

  .url-name-input {
    flex: 0 1 150px;
  }

  .upload-status {
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .upload-status.loading {
    background: var(--warning-bg, #fff3cd);
    color: var(--warning-text, #856404);
  }

  .upload-status.success {
    background: var(--success-bg, #d4edda);
    color: var(--success-text, #155724);
  }

  .upload-status.error {
    background: var(--error-bg, #f8d7da);
    color: var(--error-text, #721c24);
  }

  .dismiss-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.7;
    padding: 0 4px;
  }

  .dismiss-btn:hover {
    opacity: 1;
  }

  .user-patterns {
    margin-top: 10px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .user-patterns-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .user-pattern-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: var(--tag-bg, #e0e0e0);
    border-radius: 12px;
    font-size: 11px;
  }

  .remove-btn {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    opacity: 0.6;
    padding: 0;
    line-height: 1;
  }

  .remove-btn:hover:not(:disabled) {
    opacity: 1;
    color: var(--error-text, red);
  }

  .remove-btn:disabled {
    cursor: not-allowed;
  }
</style>
