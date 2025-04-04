import minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { MCPService } from './services/mcp-ai-service';
import { DOMMonitor } from './dom-monitor';

// Cache of processed URLs in the current execution
const processedUrlCache: Record<string, {
  timestamp: number;
  featureName: string;
  jsonPath: string;
  htmlPath: string;
}> = {};

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
  console.log(`Scanning file for URLs: ${filePath}`);
  
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
      const url = match[1] || match[0]; // Use entire match if group 1 doesn't exist
      // Only add if it's a valid URL and not already in the list
      if (url && !urls.includes(url) && (url.startsWith('http') || url.startsWith('www'))) {
        console.log(`Found URL: ${url}`);
        urls.push(url);
      }
    }
  }
  
  if (urls.length === 0) {
    console.log(`No URLs found in file: ${filePath}`);
  } else {
    console.log(`Found ${urls.length} URLs in file: ${filePath}`);
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

// Add a list to track all DOM monitors created
const activeDOMMonitors: DOMMonitor[] = [];

/**
 * Creates sanitized filename from URL and feature name
 */
function createSanitizedFilename(url: string, featureName: string): string {
  // Remove protocol and special characters
  const sanitizedUrl = url
    .replace(/^https?:\/\//, '')
    .replace(/[\/\?=&]/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');
  
  return `${featureName.toLowerCase()}_${sanitizedUrl}`;
}

/**
 * Process a URL for a feature, extract DOM elements and generate semantic keys
 */
async function processUrlForFeature(url: string, featureName: string, outputPath: string, waitTime: number, skipScreenshots: boolean): Promise<void> {
  console.log(`Processing ${url} for feature "${featureName}"...`);
  
  // Check if this URL was already processed in this execution
  const cacheKey = `${url}_${featureName}`;
  const now = Date.now();
  const sanitizedFilename = createSanitizedFilename(url, featureName);
  const jsonPath = path.join(outputPath, `${sanitizedFilename}.json`);
  const htmlPath = path.join(outputPath, `${sanitizedFilename}.html`);
  
  if (processedUrlCache[cacheKey]) {
    console.log(`Using cached result for ${url} with feature "${featureName}" from current execution`);
    console.log(`- JSON: ${processedUrlCache[cacheKey].jsonPath}`);
    console.log(`- HTML: ${processedUrlCache[cacheKey].htmlPath}`);
    console.log(`Completed processing URL: ${url}`);
    return;
  }
  
  // Create DOM Monitor
  const domMonitor = new DOMMonitor({
    outputPath,
    waitTimeout: waitTime,
    featureName
  });
  
  // Track this monitor for cleanup
  activeDOMMonitors.push(domMonitor);
  
  try {
    // Initialize browser and navigate to URL
    await domMonitor.init();
    await domMonitor.navigateTo(url);
    
    // Wait for page to be fully loaded
    try {
      await domMonitor.waitForNetworkIdle();
      await domMonitor.waitForTimeout(waitTime);
    } catch (error) {
      console.log('Wait timeout, continuing anyway');
    }
    
    // Extract and process DOM elements
    console.log('Extracting DOM elements...');
    let elements = await domMonitor.extractDOMElements();
    
    console.log('Generating semantic keys with MCP...');
    elements = await domMonitor.generateSemanticKeys(elements);
    
    // Save reports
    const reports = await domMonitor.saveReport(url, elements);
    console.log(`Reports saved:`);
    console.log(`- JSON: ${reports.jsonPath}`);
    console.log(`- HTML: ${reports.htmlPath}`);
    
    // Take a screenshot for reference
    if (!skipScreenshots) {
      await domMonitor.takeScreenshot(path.join(outputPath, `${sanitizedFilename}_screenshot.png`), true, skipScreenshots);
    }
    
    // Cache this URL processing for the current execution
    processedUrlCache[cacheKey] = {
      timestamp: now,
      featureName,
      jsonPath: reports.jsonPath,
      htmlPath: reports.htmlPath
    };
    
    // Close this browser instance
    await domMonitor.close();
    
    console.log(`Completed processing URL: ${url}`);
  } catch (error) {
    console.error(`Error processing ${url} for feature "${featureName}":`, error);
    // Try to close the browser even if there was an error
    try {
      await domMonitor.close();
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }
    throw error;
  }
}

/**
 * Process a URL directly (without feature context)
 */
async function processUrl(url: string, outputPath: string, waitTime = 3000, skipScreenshots = false): Promise<void> {
  console.log(`Processing ${url}...`);

  // Use a generic feature name for direct URL processing
  const genericFeature = 'DirectScan';
  const cacheKey = `${url}_${genericFeature}`;
  const sanitizedFilename = createSanitizedFilename(url, genericFeature);
  
  // Check if this URL was already processed in this execution
  if (processedUrlCache[cacheKey]) {
    console.log(`Using cached result for ${url} from current execution`);
    console.log(`- JSON: ${processedUrlCache[cacheKey].jsonPath}`);
    console.log(`- HTML: ${processedUrlCache[cacheKey].htmlPath}`);
    console.log(`Completed processing URL: ${url}`);
    return;
  }
  
  try {
    const domMonitor = new DOMMonitor({
      outputPath,
      waitTimeout: waitTime
    });
    
    // Add to active monitors for cleanup
    activeDOMMonitors.push(domMonitor);
    
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
    
    console.log('Generating semantic keys with MCP...');
    elements = await domMonitor.generateSemanticKeys(elements);
    
    const reports = await domMonitor.saveReport(url, elements);
    console.log(`Reports saved:`);
    console.log(`- JSON: ${reports.jsonPath}`);
    console.log(`- HTML: ${reports.htmlPath}`);
    
    // Take a screenshot for reference using the new public method, if not disabled
    await domMonitor.takeScreenshot(path.join(outputPath, `${sanitizedFilename}_screenshot.png`), true, skipScreenshots);
    
    // Cache this URL processing
    processedUrlCache[cacheKey] = {
      timestamp: Date.now(),
      featureName: genericFeature,
      jsonPath: reports.jsonPath,
      htmlPath: reports.htmlPath
    };
    
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
  
  try {
    // Process each URL found in spec files
    let processedUrls = 0;
    let failedUrls = 0;
    
    for (const specFile of specFiles) {
      console.log(`\nProcessing spec file: ${specFile.fileName}`);
      console.log(`Feature name: ${specFile.featureName}`);
      console.log(`URLs found: ${specFile.urls.length}`);
      
      if (specFile.urls.length === 0) {
        console.log('No URLs found in this spec file, skipping...');
        continue;
      }
      
      // Process each URL in the spec file
      for (const url of specFile.urls) {
        try {
          console.log(`\nProcessing URL (${processedUrls + 1}/${specFile.urls.length}): ${url}`);
          await processUrlForFeature(url, specFile.featureName, outputPath, waitTime, skipScreenshots);
          processedUrls++;
        } catch (error) {
          failedUrls++;
          console.error(`Failed to process URL: ${url}`, error);
          console.log('Continuing with next URL...');
        }
      }
    }
    
    console.log(`\nProcessed ${processedUrls} URLs successfully from ${specFiles.length} spec files`);
    if (failedUrls > 0) {
      console.log(`Failed to process ${failedUrls} URLs`);
    }
    console.log('Done!');
  } catch (error) {
    console.error('Error during processing:', error);
  } finally {
    // Ensure all browser instances are closed
    console.log('Cleaning up all browser instances...');
    const closePromises = activeDOMMonitors.map(async (monitor) => {
      try {
        await monitor.close();
      } catch (error) {
        console.error('Error closing browser instance:', error);
      }
    });
    
    await Promise.all(closePromises);
    console.log('All cleanup complete. Exiting...');
    
    // Force exit after a short delay if needed
    setTimeout(() => {
      console.log('Forcing exit...');
      process.exit(0);
    }, 1000);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 