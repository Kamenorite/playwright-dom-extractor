import minimist from 'minimist';
import { DOMMonitor } from './dom-monitor';
import path from 'path';

async function main() {
  const args = minimist(process.argv.slice(2));
  
  if (!args.url) {
    console.error('Error: URL is required');
    console.log('Usage: npm run dom-monitor -- --url https://example.com [options]');
    console.log('Options:');
    console.log('  --output-path      Specify output path for reports (default: ./mappings)');
    console.log('  --element-selector Specify custom element selector');
    console.log('  --wait-for         Wait for an element before capturing DOM');
    console.log('  --timeout          Wait timeout in milliseconds (default: 5000)');
    console.log('  --no-screenshots   Disable screenshot generation');
    console.log('  --feature-name     Add feature name prefix to semantic keys');
    process.exit(1);
  }

  const url = args.url;
  const skipScreenshots = args['no-screenshots'] || false;
  
  const options = {
    elementSelector: args['element-selector'],
    waitForSelector: args['wait-for'],
    waitTimeout: args.timeout ? parseInt(args.timeout) : 5000,
    outputPath: args['output-path'] || './mappings',
    featureName: args['feature-name']
  };

  try {
    console.log(`Starting DOM monitor for ${url}`);
    console.log('Options:', JSON.stringify({
      ...options,
      skipScreenshots
    }, null, 2));

    const monitor = new DOMMonitor(options);
    await monitor.init();
    await monitor.navigateTo(url);

    console.log('Extracting DOM elements...');
    let elements = await monitor.extractDOMElements();
    
    console.log('Generating semantic keys using Playwright MCP...');
    elements = await monitor.generateSemanticKeys(elements);

    console.log(`Found ${elements.length} elements`);
    
    const reports = await monitor.saveReport(url, elements);
    console.log(`Reports saved:`);
    console.log(`- JSON: ${reports.jsonPath}`);
    console.log(`- HTML: ${reports.htmlPath}`);

    // Take a screenshot if not disabled
    if (!skipScreenshots) {
      // Extract base filename from URL for screenshot
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/\./g, '_');
      const pathname = urlObj.pathname.replace(/\//g, '_');
      const screenshotPath = path.join(options.outputPath, `${hostname}${pathname}.png`);
      
      console.log('Taking screenshot...');
      await monitor.takeScreenshot(screenshotPath, true, skipScreenshots);
      console.log(`Screenshot saved: ${screenshotPath}`);
    } else {
      console.log('Screenshot generation skipped (--no-screenshots flag provided)');
    }

    await monitor.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 