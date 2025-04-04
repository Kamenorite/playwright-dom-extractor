/**
 * Interactive demo of the natural language description matcher
 * Shows how different types of descriptions can be used to find elements
 */

import * as readline from 'readline';
import { getElementByDescription, clearMappingCache, getAllSemanticKeys } from '../utils/semantic-helper';

// Path to the test mappings
const MAPPING_PATH = __dirname + '/test-data/mappings';

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=== Natural Language Description Demo ===");
console.log("This demonstrates how describing UI elements in natural language can be used to find selectors");
console.log("Type a description of an element to see how it maps to a selector.");
console.log("Try examples like 'username input', 'submit button', 'login text field', etc.");
console.log("Type 'quit' or 'exit' to end the demo.");
console.log();

// Clear the mapping cache to ensure a fresh start
clearMappingCache();

// Store all available keys for reference
let allKeys: Array<{key: string, description: string}> = [];

// Load the mapping keys
getAllSemanticKeys(MAPPING_PATH).then(keys => {
  allKeys = keys;
  
  console.log(`Loaded ${keys.length} semantic keys from test mappings`);
  console.log("Available keys (first 5 shown):");
  keys.slice(0, 5).forEach(item => {
    console.log(`- ${item.key}: ${item.description}`);
  });
  console.log("...");
  console.log();
  
  // Start the interactive demo
  promptUser();
});

function promptUser() {
  rl.question("> ", async (query) => {
    if (query.toLowerCase() === 'quit' || query.toLowerCase() === 'exit') {
      rl.close();
      return;
    }
    
    try {
      // Get the selector using the natural language description
      const selector = await getElementByDescription(query, undefined, MAPPING_PATH);
      
      console.log(`\nUsing description: "${query}"`);
      console.log(`Found selector: ${selector}`);
      console.log();
    } catch (error) {
      console.log(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    promptUser();
  });
}

// Display help message showing examples
console.log("=== Example usage in Playwright tests ===");
console.log("Instead of hardcoded selectors or exact semantic keys:");
console.log(`const usernameField = await getElementByDescription('username input');`);
console.log(`const passwordField = await getElementByDescription('password input');`);
console.log(`const submitButton = await getElementByDescription('login button');`);
console.log();
console.log("Or with the page.locator wrapper for direct use:");
console.log(`const usernameField = await getByDescription(page, 'username');`);
console.log(`const passwordField = await getByDescription(page, 'password');`);
console.log(`const submitButton = await getByDescription(page, 'submit');`);
console.log();
console.log("Natural language alternatives work too:");
console.log(`const submitButton = await getByDescription(page, 'sign in button');`);
console.log();
console.log("Type a description to try:"); 