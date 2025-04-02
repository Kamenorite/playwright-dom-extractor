import { AIService } from './services/ai-service';
import * as fs from 'fs';

// Parse command line arguments
const useDirectPlaywright = process.argv.includes('--direct');

async function testDOMExtraction() {
  console.log('Initializing AIService...');
  const aiService = new AIService({
    useDirectPlaywright
  });

  const testUrl = 'https://example.com';
  console.log(`Extracting DOM elements and generating semantic keys for: ${testUrl}`);
  
  if (useDirectPlaywright) {
    console.log('Using direct Playwright approach (command line flag --direct)');
  } else {
    console.log('Using Cursor MCP integration (to use direct approach, add --direct flag)');
  }

  try {
    // Using the main method that selects the appropriate implementation
    const mappings = await aiService.generateSemanticKeysForPage(testUrl);

    if (mappings && mappings.length > 0) {
      console.log('Successfully extracted elements and generated semantic keys:');
      console.log(JSON.stringify(mappings, null, 2));
      
      // Save the mappings to a file for reference
      const outputFile = useDirectPlaywright 
        ? 'direct-playwright-results.json'
        : 'cursor-mcp-results.json';
        
      fs.writeFileSync(outputFile, JSON.stringify(mappings, null, 2));
      console.log(`Results saved to ${outputFile}`);
    } else {
      console.log('Received empty or no mappings. Check logs for errors.');
    }
  } catch (error: any) {
    console.error('Error during DOM extraction test:', error.message || error);
    console.error('Stack Trace:', error.stack);
  }
}

// Run the test
testDOMExtraction().catch(err => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
}); 