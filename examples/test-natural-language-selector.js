// For ESM compatibility, we need to use require with a custom extension
const { createRequire } = require('module');
const appRequire = createRequire(import.meta.url);
const path = require('path');
const fs = require('fs');

// Initialize mappings directory to point to our test data
process.env.MAPPING_PATH = path.join(__dirname, 'mappings');

console.log('🧪 NATURAL LANGUAGE SELECTOR TEST\n');
console.log(`Using mapping path: ${process.env.MAPPING_PATH}`);

// Load mapping files manually to avoid dynamic import issues
const mappingFiles = fs.readdirSync(process.env.MAPPING_PATH)
  .filter(file => file.endsWith('.json'))
  .map(file => path.join(process.env.MAPPING_PATH, file));

console.log(`Found mapping files: ${mappingFiles.join(', ')}`);

// Manually load the semantic helper module
const semanticHelperPath = path.join(__dirname, 'utils', 'semantic-helper.ts');
console.log(`Loading semantic helper from: ${semanticHelperPath}`);

// Use ts-node to run the test with TypeScript support
require('child_process').execSync(`npx ts-node test-ts-smart-selector.ts`, { 
  stdio: 'inherit',
  env: {
    ...process.env,
    MAPPING_PATH: process.env.MAPPING_PATH
  }
}); 