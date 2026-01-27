# Browser Testing with Playwright

## Overview

GrooveLab uses [Playwright](https://playwright.dev/) for automated browser testing. The test suite verifies core functionality including game controls, UI elements, pattern selection, audio controls, and responsive layout.

The tests run against the Vite development server and execute in headless Chromium by default. The test suite includes 30 tests covering:

- **Initial Load**: Game canvas, pattern preview, default settings, tooltips
- **Game Controls**: Start/Pause/Resume functionality
- **Pattern & Loop Selection**: Pattern changes, loop count updates
- **BPM Control**: Display and slider interactions
- **Quantize Toggle**: Toggle state management
- **Keyboard/MIDI Mode**: Device selector, keyboard input
- **Audio Controls**: Kit selection, Tone/Room dials, volume controls
- **Stats & Persistence**: Graph display, localStorage
- **UI Layout**: No overlapping controls, theme toggle

## Prerequisites

Playwright and Chromium are installed as dev dependencies. If you need to reinstall:

```bash
npm install
npx playwright install chromium
```

## Running Tests

### Headless (CI/default)
```bash
npm run test:e2e
```
Runs all tests in headless mode. Best for CI pipelines and quick verification.

### Headed Mode (visible browser)
```bash
npm run test:e2e:headed
```
Runs all tests in a visible Chrome window. Tests run at full speed.

### Slow Motion (easier to follow)
```bash
npx playwright test --headed --slowmo=500
```
Adds a 500ms delay between actions so you can observe each step clearly.

### Playwright UI (interactive debugging)
```bash
npm run test:e2e:ui
```
Opens Playwright's visual interface where you can:
- Run individual tests
- See screenshots at each step
- Time-travel through test execution
- View DOM snapshots
- Debug failing tests interactively

### Single Test
```bash
npx playwright test --headed "should start game"
```
Runs only tests matching the given name pattern.

### With Trace Recording
```bash
npx playwright test --headed --trace on "should start game"
```
Records a full trace you can inspect afterward with `npx playwright show-trace`.

## Viewing Reports

### HTML Report
After running tests, view the detailed HTML report:
```bash
npx playwright show-report
```
Opens a browser with screenshots, traces, and error details from the most recent run.

### Trace Viewer
If you recorded traces, view them with:
```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

## Test Configuration

Configuration is in `playwright.config.js`:

- **Test directory**: `./tests`
- **Base URL**: `http://localhost:8080`
- **Browser**: Chromium (Desktop Chrome)
- **Dev server**: Starts automatically via `npm run dev`

## Writing New Tests

Tests are located in `tests/groovelab.spec.js`. Example test structure:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-canvas');
  });

  test('should do something', async ({ page }) => {
    const element = page.locator('#my-element');
    await expect(element).toBeVisible();
    await element.click();
    await expect(element).toHaveClass(/active/);
  });
});
```

## Troubleshooting

### Tests timing out
- Ensure the dev server starts correctly (`npm run dev`)
- Check that selectors match current HTML structure
- Add explicit waits for async content: `await page.waitForSelector(...)`

### Element not found
- Use Playwright UI to inspect the DOM at test time
- Check for dynamic content that loads after initial render
- Verify element IDs/classes haven't changed

### Flaky tests
- Add appropriate waits for animations or async operations
- Use `expect(...).toBeVisible()` before interacting with elements
- Consider using `page.waitForFunction()` for complex conditions
