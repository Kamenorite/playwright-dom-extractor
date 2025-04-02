import minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { AIService } from './services/ai-service';

interface SemanticMapping {
  tagName: string;
  id?: string;
  attributes: Record<string, string>;
  innerText?: string;
  xpath: string;
  semanticKey: string;
  featureName?: string;
  url?: string;
}

/**
 * Load all available semantic mappings
 */
function loadAllMappings(mappingsDir: string = './mappings'): SemanticMapping[] {
  const files = glob.sync(path.join(mappingsDir, '*.json'));
  const allMappings: SemanticMapping[] = [];
  
  files.forEach(file => {
    try {
      const mappings = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(mappings)) {
        allMappings.push(...mappings);
      }
    } catch (error) {
      console.error(`Error loading mapping file ${file}:`, error);
    }
  });
  
  return allMappings;
}

/**
 * Extract feature name from filename
 */
function getFeatureNameFromFilename(filePath: string): string {
  const basename = path.basename(filePath, '.txt');
  // Convert hyphen-case to PascalCase
  return basename
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Generate a Playwright test file from manual test instructions
 */
async function generateTest(
  manualTestPath: string, 
  outputDir: string = './tests', 
  mappingsDir: string = './mappings'
): Promise<string> {
  // Read manual test file
  const manualTestContent = fs.readFileSync(manualTestPath, 'utf-8');
  
  // Load all semantic mappings
  const allMappings = loadAllMappings(mappingsDir);
  
  // Extract feature name from filename
  const featureName = getFeatureNameFromFilename(manualTestPath);
  
  // Create AI service to help generate test
  const aiService = new AIService({
    useDirectPlaywright: false, // We're not actually browsing, just generating code
    apiKey: process.env.AI_API_KEY,
    endpoint: process.env.AI_API_ENDPOINT
  });
  
  // Generate test code using AI
  console.log(`Generating test for ${featureName}...`);
  
  try {
    // Prepare prompt for AI
    const prompt = `
      I need to convert a manual test to a Playwright test.
      
      # Manual Test:
      ${manualTestContent}
      
      # Available semantic mappings:
      ${allMappings.map(m => `- ${m.semanticKey}: ${m.tagName}${m.innerText ? ` with text "${m.innerText}"` : ''}`).join('\n')}
      
      Please generate a complete Playwright test file that implements the manual test.
      Use the semantic selectors from the mappings where possible.
      Import from '../utils/semantic-helper' to use the getSemanticSelector() function.
      Follow best practices for Playwright tests, including waiting for elements and assertions.
      The test should be in TypeScript and follow this structure:
      
      \`\`\`typescript
      import { test, expect } from '@playwright/test';
      import { getSemanticSelector } from '../utils/semantic-helper';
      
      test('${featureName} - test description', async ({ page }) => {
        // Test steps here
      });
      \`\`\`
    `;
    
    // Call AI service
    // This is a placeholder - implement the actual AI call according to your AIService implementation
    const testCode = await generateTestWithAI(prompt, aiService);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write test file
    const outputPath = path.join(outputDir, `${kebabCase(featureName)}.spec.ts`);
    fs.writeFileSync(outputPath, testCode);
    
    console.log(`Test file generated at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating test:', error);
    throw error;
  }
}

/**
 * Generate test with AI
 * This is a placeholder - replace with actual implementation
 */
async function generateTestWithAI(prompt: string, aiService: AIService): Promise<string> {
  // Check if environment variables are set instead of accessing private properties
  if (process.env.AI_API_KEY && process.env.AI_API_ENDPOINT) {
    try {
      // This is pseudocode - implement according to your actual AI service
      // const response = await aiService.generateCode(prompt);
      // return response.code;
      
      // Placeholder - replace with actual implementation
      console.log('Using AI service to generate test code...');
      
      // Returning a placeholder test - in reality, this would come from the AI service
      return `
import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

/**
 * This test was automatically generated from manual test instructions.
 * Review and adjust as needed.
 */
test('${prompt.match(/test\('([^']+)'/)?.[1] || "Placeholder Test"}', async ({ page }) => {
  // TODO: Replace this placeholder with the AI-generated test
  await page.goto('https://example.com');
  
  // Example of using semantic selectors
  const loginButton = await getSemanticSelector('login_button');
  await page.locator(loginButton).click();
  
  // Add more steps based on the manual test...
});
      `;
    } catch (error) {
      console.error('Error calling AI service:', error);
      throw error;
    }
  }
  
  // Fallback to a basic template if no AI service is available
  console.log('No AI service configured, generating basic test template...');
  
  // Extract test name from prompt
  const testNameMatch = prompt.match(/test\('([^']+)'/);
  const testName = testNameMatch ? testNameMatch[1] : "Automated Test";
  
  // Generate bare-bones test from manual steps
  const manualTestLines = prompt
    .split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('#'))
    .map(line => line.trim().replace(/^[#-]\s*/, ''))
    .filter(line => line.length > 0);
  
  return `
import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

/**
 * This test was automatically generated from manual test instructions.
 * Review and adjust as needed.
 */
test('${testName}', async ({ page }) => {
  // TODO: Implement the following steps
  await page.goto('https://example.com');
  
${manualTestLines.map(line => `  // ${line}`).join('\n')}
});
  `;
}

/**
 * Convert string to kebab-case
 */
function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Main function
 */
async function main() {
  const args = minimist(process.argv.slice(2));
  
  if (args.help || (!args.file && !args.dir)) {
    console.log('Usage:');
    console.log('  npm run generate-test -- --file path/to/manual-test.txt [options]');
    console.log('  npm run generate-test -- --dir path/to/manual-tests-dir [options]');
    console.log('');
    console.log('Options:');
    console.log('  --output-dir      Output directory for generated test files (default: ./tests)');
    console.log('  --mappings-dir    Directory containing semantic mappings (default: ./mappings)');
    console.log('  --help            Show this help message');
    process.exit(0);
  }
  
  const outputDir = args['output-dir'] || './tests';
  const mappingsDir = args['mappings-dir'] || './mappings';
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (args.file) {
    // Generate test from a single file
    await generateTest(args.file, outputDir, mappingsDir);
  } else if (args.dir) {
    // Generate tests from all files in directory
    const files = glob.sync(path.join(args.dir, '*.txt'));
    
    if (files.length === 0) {
      console.log(`No .txt files found in ${args.dir}`);
      process.exit(0);
    }
    
    console.log(`Found ${files.length} manual test files`);
    
    for (const file of files) {
      try {
        await generateTest(file, outputDir, mappingsDir);
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
    
    console.log(`\nGenerated ${files.length} test files in ${outputDir}`);
  }
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 