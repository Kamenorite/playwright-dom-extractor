/**
 * DOM Extractor Demo
 * 
 * This script demonstrates how to use the DOM Extractor to extract elements from a web page
 * and generate semantic keys for them.
 */

const { chromium } = require('playwright');
const { DOMMonitor } = require('../dist/dom-monitor');
const path = require('path');
const fs = require('fs');

async function runDemo() {
  console.log('\n🔍 DOM Extractor Demo');
  console.log('====================\n');

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '../demo-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Initialize DOMMonitor with options
  const domMonitor = new DOMMonitor({
    useAI: false, // Set to true to use AI-powered key generation (requires API key or MCP)
    useMCP: false, // Set to true to use Cursor MCP integration
    outputPath: outputDir,
    waitTimeout: 3000,
    featureName: 'demo', // Optional: provide a feature name for context
    takeScreenshot: true,
    includeHidden: false,
    verbose: true
  });

  // Launch browser and page
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to demo page
    console.log('Step 1: Navigating to demo page...');
    await page.goto('https://example.com');
    
    // Initialize DOMMonitor
    await domMonitor.init();
    await domMonitor.navigateTo('https://example.com');
    
    // Step 2: Extract DOM elements
    console.log('Step 2: Extracting DOM elements...');
    const elements = await domMonitor.extractDOMElements(page, context);
    console.log(`Extracted ${elements.length} elements`);
    
    // Step 3: Generate semantic keys
    console.log('Step 3: Generating semantic keys...');
    const elementsWithKeys = await domMonitor.generateSemanticKeys(elements, 'https://example.com');
    console.log(`Generated semantic keys for ${elementsWithKeys.length} elements`);
    
    // Step 4: Save mapping to file
    console.log('Step 4: Saving mapping to output directory...');
    await domMonitor.saveOutput(elementsWithKeys, 'https://example.com');
    
    console.log('\nDemo complete! Output saved to:', outputDir);
    console.log('Generated files:');
    console.log(` - ${path.join(outputDir, 'demo_example_com_.json')}`);
    console.log(` - ${path.join(outputDir, 'demo_example_com_.html')}`);
    console.log(` - ${path.join(outputDir, 'demo_example_com_.png')}`);
    
    // Bonus: Custom semantic key generation example
    console.log('\n🔍 Bonus: Example of custom semantic key generation');
    console.log('------------------------------------------------');
    for (let i = 0; i < 5 && i < elementsWithKeys.length; i++) {
      const element = elementsWithKeys[i];
      console.log(`Element: ${element.tagName} - Key: ${element.semanticKey || 'No key generated'}`);
      console.log(`  ID: ${element.id || 'none'}`);
      console.log(`  Classes: ${element.classes?.join(', ') || 'none'}`);
      console.log(`  Text: ${element.innerText?.substring(0, 30) || 'none'}${element.innerText?.length > 30 ? '...' : ''}`);
      console.log('  -----------------');
    }
  } catch (error) {
    console.error('Error in demo:', error);
  } finally {
    // Clean up
    await browser.close();
  }
}

// Run the demo
runDemo().catch(console.error); 