/**
 * Smart Selector Demonstration
 * 
 * This script demonstrates how to use the smart semantic selector
 * with different types of inputs.
 */

import * as path from 'path';
import { getSemanticSelector, clearMappingCache, getAllSemanticKeys } from '../utils/semantic-helper';

// Path to mappings
const MAPPING_PATH = path.resolve(__dirname, 'mappings');
console.log(`Using mapping path: ${MAPPING_PATH}`);

// Example queries to demonstrate smart selector capabilities
const queries = [
  'username',                // Simple partial key
  'password',                // Another partial key
  'submit',                  // Action-based partial key
  'login_',                  // Context prefix
  'sign in button',          // Descriptive terms
  'edit profile',            // Natural language description
  '*_input_*',               // Wildcard pattern
  'profile_*_bio',           // Context with wildcard
  'save button'              // Common button description
];

async function demonstrateSmart() {
  console.log('🔍 Smart Semantic Selector Demonstration\n');
  console.log('This demonstrates how intelligent matching works with the enhanced semantic selector.\n');
  
  // First, let's see what mapping files and keys we have
  console.log('--- Available Mapping Keys ---');
  try {
    const allKeys = await getAllSemanticKeys(MAPPING_PATH);
    console.log(`Found ${allKeys.length} semantic keys in mapping files:`);
    allKeys.slice(0, 10).forEach((key: { key: string; description: string }) => {
      console.log(`- ${key.key}: ${key.description}`);
    });
    if (allKeys.length > 10) {
      console.log(`... and ${allKeys.length - 10} more keys`);
    }
  } catch (error) {
    console.error('Error loading mappings:', error instanceof Error ? error.message : String(error));
  }
  
  console.log('\n--- Testing Smart Selector Queries ---\n');
  // Clear cache to ensure fresh lookups
  clearMappingCache();
  
  // Test each query and show the results
  for (const query of queries) {
    try {
      console.log(`Query: "${query}"`);
      const selector = await getSemanticSelector(query, undefined, MAPPING_PATH);
      console.log(`✅ Found: "${selector}"`);
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log('-------------------');
  }
  
  // Show a real-world example
  console.log('\n🌟 Real-World Example:\n');
  console.log('// Instead of writing this:');
  console.log(`const usernameField = await getSemanticSelector('login_text_input_username');`);
  console.log(`const passwordField = await getSemanticSelector('login_password_input');`);
  console.log(`const submitButton = await getSemanticSelector('login_submit_button');`);
  
  console.log('\n// You can now write this:');
  console.log(`const usernameField = await getSemanticSelector('username');`);
  console.log(`const passwordField = await getSemanticSelector('password');`);
  console.log(`const submitButton = await getSemanticSelector('submit');`);
  
  console.log('\n// Or even with natural language:');
  console.log(`const submitButton = await getSemanticSelector('sign in button');`);
}

// Run the demonstration
demonstrateSmart().catch(error => {
  console.error('Demonstration failed:', error);
}); 