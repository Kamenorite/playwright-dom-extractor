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
}

// Cache for loaded mappings to avoid repeated file reads
const mappingCache: Record<string, DOMElement[]> = {};

/**
 * Clear mapping cache - useful for testing
 */
export function clearMappingCache(): void {
  Object.keys(mappingCache).forEach(key => {
    delete mappingCache[key];
  });
}

/**
 * Gets a selector (CSS or XPath) using a semantic key
 * 
 * @param semanticKey The semantic key to look up
 * @param featureName Optional feature name to scope the search
 * @param mappingPath Custom path to the mapping files (optional)
 * @returns The selector string
 */
export async function getSemanticSelector(
  semanticKey: string,
  featureName?: string,
  mappingPath: string = './mappings'
): Promise<string> {
  // Load all mapping files if not in cache
  if (Object.keys(mappingCache).length === 0) {
    await loadAllMappings(mappingPath);
  }
  
  // Check if there's a feature-specific key to search for
  const searchKey = featureName ? 
    `${featureName.toLowerCase()}_${semanticKey}` : 
    semanticKey;
  
  // First try to find element with exact feature-prefixed key
  let element = findElementByKey(searchKey);
  
  // If not found and we were looking for a feature-specific key, try the generic key
  if (!element && featureName) {
    element = findElementByKey(semanticKey);
  }
  
  if (element) {
    // Return the best available selector
    if (element.attributes && element.attributes['data-testid']) {
      return `[data-testid="${element.attributes['data-testid']}"]`;
    } else if (element.id) {
      return `#${element.id}`;
    } else if (element.xpath) {
      return element.xpath;
    }
  }

  throw new Error(`Semantic key '${semanticKey}' not found in any mapping files`);
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
        const mappingData = JSON.parse(fs.readFileSync(file, 'utf-8'));
        console.log(`Mapping file contains ${mappingData.length} elements`);
        mappingCache[file] = mappingData;
      }
    } catch (error) {
      console.error(`Error reading mapping file ${file}:`, error);
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
      if (element.attributes && element.attributes['data-testid']) {
        selectorMap[element.semanticKey] = `[data-testid="${element.attributes['data-testid']}"]`;
      } else if (element.id) {
        selectorMap[element.semanticKey] = `#${element.id}`;
      } else if (element.xpath) {
        selectorMap[element.semanticKey] = element.xpath;
      }
    }
  });
  
  // Clear cache to ensure fresh data on next request
  delete mappingCache[path.join(mappingPath, urlToFilename(url, featureName))];
  
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