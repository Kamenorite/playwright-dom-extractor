import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface SelectorMap {
  [key: string]: string;
}

interface DOMElement {
  tagName: string;
  id?: string;
  classes?: string[];
  attributes: Record<string, string>;
  innerText?: string;
  xpath: string;
  semanticKey?: string;
  featureName?: string;
  url?: string;
  stableId?: string;
  alternativeNames?: string[];
  alternativeSelectors?: string[];
  lastUpdated?: string;
}

// Cache for loaded mappings to avoid repeated file reads
const mappingCache: Record<string, DOMElement[]> = {};

// Cache specifically for URL to mapping file lookup
const urlMappingCache: Record<string, string> = {};

// Cache for test file to URL mapping (for context detection)
const testUrlCache: Map<string, string> = new Map();

/**
 * Clear mapping cache - useful for testing
 */
export function clearMappingCache(): void {
  Object.keys(mappingCache).forEach(key => {
    delete mappingCache[key];
  });
  Object.keys(urlMappingCache).forEach(key => {
    delete urlMappingCache[key];
  });
  testUrlCache.clear();
}

/**
 * Gets a selector using natural language description
 * Matches against semantic keys and alternative names in the mapping file
 * 
 * @param description Human-readable description of the element (e.g., "search button")
 * @param featureName Optional feature name to scope the search
 * @param mappingPath Custom path to the mapping files (optional)
 * @returns The selector string
 */
export async function getElementByDescription(
  description: string,
  featureName?: string,
  mappingPath: string = './mappings'
): Promise<string> {
  // Load all mapping files if not in cache
  if (Object.keys(mappingCache).length === 0) {
    await loadAllMappings(mappingPath);
  }

  // Normalize the description for matching
  const normalizedDescription = description.toLowerCase().trim();
  const descriptionWords = normalizedDescription.split(/\s+/);
  
  // Track all potential matches and their scores
  const potentialMatches: Array<{ element: DOMElement, score: number, matchedAltName?: string }> = [];
  
  // Search through all mapping files
  for (const file of Object.keys(mappingCache)) {
    for (const element of mappingCache[file]) {
      // Skip elements without semantic keys
      if (!element.semanticKey) continue;
      
      // Calculate match score for this element
      let score = 0;
      
      // Check if the element's semantic key matches the description
      const semanticKey = element.semanticKey.toLowerCase();
      
      // Exact match with semantic key (removing feature prefix if present)
      const keyWithoutPrefix = semanticKey.includes('_') ? 
        semanticKey.split('_').slice(1).join('_') : 
        semanticKey;
      
      if (keyWithoutPrefix === normalizedDescription) {
        score += 100;
      }
      
      // Partial match with semantic key
      const keyWords = keyWithoutPrefix.split(/[_-]/);
      for (const word of descriptionWords) {
        if (word.length < 3) continue; // Skip short words
        if (keyWords.includes(word)) {
          score += 10;
        }
        if (keyWithoutPrefix.includes(word)) {
          score += 5;
        }
      }
      
      // Check alternative names for matches
      let matchedAltName = '';
      if (element.alternativeNames && element.alternativeNames.length > 0) {
        for (const altName of element.alternativeNames) {
          const normalizedAltName = altName.toLowerCase();
          
          // Exact match with alternative name
          if (normalizedAltName === normalizedDescription) {
            score += 100;
            matchedAltName = altName;
            break; // Found an exact match, no need to check other alt names
          }
          
          // Word-level matches with alternative name
          let wordMatches = 0;
          let wordMatchTotal = descriptionWords.length;
          
          for (const word of descriptionWords) {
            if (word.length < 3) {
              wordMatchTotal--; // Don't count very short words
              continue;
            }
            if (normalizedAltName.includes(word)) {
              wordMatches++;
            }
          }
          
          // If all significant words match, high score
          if (wordMatches > 0 && wordMatchTotal > 0) {
            const altScore = Math.round(30 * (wordMatches / wordMatchTotal));
            if (altScore > 0) {
              score += altScore;
              // Keep track of which alternative name matched best
              if (!matchedAltName || altScore > 20) {
                matchedAltName = altName;
              }
            }
          }
        }
      }
      
      // Boost elements from the specified feature
      if (featureName && element.featureName === featureName) {
        score += 20;
      }
      
      // Check element's inner text for matches with description
      if (element.innerText) {
        const normalizedText = element.innerText.toLowerCase();
        for (const word of descriptionWords) {
          if (word.length < 3) continue;
          if (normalizedText.includes(word)) {
            score += 5;
          }
        }
      }
      
      // Check tag name for matches (for element type descriptions like "button", "input", etc.)
      if (descriptionWords.includes(element.tagName.toLowerCase())) {
        score += 15;
      }
      
      // Add to potential matches if score is above threshold
      if (score > 0) {
        potentialMatches.push({ 
          element, 
          score,
          matchedAltName
        });
      }
    }
  }
  
  // Sort potential matches by score (highest first)
  potentialMatches.sort((a, b) => b.score - a.score);
  
  // Check for uniqueness - if multiple elements have similar high scores
  if (potentialMatches.length >= 2) {
    const topScore = potentialMatches[0].score;
    const runnerUpScore = potentialMatches[1].score;
    
    // If scores are close (within 20% of each other), we have ambiguity
    const ambiguityThreshold = topScore * 0.8;
    const isAmbiguous = runnerUpScore >= ambiguityThreshold;
    
    if (isAmbiguous) {
      console.warn(`Ambiguous match detected for '${description}': Found ${potentialMatches.length} elements with similar scores`);
      console.warn(`Top match: '${potentialMatches[0].element.semanticKey}' with score ${potentialMatches[0].score}`);
      console.warn(`Runner-up: '${potentialMatches[1].element.semanticKey}' with score ${potentialMatches[1].score}`);
      
      // Suggest more specific descriptions based on alternative names
      console.warn('Consider using a more specific description like:');
      potentialMatches.slice(0, 3).forEach(match => {
        if (match.element.alternativeNames && match.element.alternativeNames.length > 0) {
          // Suggest longer, more specific alternative names
          const specificAlternatives = match.element.alternativeNames
            .filter(alt => alt.length > description.length)
            .sort((a, b) => b.length - a.length)
            .slice(0, 2);
            
          if (specificAlternatives.length > 0) {
            console.warn(`- For '${match.element.semanticKey}': try "${specificAlternatives[0]}"`);
          }
        }
      });
      
      // If we have feature info on elements, suggest adding feature context
      const differentFeatures = new Set(potentialMatches.slice(0, 3)
        .map(match => match.element.featureName)
        .filter(Boolean));
        
      if (differentFeatures.size > 1) {
        console.warn('Or specify the feature name as a second parameter:');
        potentialMatches.slice(0, 3).forEach(match => {
          if (match.element.featureName) {
            console.warn(`- For '${match.element.semanticKey}': specify feature "${match.element.featureName}"`);
          }
        });
      }
      
      // If a feature name was not provided but ambiguous elements have different features,
      // we could throw an error requiring feature specification
      if (!featureName && differentFeatures.size > 1) {
        throw new Error(`Ambiguous match for '${description}'. Please specify a feature name from: ${Array.from(differentFeatures).join(', ')}`);
      }
    }
  }
  
  // Get the best match
  const bestMatch = potentialMatches.length > 0 ? potentialMatches[0] : null;
  
  // If we found a match, generate a selector for it
  if (bestMatch) {
    console.log(`Description '${description}' matched to '${bestMatch.element.semanticKey}' with score ${bestMatch.score}`);
    
    // Return the best available selector using our selector generation logic
    return generateSelector(bestMatch.element);
  }
  
  throw new Error(`No element found matching description '${description}'`);
}

/**
 * Helper function to generate a reliable selector from a DOM element
 */
function generateSelector(element: DOMElement): string {
  // Use the best available selector strategy
  if (element.attributes && element.attributes['data-testid']) {
    return `[data-testid="${element.attributes['data-testid']}"]`;
  } else if (element.id) {
    return `#${element.id}`;
  } else if (element.alternativeSelectors && element.alternativeSelectors.length > 0) {
    const primarySelector = element.alternativeSelectors[0];
    // Prefix XPath selectors with xpath=
    if (primarySelector.startsWith('/')) {
      return `xpath=${primarySelector}`;
    }
    return primarySelector;
  } else {
    // Generate a CSS selector based on element properties
    return generateCssSelector(element);
  }
}

/**
 * Generates a reliable CSS selector from element properties
 * Used as an alternative to XPath
 */
function generateCssSelector(element: DOMElement): string {
  // Try to generate selectors from alternativeNames first
  if (element.alternativeNames && element.alternativeNames.length > 0) {
    // Look for alternative names with text content
    for (const altName of element.alternativeNames) {
      // Check if this is a simple text description like "search button"
      if (altName.includes(element.tagName) && altName.split(' ').length <= 3) {
        // Extract text content from alternative name (e.g., "search" from "search button")
        const textPart = altName.replace(element.tagName, '').trim();
        if (textPart) {
          return `${element.tagName}:text("${textPart}")`;
        }
      }
      
      // Check if there is text content that can be used for text selector
      if (element.innerText && element.innerText.trim().length > 0 && 
          (altName.includes(element.innerText.trim()) || element.innerText.trim().includes(altName))) {
        return `:text("${element.innerText.trim()}")`;
      }
    }
  }
  
  let selector = element.tagName;
  
  // Add specific attributes that help identify the element
  if (element.attributes) {
    // Type attribute is often useful
    if (element.attributes.type) {
      selector += `[type="${element.attributes.type}"]`;
    }
    
    // Role attribute is good for accessibility and stable
    if (element.attributes.role) {
      selector += `[role="${element.attributes.role}"]`;
    }
    
    // Name, placeholder, and aria-label are useful for form elements
    if (element.attributes.name) {
      selector += `[name="${element.attributes.name}"]`;
    }
    
    if (element.attributes.placeholder) {
      selector += `[placeholder="${element.attributes.placeholder}"]`;
    }
    
    if (element.attributes['aria-label']) {
      selector += `[aria-label="${element.attributes['aria-label']}"]`;
    }
  }
  
  // For buttons and links, text content is often a good identifier
  if (
    element.innerText && 
    ['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'].includes(element.tagName)
  ) {
    // For very short text contents, we can use exact text matching
    if (element.innerText.length < 30) {
      return `${element.tagName}:text("${element.innerText.trim()}")`;
    }
  }
  
  // If we couldn't create a specific CSS selector, fall back to XPath but with a warning
  if (selector === element.tagName && element.xpath) {
    console.warn(`Falling back to XPath for ${element.semanticKey} - consider adding data-testid attributes to improve test reliability`);
    return `xpath=${element.xpath}`;
  }
  
  return selector;
}

/**
 * Find an element by its semantic key in the cache
 */
function findElementByKey(semanticKey: string): DOMElement | undefined {
  for (const file of Object.keys(mappingCache)) {
    const elements = mappingCache[file];
    const element = elements.find(el => el.semanticKey === semanticKey);
    if (element) {
      return element;
    }
  }
  return undefined;
}

/**
 * Load all mapping files into cache
 */
async function loadAllMappings(mappingPath: string): Promise<void> {
  console.log(`Loading mapping files from: ${mappingPath}`);
  
  const globPattern = path.join(mappingPath, '*.json');
  console.log(`Using glob pattern: ${globPattern}`);
  
  const files = glob.sync(globPattern);
  console.log(`Found ${files.length} mapping files: ${files.join(', ')}`);
  
  for (const file of files) {
    try {
      if (!mappingCache[file]) {
        console.log(`Reading mapping file: ${file}`);
        const fileContent = fs.readFileSync(file, 'utf-8');
        const mappingData = JSON.parse(fileContent);
        
        // Handle both old (array) and new (object with elements) formats
        if (Array.isArray(mappingData)) {
          // Old format - direct array of elements
          console.log(`Mapping file contains ${mappingData.length} elements (old format)`);
          mappingCache[file] = mappingData;
        } else if (mappingData.elements && Array.isArray(mappingData.elements)) {
          // New format - object with elements array and metadata
          console.log(`Mapping file contains ${mappingData.elements.length} elements (new format)`);
          mappingCache[file] = mappingData.elements;
        } else {
          console.error(`Unrecognized mapping file format in ${file}`);
          mappingCache[file] = [];
        }
      }
    } catch (error) {
      console.error(`Error reading mapping file ${file}:`, error);
      mappingCache[file] = [];
    }
  }
  
  // Debug info about cached mappings
  const totalKeys = Object.values(mappingCache).reduce((acc, elements) => 
    acc + elements.filter(el => el.semanticKey).length, 0
  );
  console.log(`Total cached elements with semantic keys: ${totalKeys}`);
}

/**
 * Updates the selector index for the specified URL
 * 
 * @param url The URL to update selectors for
 * @param mappingPath Custom path to the mapping files (optional)
 * @param featureName Optional feature name for contextual mapping
 * @returns A map of semantic keys to selectors
 */
export async function updateSelectorIndex(
  url: string,
  mappingPath: string = './mappings',
  featureName?: string
): Promise<SelectorMap> {
  // Import the DOMMonitor dynamically to avoid circular dependencies
  const { DOMMonitor } = await import('../dom-monitor');
  
  const monitor = new DOMMonitor({ 
    outputPath: mappingPath,
    featureName: featureName // Pass feature name to the DOM monitor
  });
  await monitor.init();
  await monitor.navigateTo(url);
  
  const elements = await monitor.extractDOMElements();
  const elementsWithKeys = await monitor.generateSemanticKeys(elements);
  
  await monitor.saveReport(url, elementsWithKeys);
  await monitor.close();
  
  // Create a map of semantic keys to selectors
  const selectorMap: SelectorMap = {};
  elementsWithKeys.forEach((element: DOMElement) => {
    if (element.semanticKey) {
      selectorMap[element.semanticKey] = generateSelector(element);
    }
  });
  
  // Store the URL to mapping file relationship
  const mappingFile = path.join(mappingPath, urlToFilename(url, featureName));
  urlMappingCache[url] = mappingFile;
  
  // Clear cache to ensure fresh data on next request
  delete mappingCache[mappingFile];
  
  return selectorMap;
}

/**
 * Convert URL to a filename
 */
function urlToFilename(url: string, featureName?: string): string {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.replace(/\./g, '_');
  const pathname = urlObj.pathname.replace(/\//g, '_');
  
  const featurePrefix = featureName ? 
    `${featureName.toLowerCase()}_` : '';
  
  return `${featurePrefix}${hostname}${pathname}.json`;
}

/**
 * Get all available semantic keys
 * 
 * @param mappingPath Custom path to the mapping files (optional)
 * @returns Array of all semantic keys with their descriptions
 */
export async function getAllSemanticKeys(
  mappingPath: string = './mappings'
): Promise<Array<{ key: string, description: string }>> {
  // Load all mapping files if not in cache
  if (Object.keys(mappingCache).length === 0) {
    await loadAllMappings(mappingPath);
  }
  
  const allKeys: Array<{ key: string, description: string }> = [];
  
  // Collect all semantic keys from all mapping files
  for (const file of Object.keys(mappingCache)) {
    const elements = mappingCache[file];
    
    for (const element of elements) {
      if (element.semanticKey) {
        // Create a description of the element
        const description = element.innerText ? 
          `${element.tagName} with text "${element.innerText.substring(0, 50)}${element.innerText.length > 50 ? '...' : ''}"` : 
          `${element.tagName} element`;
        
        // Add feature info if available
        const featureInfo = element.featureName ? 
          ` (feature: ${element.featureName})` : 
          '';
        
        allKeys.push({
          key: element.semanticKey,
          description: `${description}${featureInfo}`
        });
      }
    }
  }
  
  return allKeys;
}

/**
 * Self-healing wrapper that uses natural language descriptions to find elements
 * 
 * @param page The Playwright page object
 * @param description Human-readable description of the element (e.g., "search button")
 * @param featureName Optional feature name to scope the search
 * @param mappingPath Custom path to the mapping files
 * @returns A locator for the element
 */
export async function getByDescription(
  page: any, // Using any to avoid Playwright dependency, should be Page from @playwright/test
  description: string,
  featureName?: string,
  mappingPath: string = './mappings'
): Promise<any> { // Returns a Playwright Locator
  try {
    const selector = await getElementByDescription(description, featureName, mappingPath);
    return page.locator(selector);
  } catch (error) {
    throw new Error(`Could not find element matching description '${description}': ${error}`);
  }
}

/**
 * Attempt to detect the feature/context from the calling context
 * This analyzes the call stack to find the test file and map it to a URL
 */
async function detectFeatureFromCallingContext(): Promise<string | undefined> {
  try {
    // Capture the stack trace
    const stack = new Error().stack || '';
    
    // Find the caller file
    const stackLines = stack.split('\n');
    let callerFile = '';
    
    for (const line of stackLines) {
      if (line.includes('.spec.ts') || line.includes('.test.ts')) {
        const match = line.match(/\((.+\.(?:spec|test)\.ts):/);
        if (match && match[1]) {
          callerFile = match[1];
          break;
        }
      }
    }
    
    if (!callerFile) return undefined;
    
    // Check if we have a cached URL for this test file
    if (testUrlCache.has(callerFile)) {
      const url = testUrlCache.get(callerFile);
      
      // Try to extract feature name from mapping file that matches this URL
      if (url) {
        for (const filename of Object.keys(mappingCache)) {
          if (filename.includes(url.replace(/https?:\/\//, '').replace(/\./g, '_'))) {
            // Extract feature name from filename if it has a prefix
            const basename = path.basename(filename, '.json');
            const parts = basename.split('_');
            if (parts.length > 2) {
              return parts[0]; // First part is the feature name
            }
          }
        }
      }
      
      return undefined;
    }
    
    // If we don't have a cached URL, try to scan the test file to find the URL
    if (fs.existsSync(callerFile)) {
      const content = fs.readFileSync(callerFile, 'utf-8');
      
      // Look for page.goto calls
      const gotoMatches = content.match(/page\.goto\s*\(\s*['"]([^'"]+)['"]/);
      if (gotoMatches && gotoMatches[1]) {
        const url = gotoMatches[1];
        testUrlCache.set(callerFile, url);
        
        // Now look for a feature name in mapping files
        for (const filename of Object.keys(mappingCache)) {
          if (filename.includes(url.replace(/https?:\/\//, '').replace(/\./g, '_'))) {
            // Extract feature name from filename if it has a prefix
            const basename = path.basename(filename, '.json');
            const parts = basename.split('_');
            if (parts.length > 2) {
              return parts[0]; // First part is the feature name
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to detect feature from context:', error);
  }
  
  return undefined;
}

/**
 * List all semantic keys from specific feature
 */
export async function getFeatureSemanticKeys(
  featureName: string,
  mappingPath: string = './mappings'
): Promise<Array<{ key: string, description: string }>> {
  const allKeys = await getAllSemanticKeys(mappingPath);
  
  // Filter keys by feature name prefix
  const featurePrefix = featureName.toLowerCase() + '_';
  return allKeys.filter(item => 
    item.key.startsWith(featurePrefix) || 
    item.description.includes(`(feature: ${featureName})`)
  );
}

/**
 * Suggest semantic keys for a given element description
 * This is useful for Cursor rules to suggest semantic keys while writing tests
 */
export async function suggestSemanticKeys(
  description: string,
  mappingPath: string = './mappings'
): Promise<Array<{ key: string, description: string, score: number }>> {
  const allKeys = await getAllSemanticKeys(mappingPath);
  
  // Convert description to lowercase for case-insensitive matching
  const lowerDescription = description.toLowerCase();
  
  // Score and rank each key based on how well it matches the description
  return allKeys.map(item => {
    // Calculate a simple relevance score
    let score = 0;
    
    // Check for exact word matches in key and description
    lowerDescription.split(/\s+/).forEach(word => {
      if (word.length < 3) return; // Skip short words
      
      if (item.key.toLowerCase().includes(word)) {
        score += 5; // Higher weight for matches in the key
      }
      
      if (item.description.toLowerCase().includes(word)) {
        score += 3; // Lower weight for matches in the description
      }
    });
    
    return { ...item, score };
  })
  .filter(item => item.score > 0) // Only return items with some relevance
  .sort((a, b) => b.score - a.score) // Sort by score in descending order
  .slice(0, 10); // Limit to top 10 results
}

// DEPRECATED: Export compatibility functions to avoid breaking existing code
// These will be removed in a future version

/**
 * DEPRECATED: Use getByDescription instead
 * @deprecated Use getByDescription for better natural language matching
 */
export async function getSemanticSelector(key: string): Promise<string> {
  console.warn('getSemanticSelector is deprecated. Use getByDescription instead for better natural language matching.');
  try {
    const element = await getElementByDescription(key);
    return element;
  } catch (error) {
    return `[data-testid="${key}"]`;
  }
}

/**
 * DEPRECATED: Use getByDescription instead
 * @deprecated Use getByDescription for better natural language matching
 */
export async function getSelfHealingLocator(page: any, key: string): Promise<any> {
  console.warn('getSelfHealingLocator is deprecated. Use getByDescription instead for better natural language matching.');
  try {
    return await getByDescription(page, key);
  } catch (error) {
    return page.locator(`[data-testid="${key}"]`);
  }
}

/**
 * DEPRECATED: No longer needed with getByDescription
 * @deprecated No longer needed with the new natural language selectors
 */
export async function updateSelectorForKey(key: string, url: string): Promise<string> {
  console.warn('updateSelectorForKey is deprecated and will be removed in a future version.');
  const selectorMap = await updateSelectorIndex(url);
  return selectorMap[key] || `[data-testid="${key}"]`;
} 