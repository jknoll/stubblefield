// Simple in-browser test runner

export class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      testResults: []
    };
  }

  /**
   * Register a test
   * @param {string} name - Test name
   * @param {Function} fn - Test function (async supported)
   */
  test(name, fn) {
    this.tests.push({ name, fn });
  }

  /**
   * Run all registered tests
   * @returns {Object} Test results
   */
  async run() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      testResults: []
    };

    console.log(`Running ${this.tests.length} tests...`);

    for (const test of this.tests) {
      const result = {
        name: test.name,
        passed: false,
        error: null,
        duration: 0
      };

      const startTime = performance.now();

      try {
        await test.fn();
        result.passed = true;
        this.results.passed++;
      } catch (error) {
        result.passed = false;
        result.error = error.message;
        this.results.failed++;
        this.results.errors.push({
          test: test.name,
          error: error.message,
          stack: error.stack
        });
      }

      result.duration = performance.now() - startTime;
      this.results.testResults.push(result);
    }

    return this.results;
  }

  /**
   * Generate HTML report of test results
   * @returns {string} HTML report
   */
  generateReport() {
    const { passed, failed, testResults } = this.results;
    const total = passed + failed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    let html = `
      <div class="test-summary ${failed > 0 ? 'has-failures' : 'all-passed'}">
        <h2>Test Results</h2>
        <div class="stats">
          <span class="passed">${passed} passed</span>
          <span class="failed">${failed} failed</span>
          <span class="rate">${passRate}%</span>
        </div>
      </div>
      <div class="test-list">
    `;

    for (const result of testResults) {
      const statusClass = result.passed ? 'passed' : 'failed';
      const statusIcon = result.passed ? '✓' : '✗';
      html += `
        <div class="test-item ${statusClass}">
          <span class="status">${statusIcon}</span>
          <span class="name">${result.name}</span>
          <span class="duration">${result.duration.toFixed(1)}ms</span>
          ${result.error ? `<div class="error">${result.error}</div>` : ''}
        </div>
      `;
    }

    html += '</div>';
    return html;
  }
}

/**
 * Assertion helpers
 */
export const assert = {
  equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message ? message + ': ' : ''}Expected ${expected}, got ${actual}`);
    }
  },

  deepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message ? message + ': ' : ''}Objects not equal`);
    }
  },

  ok(value, message = '') {
    if (!value) {
      throw new Error(message || 'Expected truthy value');
    }
  },

  throws(fn, message = '') {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
  },

  async asyncThrows(fn, message = '') {
    let threw = false;
    try {
      await fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected async function to throw');
    }
  },

  closeTo(actual, expected, tolerance, message = '') {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(`${message ? message + ': ' : ''}${actual} not within ${tolerance} of ${expected}`);
    }
  },

  greaterThan(actual, expected, message = '') {
    if (actual <= expected) {
      throw new Error(`${message ? message + ': ' : ''}${actual} not greater than ${expected}`);
    }
  },

  lessThan(actual, expected, message = '') {
    if (actual >= expected) {
      throw new Error(`${message ? message + ': ' : ''}${actual} not less than ${expected}`);
    }
  }
};
