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
}

/**
 * Gets a selector (CSS or XPath) using a semantic key
 * 
 * @param semanticKey The semantic key to look up
 * @param mappingPath Custom path to the mapping files (optional)
 * @returns The selector string
 */
export async function getSemanticSelector(
  semanticKey: string,
  mappingPath: string = './mappings'
): Promise<string> {
  // Load all mapping files
  const files = glob.sync(path.join(mappingPath, '*.json'));
  
  // Find the semantic key in any of the mapping files
  for (const file of files) {
    try {
      const mappingData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const element = mappingData.find((el: any) => el.semanticKey === semanticKey);
      
      if (element) {
        // Return the best available selector
        if (element.id) {
          return `#${element.id}`;
        } else if (element.xpath) {
          return element.xpath;
        }
      }
    } catch (error) {
      console.error(`Error reading mapping file ${file}:`, error);
    }
  }

  throw new Error(`Semantic key '${semanticKey}' not found in any mapping files`);
}

/**
 * Updates the selector index for the specified URL
 * 
 * @param url The URL to update selectors for
 * @param mappingPath Custom path to the mapping files (optional)
 * @returns A map of semantic keys to selectors
 */
export async function updateSelectorIndex(
  url: string,
  mappingPath: string = './mappings'
): Promise<SelectorMap> {
  // Import the DOMMonitor dynamically to avoid circular dependencies
  const { DOMMonitor } = await import('../dom-monitor');
  
  const monitor = new DOMMonitor({ outputPath: mappingPath });
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
      if (element.id) {
        selectorMap[element.semanticKey] = `#${element.id}`;
      } else if (element.xpath) {
        selectorMap[element.semanticKey] = element.xpath;
      }
    }
  });
  
  return selectorMap;
} 