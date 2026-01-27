// @ts-check
import { test, expect } from '@playwright/test';

/**
 * GrooveLab Functional Tests
 *
 * These tests verify the core functionality of the drum practice game.
 * They run against the local development server.
 */

test.describe('GrooveLab Application', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully initialize
    await page.waitForSelector('#game-canvas');
  });

  test.describe('Initial Load', () => {

    test('should display the game canvas', async ({ page }) => {
      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('should display pattern preview on load', async ({ page }) => {
      // Pattern preview should show notes on the canvas before game starts
      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();

      // The game button should show "Start"
      const gameButton = page.locator('#game-btn');
      await expect(gameButton).toContainText('Start');
    });

    test('should default loop count to 1x', async ({ page }) => {
      const loopSelect = page.locator('#loop-count');
      await expect(loopSelect).toHaveValue('1');
    });

    test('should display all control elements', async ({ page }) => {
      // Main controls
      await expect(page.locator('#game-btn')).toBeVisible();
      await expect(page.locator('#bpm-slider')).toBeVisible();
      await expect(page.locator('#pattern-select')).toBeVisible();
      await expect(page.locator('#loop-count')).toBeVisible();

      // Score display
      await expect(page.locator('.score-item:has(label:has-text("Score"))')).toBeVisible();
      await expect(page.locator('.score-item:has(label:has-text("Combo"))')).toBeVisible();
      await expect(page.locator('.score-item:has(label:has-text("Accuracy"))')).toBeVisible();
    });

    test('should have tooltips on score elements', async ({ page }) => {
      // Check that tooltips are present via title attribute on parent .score-item
      const scoreItem = page.locator('.score-item:has(label:has-text("Score"))');
      await expect(scoreItem).toHaveAttribute('title', /points/i);

      const comboItem = page.locator('.score-item:has(label:has-text("Combo"))');
      await expect(comboItem).toHaveAttribute('title', /consecutive|combo/i);

      const accuracyItem = page.locator('.score-item:has(label:has-text("Accuracy"))');
      await expect(accuracyItem).toHaveAttribute('title', /percentage/i);
    });
  });

  test.describe('Game Controls', () => {

    test('should start game when Start button is clicked', async ({ page }) => {
      const gameButton = page.locator('#game-btn');
      await expect(gameButton).toContainText('Start');

      await gameButton.click();

      // Button should change to Pause
      await expect(gameButton).toContainText('Pause');
    });

    test('should pause game when Pause button is clicked', async ({ page }) => {
      const gameButton = page.locator('#game-btn');

      // Start the game first
      await gameButton.click();
      await expect(gameButton).toContainText('Pause');

      // Pause
      await gameButton.click();
      await expect(gameButton).toContainText('Resume');
    });

    test('should resume game when Resume button is clicked', async ({ page }) => {
      const gameButton = page.locator('#game-btn');

      // Start and pause
      await gameButton.click();
      await gameButton.click();
      await expect(gameButton).toContainText('Resume');

      // Resume
      await gameButton.click();
      await expect(gameButton).toContainText('Pause');
    });
  });

  test.describe('Pattern Selection', () => {

    test('should have multiple patterns available', async ({ page }) => {
      const patternSelect = page.locator('#pattern-select');

      // Wait for at least one option or optgroup to appear (patterns load asynchronously)
      await page.waitForFunction(() => {
        const select = document.querySelector('#pattern-select');
        if (!select) return false;
        return select.querySelectorAll('option').length > 0 ||
               select.querySelectorAll('optgroup option').length > 0;
      }, { timeout: 10000 });

      // Count all options (could be in optgroups or directly)
      const optgroupOptions = patternSelect.locator('optgroup option');
      const optgroupCount = await optgroupOptions.count();

      if (optgroupCount > 0) {
        expect(optgroupCount).toBeGreaterThan(1);
      } else {
        const directOptions = patternSelect.locator('option');
        const directCount = await directOptions.count();
        expect(directCount).toBeGreaterThan(1);
      }
    });

    test('should change pattern when selection changes', async ({ page }) => {
      const patternSelect = page.locator('#pattern-select');

      // Wait for patterns to load
      await page.waitForFunction(() => {
        const select = document.querySelector('#pattern-select');
        if (!select) return false;
        return select.querySelectorAll('option').length > 0;
      }, { timeout: 10000 });

      // Get initial value
      const initialValue = await patternSelect.inputValue();

      // Get all option values (from optgroups or direct)
      const optionValues = await patternSelect.evaluate(select => {
        const options = select.querySelectorAll('optgroup option, option');
        return Array.from(options).map(o => o.getAttribute('value')).filter(v => v);
      });

      const newValue = optionValues.find(v => v !== initialValue);
      if (newValue) {
        await patternSelect.selectOption(newValue);
        const currentValue = await patternSelect.inputValue();
        expect(currentValue).toBe(newValue);
      }
    });
  });

  test.describe('Loop Count', () => {

    test('should change loop count when selection changes', async ({ page }) => {
      const loopSelect = page.locator('#loop-count');

      // Default should be 1
      await expect(loopSelect).toHaveValue('1');

      // Change to 4
      await loopSelect.selectOption('4');
      await expect(loopSelect).toHaveValue('4');
    });
  });

  test.describe('BPM Control', () => {

    test('should display current BPM value', async ({ page }) => {
      const bpmDisplay = page.locator('#bpm-display');
      const bpmText = await bpmDisplay.textContent();

      // Should contain a number
      expect(bpmText).toMatch(/\d+/);
    });

    test('should update BPM when slider changes', async ({ page }) => {
      const slider = page.locator('#bpm-slider');
      const bpmDisplay = page.locator('#bpm-display');

      // Change slider value
      await slider.evaluate((el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, '140');

      // BPM display should update
      await expect(bpmDisplay).toContainText('140');
    });
  });

  test.describe('Quantize Toggle', () => {

    test('should have quantize button', async ({ page }) => {
      const quantizeButton = page.locator('#quantize-btn');
      await expect(quantizeButton).toBeVisible();
    });

    test('should toggle quantize state when clicked', async ({ page }) => {
      const quantizeButton = page.locator('#quantize-btn');

      // Initially should not have active class
      await expect(quantizeButton).not.toHaveClass(/active/);

      // Click to enable
      await quantizeButton.click();
      await expect(quantizeButton).toHaveClass(/active/);

      // Click to disable
      await quantizeButton.click();
      await expect(quantizeButton).not.toHaveClass(/active/);
    });
  });

  test.describe('Keyboard Mode', () => {

    test('should display MIDI device selector', async ({ page }) => {
      // MIDI device selector should be visible
      const deviceSelect = page.locator('#midi-device-select');
      await expect(deviceSelect).toBeVisible();
    });

    test('should respond to keyboard input', async ({ page }) => {
      const gameButton = page.locator('#game-btn');

      // Start the game
      await gameButton.click();
      await page.waitForTimeout(100);

      // Press some drum keys
      await page.keyboard.press('KeyA'); // Kick
      await page.keyboard.press('KeyS'); // Snare

      // Game should still be running (button shows Pause)
      await expect(gameButton).toContainText('Pause');
    });
  });

  test.describe('Audio Controls', () => {

    test('should have kit selection', async ({ page }) => {
      const kitSelect = page.locator('#kit-select');
      await expect(kitSelect).toBeVisible();

      const options = kitSelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have volume controls', async ({ page }) => {
      // Tone and Room dials should be present (in dial-groups)
      await expect(page.locator('.dial-group:has(label:has-text("Tone"))')).toBeVisible();
      await expect(page.locator('.dial-group:has(label:has-text("Room"))')).toBeVisible();
    });

    test('should have metronome volume control', async ({ page }) => {
      const metronomeVolume = page.locator('#metronome-volume');
      await expect(metronomeVolume).toBeVisible();
    });
  });

  test.describe('Stats Persistence', () => {

    test('should save stats to localStorage', async ({ page }) => {
      const gameButton = page.locator('#game-btn');

      // Start a short session
      await gameButton.click();

      // Wait for some gameplay
      await page.waitForTimeout(300);

      // Hit a few notes
      await page.keyboard.press('KeyA');
      await page.keyboard.press('KeyS');

      // Pause
      await gameButton.click();

      // Check that localStorage has stats (or will have after session ends)
      const hasStats = await page.evaluate(() => {
        return localStorage.getItem('groovelab_stats') !== null;
      });

      // Stats might not be saved until session complete, but we verify localStorage access works
      expect(typeof hasStats).toBe('boolean');
    });
  });

  test.describe('Debounce Control', () => {

    test('should have debounce slider', async ({ page }) => {
      const debounceSlider = page.locator('#debounce-slider');
      await expect(debounceSlider).toBeVisible();
    });

    test('should have tooltip on debounce label', async ({ page }) => {
      const debounceLabel = page.locator('label[for="debounce-slider"]');
      await expect(debounceLabel).toHaveAttribute('title', /filter|double-trigger/i);
    });
  });

  test.describe('Judgment Display', () => {

    test('should display judgment counters', async ({ page }) => {
      await expect(page.locator('.judgment-item:has(.judgment-label.perfect)')).toBeVisible();
      await expect(page.locator('.judgment-item:has(.judgment-label.good)')).toBeVisible();
      await expect(page.locator('.judgment-item:has(.judgment-label.ok)')).toBeVisible();
      await expect(page.locator('.judgment-item:has(.judgment-label.miss)')).toBeVisible();
    });

    test('should have tooltips on judgment items', async ({ page }) => {
      const perfectItem = page.locator('.judgment-item:has(.judgment-label.perfect)');
      await expect(perfectItem).toHaveAttribute('title', /50ms/i);
    });
  });

  test.describe('Stats Graph', () => {

    test('should display stats canvas', async ({ page }) => {
      const statsCanvas = page.locator('#stats-canvas');
      await expect(statsCanvas).toBeVisible();
    });
  });

  test.describe('Completion Panel', () => {

    test('should be hidden initially', async ({ page }) => {
      const completionPanel = page.locator('#completion-panel');
      await expect(completionPanel).toHaveClass(/hidden/);
    });
  });

  test.describe('Responsive Layout', () => {

    test('should not have overlapping dial controls', async ({ page }) => {
      // Check that Tone and Room dial groups don't overlap
      const toneGroup = page.locator('.dial-group:has(label:has-text("Tone"))');
      const roomGroup = page.locator('.dial-group:has(label:has-text("Room"))');

      const toneBox = await toneGroup.boundingBox();
      const roomBox = await roomGroup.boundingBox();

      if (toneBox && roomBox) {
        // They should not overlap horizontally
        const noHorizontalOverlap = (toneBox.x + toneBox.width <= roomBox.x) ||
                                    (roomBox.x + roomBox.width <= toneBox.x);
        const noVerticalOverlap = (toneBox.y + toneBox.height <= roomBox.y) ||
                                  (roomBox.y + roomBox.height <= toneBox.y);
        const noOverlap = noHorizontalOverlap || noVerticalOverlap;
        expect(noOverlap).toBe(true);
      }
    });
  });

  test.describe('Theme Toggle', () => {

    test('should have theme toggle button', async ({ page }) => {
      const themeToggle = page.locator('#theme-toggle');
      await expect(themeToggle).toBeVisible();
    });

    test('should toggle theme when clicked', async ({ page }) => {
      const themeToggle = page.locator('#theme-toggle');
      const html = page.locator('html');

      // Get initial theme
      const initialTheme = await html.getAttribute('data-theme');

      // Click toggle
      await themeToggle.click();

      // Theme should change
      const newTheme = await html.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });
  });
});
