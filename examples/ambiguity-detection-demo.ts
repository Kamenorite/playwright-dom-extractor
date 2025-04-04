/**
 * Demo to showcase ambiguity detection in the natural language description matcher
 * 
 * This script demonstrates how similar descriptions for different elements are handled
 * and how the system provides more specific alternatives when ambiguity is detected.
 * 
 * Run with: ts-node examples/ambiguity-detection-demo.ts
 */

import { chromium } from 'playwright';
import { getByDescription, clearMappingCache } from '../utils/semantic-helper';
import * as readline from 'readline';

/**
 * Interactive demo that shows ambiguity detection for element descriptions
 */
async function runAmbiguityDemo() {
  // Clear any existing cache to start fresh
  clearMappingCache();
  
  console.log('Starting ambiguity detection demo...');
  console.log('This demo will show how ambiguous element descriptions are handled.');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to a page with multiple similar elements
  await page.goto('https://todomvc.com/examples/vanillajs/');
  console.log('\nLoaded Todo MVC page');
  
  // Add multiple todos to create ambiguity
  await page.fill('.new-todo', 'Buy milk');
  await page.press('.new-todo', 'Enter');
  await page.fill('.new-todo', 'Buy eggs');
  await page.press('.new-todo', 'Enter');
  await page.fill('.new-todo', 'Buy bread');
  await page.press('.new-todo', 'Enter');
  
  console.log('\nAdded multiple todo items to create potential ambiguity');
  
  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Example descriptions that could lead to ambiguity
  const exampleDescriptions = [
    'todo item',
    'delete button',
    'checkbox',
    'list item',
    'buy item'
  ];
  
  console.log('\nExample descriptions you can try:');
  exampleDescriptions.forEach(desc => console.log(`- "${desc}"`));
  
  // Demo loop for testing element descriptions
  async function promptForDescription() {
    rl.question('\nEnter an element description (or "exit" to quit): ', async (answer) => {
      if (answer.toLowerCase() === 'exit') {
        await browser.close();
        rl.close();
        return;
      }
      
      try {
        // Try to get the element using the provided description
        const locator = await getByDescription(page, answer);
        
        // Highlight the matched element
        await locator.evaluate((el: HTMLElement) => {
          const originalBackground = el.style.backgroundColor;
          el.style.backgroundColor = 'lightgreen';
          el.style.outline = '2px solid green';
          
          setTimeout(() => {
            el.style.backgroundColor = originalBackground;
            el.style.outline = '';
          }, 3000);
        });
        
        console.log('\nSuccessfully found a unique match!');
        console.log('Element is highlighted on the page for 3 seconds.');
      } catch (error: unknown) {
        // Special handling for ambiguity errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}`);
      }
      
      // Continue the demo loop
      promptForDescription();
    });
  }
  
  // Start the demo
  promptForDescription();
}

// Run the demo
runAmbiguityDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
}); 