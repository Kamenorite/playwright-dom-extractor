import minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import { DOMMonitor } from './dom-monitor';

async function main() {
  console.log('Starting URL processor...');
  
  const args = minimist(process.argv.slice(2));
  console.log('Args:', args);
  
  // Print help if requested or if no args provided
  if (args.help || !args.url) {
    console.log('Usage:');
    console.log('  npx ts-node process-single-url.ts --url=<url> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --url              URL to process (required)');
    console.log('  --output-path      Output directory for mappings (default: ./mappings)');
    console.log('  --feature-name     Feature name for better organization (optional)');
    console.log('  --wait-time        Wait time in ms after page load (default: 3000)');
    console.log('  --no-screenshots   Disable screenshot generation');
    console.log('  --help             Show this help message');
    process.exit(0);
  }
  
  const url = args.url;
  const outputPath = args['output-path'] || './mappings';
  const waitTime = args['wait-time'] || 3000;
  const skipScreenshots = args['no-screenshots'] || false;
  const featureName = args['feature-name'];
  
  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(`Created output directory: ${outputPath}`);
  }
  
  console.log(`Processing URL: ${url}`);
  if (featureName) {
    console.log(`Feature name: ${featureName}`);
  }
  
  try {
    console.log('Creating DOMMonitor instance...');
    const domMonitor = new DOMMonitor({
      outputPath,
      waitTimeout: waitTime,
      featureName
    });
    
    console.log('Initializing browser...');
    await domMonitor.init();
    
    console.log(`Navigating to ${url}...`);
    await domMonitor.navigateTo(url);
    
    // Wait for page to be fully loaded
    console.log('Waiting for page to load completely...');
    try {
      await domMonitor.waitForNetworkIdle();
      await domMonitor.waitForTimeout(waitTime);
      console.log('Page loaded successfully');
    } catch (error) {
      console.log('Wait timeout, continuing anyway');
    }
    
    console.log('Extracting DOM elements...');
    let elements = await domMonitor.extractDOMElements();
    console.log(`Found ${elements.length} elements`);
    
    console.log('Generating semantic keys with MCP...');
    elements = await domMonitor.generateSemanticKeys(elements);
    console.log(`Generated semantic keys for ${elements.length} elements`);
    
    console.log('Saving reports...');
    const reports = await domMonitor.saveReport(url, elements);
    console.log(`Reports saved:`);
    console.log(`- JSON: ${reports.jsonPath}`);
    console.log(`- HTML: ${reports.htmlPath}`);
    
    // Take a screenshot for reference, if not disabled
    if (!skipScreenshots) {
      console.log('Taking screenshot...');
      const screenshotFilename = featureName ? 
        `${featureName.toLowerCase()}_screenshot.png` : 
        `screenshot_${new Date().getTime()}.png`;
      await domMonitor.takeScreenshot(path.join(outputPath, screenshotFilename), true, skipScreenshots);
      console.log(`Screenshot saved as: ${screenshotFilename}`);
    }
    
    console.log('Closing browser...');
    await domMonitor.close();
    console.log('Processing completed successfully!');
  } catch (error) {
    console.error(`Error processing ${url}:`, error);
    process.exit(1);
  }
}

console.log('Script loaded, starting main function...');
main().catch(error => {
  console.error('Error in main function:', error);
  process.exit(1);
}); 