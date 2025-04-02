import { getSemanticSelector, clearMappingCache } from '../utils/semantic-helper';
import * as path from 'path';
import * as fs from 'fs';

async function runTests() {
  console.log('🧪 SMART SEMANTIC SELECTOR TEST (TypeScript)\n');
  
  // Clear cache between test runs
  clearMappingCache();
  
  // Create an array of test cases
  const testCases = [
    // Basic partial key tests
    { description: 'Partial key (username)', query: 'username', expectedContains: 'login_text_input_username' },
    { description: 'Partial key (password)', query: 'password', expectedContains: 'login_password_input' },
    { description: 'Partial key (submit)', query: 'submit', expectedContains: 'login_submit_button' },
    
    // Context prefix tests
    { description: 'Context prefix (login_)', query: 'login_', expectedContains: 'login_' },
    { description: 'Context prefix with partial (profile_button)', query: 'profile_button', expectedContains: 'profile_button' },
    
    // Descriptive term tests
    { description: 'Descriptive terms (sign in button)', query: 'sign in button', expectedContains: 'login_submit_button' },
    { description: 'Descriptive terms (edit profile)', query: 'edit profile', expectedContains: 'profile_heading_main' },
    
    // Wildcard pattern tests
    { description: 'Wildcard pattern (*_input_*)', query: '*_input_*', expectedContains: '_input_' },
    { description: 'Wildcard pattern (profile_*_bio)', query: 'profile_*_bio', expectedContains: 'profile_textarea_bio' },
    
    // Feature specific tests from different contexts
    { description: 'Feature specific (name input)', query: 'name', expectedContains: 'profile_text_input_name' },
    { description: 'Feature specific (save button)', query: 'save', expectedContains: 'profile_button_save' }
  ];
  
  // Run each test case
  let passCount = 0;
  let failCount = 0;
  
  for (const test of testCases) {
    try {
      console.log(`Testing: ${test.description}`);
      const selector = await getSemanticSelector(test.query);
      
      // Check if the selector contains the expected string
      if (selector.includes(test.expectedContains)) {
        console.log(`✅ PASS: Got "${selector}"`);
        passCount++;
      } else {
        console.log(`❌ FAIL: Expected "${selector}" to contain "${test.expectedContains}"`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ FAIL: Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
    console.log('-------------------');
  }
  
  // Print summary
  console.log(`\n📊 TEST SUMMARY: ${passCount} passed, ${failCount} failed`);
  
  if (failCount === 0) {
    console.log('🎉 All tests passed! The smart selector system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. The smart selector system needs adjustment.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
}); 