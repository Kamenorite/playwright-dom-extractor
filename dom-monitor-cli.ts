import minimist from 'minimist';
import { DOMMonitor } from './dom-monitor';
import { AIService } from './services/ai-service';

async function main() {
  const args = minimist(process.argv.slice(2));
  
  if (!args.url) {
    console.error('Error: URL is required');
    console.log('Usage: npm run dom-monitor -- --url https://example.com [options]');
    console.log('Options:');
    console.log('  --use-ai           Enable AI-powered semantic key generation');
    console.log('  --output-path      Specify output path for reports (default: ./mappings)');
    console.log('  --element-selector Specify custom element selector');
    console.log('  --wait-for         Wait for an element before capturing DOM');
    console.log('  --timeout          Wait timeout in milliseconds (default: 5000)');
    process.exit(1);
  }

  const url = args.url;
  const options = {
    useAI: args['use-ai'] || false,
    aiService: args['use-ai'] ? new AIService() : undefined,
    elementSelector: args['element-selector'],
    waitForSelector: args['wait-for'],
    waitTimeout: args.timeout ? parseInt(args.timeout) : 5000,
    outputPath: args['output-path'] || './mappings'
  };

  try {
    console.log(`Starting DOM monitor for ${url}`);
    console.log('Options:', JSON.stringify(options, null, 2));

    const monitor = new DOMMonitor(options);
    await monitor.init();
    await monitor.navigateTo(url);

    console.log('Extracting DOM elements...');
    let elements = await monitor.extractDOMElements();
    
    if (options.useAI) {
      console.log('Generating semantic keys with AI...');
      elements = await monitor.generateSemanticKeys(elements);
    }

    console.log(`Found ${elements.length} elements`);
    
    const reports = await monitor.saveReport(url, elements);
    console.log(`Reports saved:`);
    console.log(`- JSON: ${reports.jsonPath}`);
    console.log(`- HTML: ${reports.htmlPath}`);

    await monitor.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 