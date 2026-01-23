// Main test file - imports and runs all tests

import { TestRunner, assert } from './testRunner.js';
import { registerTimingTests } from './timingTests.js';
import { registerScoringTests } from './scoringTests.js';
import { registerPatternTests } from './patternTests.js';
import { registerQuantizerTests } from './quantizerTests.js';

/**
 * Run all tests and display results
 */
export async function runAllTests() {
  const runner = new TestRunner();

  // Register all test suites
  registerTimingTests(runner);
  registerScoringTests(runner);
  registerPatternTests(runner);
  registerQuantizerTests(runner);

  // Run tests
  const results = await runner.run();

  // Display results
  const resultsDiv = document.getElementById('test-results');
  if (resultsDiv) {
    resultsDiv.innerHTML = runner.generateReport();
  }

  // Log to console
  console.log('='.repeat(50));
  console.log(`Tests complete: ${results.passed} passed, ${results.failed} failed`);

  if (results.errors.length > 0) {
    console.log('\nFailed tests:');
    for (const err of results.errors) {
      console.error(`  ${err.test}: ${err.error}`);
    }
  }

  return results;
}

// Export for potential programmatic access
export { TestRunner, assert };
