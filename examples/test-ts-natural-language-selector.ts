import { getElementByDescription, clearMappingCache } from '../utils/semantic-helper';
import * as path from 'path';

// Clear cache to ensure fresh start
clearMappingCache();

interface Test {
  name: string;
  query: string;
  expected?: string;
}

const MAPPING_PATH = path.resolve(__dirname, 'test-data/mappings');

// Define tests
const tests: Test[] = [
  {
    name: 'Simple natural language description',
    query: 'username input',
    expected: '[data-testid="username-input"]'
  },
  {
    name: 'Button description',
    query: 'login button',
    expected: '[data-testid="login-button"]'
  },
  {
    name: 'Alternative description',
    query: 'sign in button',
    expected: '[data-testid="login-button"]' 
  },
  {
    name: 'Field with context',
    query: 'email field',
    expected: '[data-testid="email-input"]'
  }
];

async function runTests() {
  console.log('Running natural language description tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`TEST: ${test.name}`);
      console.log(`Description: "${test.query}"`);
      
      const selector = await getElementByDescription(test.query, undefined, MAPPING_PATH);
      
      console.log(`Found selector: ${selector}`);
      
      if (test.expected && selector === test.expected) {
        console.log('✅ PASSED: Selector matches expected value');
        passed++;
      } else if (test.expected) {
        console.log(`❌ FAILED: Expected "${test.expected}" but got "${selector}"`);
        failed++;
      } else {
        console.log('⚠️ WARNING: No expected value provided, skipping validation');
      }
    } catch (error) {
      console.log(`❌ FAILED: Error - ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
    
    console.log('-------------------\n');
  }
  
  console.log(`Test results: ${passed} passed, ${failed} failed`);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
}); 