import minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import { updateSelectorIndex } from './utils/semantic-helper';

async function main() {
  const args = minimist(process.argv.slice(2));
  
  if (!args.url && !args['update-index']) {
    console.error('Error: URL is required');
    console.log('Usage: npm run update-semantic-index -- --url https://example.com');
    console.log('       npm run update-semantic-index -- --update-index');
    process.exit(1);
  }

  const outputPath = args['output-path'] || './mappings';
  
  // Ensure the output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  if (args['update-index']) {
    // Update index for all existing mapping files
    console.log('Updating semantic index for all mapping files...');
    
    const files = fs.readdirSync(outputPath).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(outputPath, file), 'utf-8'));
        if (data && data.length > 0 && data[0].url) {
          console.log(`Updating index for ${data[0].url}...`);
          await updateSelectorIndex(data[0].url, outputPath);
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
  } else {
    // Update index for the specified URL
    const url = args.url;
    console.log(`Updating semantic index for ${url}...`);
    
    const selectors = await updateSelectorIndex(url, outputPath);
    console.log(`Updated index with ${Object.keys(selectors).length} selectors`);
  }
  
  console.log('Done!');
}

main(); 