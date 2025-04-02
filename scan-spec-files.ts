import minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { CursorAIService } from './services/cursor-ai-service';
import { DOMMonitor } from './dom-monitor';

interface SpecFile {
  filePath: string;
  fileName: string;
  featureName: string;
  urls: string[];
}

/**
 * Extract URLs from a Playwright test file
 */
async function extractUrlsFromSpec(filePath: string): Promise<string[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Enhanced regex to find more URL patterns
  // Matches both direct strings and template literals
  const patterns = [
    /page\.goto\(['"]([^'"]+)['"]/g,                   // Basic string literals
    /page\.goto\(`([^`]+)`/g,                          // Template literals
    /navigate\s*\(\s*['"]([^'"]+)['"]/g,               // Custom navigate functions
    /url\s*[:=]\s*['"]([^'"]+)['"]/g,                  // URL assignments
    /goto\(\s*['"]([^'"]+)['"]/g,                      // Other goto variations
    /https?:\/\/([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z0-9]{2,}/g  // Direct URL strings
  ];
  
  const urls: string[] = [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const url = match[1];
      // Only add if it's a valid URL and not already in the list
      if (url && !urls.includes(url) && (url.startsWith('http') || url.startsWith('www'))) {
        urls.push(url);
      }
    }
  }
  
  return urls;
}

/**
 * Extract feature name from spec file
 */
function extractFeatureName(filePath: string): string {
  const fileName = path.basename(filePath, '.spec.ts');
  // Convert to kebab-case to snake_case, then capitalize first letters for readability
  return fileName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Scan all spec files and extract URLs
 */
async function scanSpecFiles(testsDirectory: string): Promise<SpecFile[]> {
  const specFiles = glob.sync(path.join(testsDirectory, '**/*.spec.ts'));
  const results: SpecFile[] = [];
  
  for (const filePath of specFiles) {
    const fileName = path.basename(filePath);
    const featureName = extractFeatureName(filePath);
    const urls = await extractUrlsFromSpec(filePath);
    
    results.push({
      filePath,
      fileName,
      featureName,
      urls
    });
  }
  
  return results;
}

/**
 * Process a URL and generate semantic mappings, tagged with feature name
 */
async function processUrlForFeature(url: string, featureName: string, outputPath: string, waitTime = 3000, skipScreenshots = false): Promise<void> {
  console.log(`Processing ${url} for feature "${featureName}"...`);
  
  try {
    // Use the enhanced CursorAIService for better semantic key generation
    const aiService = new CursorAIService({
      mcpEnabled: true,
      useAI: true
    });
    
    const domMonitor = new DOMMonitor({
      useAI: true,
      aiService,
      outputPath,
      waitTimeout: waitTime
    });
    
    await domMonitor.init();
    await domMonitor.navigateTo(url);
    
    // Wait for page to be fully loaded
    try {
      await domMonitor.waitForNetworkIdle();
      await domMonitor.waitForTimeout(waitTime);
    } catch (error) {
      console.log('Wait timeout, continuing anyway');
    }
    
    console.log('Extracting DOM elements...');
    let elements = await domMonitor.extractDOMElements();
    
    console.log('Generating semantic keys...');
    elements = await domMonitor.generateSemanticKeys(elements);
    
    const reports = await domMonitor.saveReport(url, elements);
    console.log(`Reports saved:`);
    console.log(`- JSON: ${reports.jsonPath}`);
    console.log(`- HTML: ${reports.htmlPath}`);
    
    // Take a screenshot for reference, if not disabled
    await domMonitor.takeScreenshot(path.join(outputPath, `${featureName.toLowerCase()}_screenshot.png`), true, skipScreenshots);
    
    await domMonitor.close();
  } catch (error) {
    console.error(`Error processing ${url} for feature "${featureName}":`, error);
    console.log('Continuing with next URL...');
  }
}

/**
 * Process a URL directly (without feature context)
 */
async function processUrl(url: string, outputPath: string, waitTime = 3000, skipScreenshots = false): Promise<void> {
  console.log(`Processing ${url}...`);
  
  try {
    // Use the enhanced CursorAIService for better semantic key generation
    const aiService = new CursorAIService({
      mcpEnabled: true,
      useAI: true
    });
    
    const domMonitor = new DOMMonitor({
      useAI: true,
      aiService,
      outputPath,
      waitTimeout: waitTime
    });
    
    await domMonitor.init();
    await domMonitor.navigateTo(url);
    
    // Wait for page to be fully loaded including dynamic content
    console.log('Waiting for page to stabilize...');
    try {
      // Use the new public methods
      await domMonitor.waitForNetworkIdle();
      await domMonitor.waitForTimeout(waitTime);
    } catch (error) {
      console.log('Wait timeout, continuing anyway');
    }
    
    console.log('Extracting DOM elements...');
    let elements = await domMonitor.extractDOMElements();
    
    console.log('Generating semantic keys...');
    elements = await domMonitor.generateSemanticKeys(elements);
    
    const reports = await domMonitor.saveReport(url, elements);
    console.log(`Reports saved:`);
    console.log(`- JSON: ${reports.jsonPath}`);
    console.log(`- HTML: ${reports.htmlPath}`);
    
    // Take a screenshot for reference using the new public method, if not disabled
    await domMonitor.takeScreenshot(path.join(outputPath, `page_screenshot.png`), true, skipScreenshots);
    
    await domMonitor.close();
  } catch (error) {
    console.error(`Error processing ${url}:`, error);
  }
}

async function main() {
  const args = minimist(process.argv.slice(2));
  
  // Print help if requested or if no args provided
  if (args.help || Object.keys(args).length === 1) {
    console.log('Usage:');
    console.log('  npm run scan-specs -- [options]');
    console.log('');
    console.log('Options:');
    console.log('  --tests-dir        Directory containing test spec files (default: ./tests)');
    console.log('  --output-path      Output directory for mappings (default: ./mappings)');
    console.log('  --url              Process a single URL directly (bypasses spec scanning)');
    console.log('  --wait-time        Wait time in ms after page load (default: 3000)');
    console.log('  --no-screenshots   Disable screenshot generation');
    console.log('  --help             Show this help message');
    process.exit(0);
  }
  
  const testsDirectory = args['tests-dir'] || './tests';
  const outputPath = args['output-path'] || './mappings';
  const waitTime = args['wait-time'] || 3000;
  const skipScreenshots = args['no-screenshots'] || false;
  
  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  // If URL is provided directly, process it
  if (args.url) {
    await processUrl(args.url, outputPath, waitTime, skipScreenshots);
    console.log('Done!');
    return;
  }
  
  // Otherwise scan spec files
  console.log(`Scanning spec files in ${testsDirectory}...`);
  const specFiles = await scanSpecFiles(testsDirectory);
  
  console.log(`Found ${specFiles.length} spec files`);
  
  // Process each URL found in spec files
  let processedUrls = 0;
  for (const specFile of specFiles) {
    console.log(`\nProcessing spec file: ${specFile.fileName}`);
    console.log(`Feature name: ${specFile.featureName}`);
    console.log(`URLs found: ${specFile.urls.length}`);
    
    for (const url of specFile.urls) {
      await processUrlForFeature(url, specFile.featureName, outputPath, waitTime, skipScreenshots);
      processedUrls++;
    }
  }
  
  console.log(`\nProcessed ${processedUrls} URLs from ${specFiles.length} spec files`);
  console.log('Done!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 