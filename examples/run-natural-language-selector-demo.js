/**
 * Helper script to run the smart selector demo with ts-node
 */

const { execSync } = require('child_process');
const path = require('path');

// Get the project root
const projectRoot = __dirname;

console.log('Starting Smart Selector Demo...');
console.log(`Project root: ${projectRoot}`);
console.log('------------------------------');

try {
  // Run the TypeScript file with ts-node
  const result = execSync('npx ts-node show-natural-language-selector-demo.ts', {
    cwd: projectRoot,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Error running the demo:', error.message);
  process.exit(1);
} 