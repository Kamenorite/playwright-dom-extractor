import axios from 'axios';
import { chromium } from 'playwright';

export interface AIServiceOptions {
  apiKey?: string; // API key for a potential separate LLM service
  endpoint?: string; // Endpoint for a potential separate LLM service
  useDirectPlaywright?: boolean; // Whether to use direct Playwright API instead of MCP
  useAIFallback?: boolean; // Option to use rule-based approach
}

export class AIService {
  private options: AIServiceOptions;

  constructor(options: AIServiceOptions = {}) {
    this.options = {
      // Keep existing defaults
      endpoint: process.env.AI_API_ENDPOINT,
      apiKey: process.env.AI_API_KEY,
      useDirectPlaywright: process.env.USE_DIRECT_PLAYWRIGHT === 'true',
      useAIFallback: true,
      ...options
    };

    // Check if AI integration is properly configured
    if (this.options.apiKey) {
      if (!this.options.endpoint) {
        console.warn('AI API key provided but no endpoint specified. Using default endpoint.');
        this.options.endpoint = 'https://api.cursor.sh/v1/ai/completions';
      }
    } else {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('No AI API key provided. Falling back to rule-based semantic key generation.');
      }
      // Ensure useAIFallback is true when no API key is available
      this.options.useAIFallback = true;
    }
  }

  /**
   * Main method for DOM extraction and semantic key generation.
   * Chooses the appropriate implementation based on configuration.
   */
  async generateSemanticKeysForPage(url: string): Promise<any[]> {
    if (this.options.useDirectPlaywright) {
      console.log('Using direct Playwright approach (bypassing MCP)...');
      return this.extractDOMAndGenerateSemanticKeys(url);
    } else {
      console.log('Using Cursor MCP integration with Playwright...');
      // In a real implementation, this would be handled by Cursor's MCP integration
      // For now, we'll fall back to our direct implementation
      return this.extractDOMAndGenerateSemanticKeys(url);
    }
  }

  /**
   * Generates semantic keys for elements on a given page using Microsoft Playwright.
   * This method uses Playwright browser automation to extract DOM elements and generate semantic keys.
   * @param url The URL of the page to analyze.
   * @returns A promise resolving to an array of element mappings with semantic keys.
   */
  async extractDOMAndGenerateSemanticKeys(url: string): Promise<any[]> {
    console.log(`Analyzing page via Microsoft Playwright: ${url}`);
    
    // Launch browser and navigate to page
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.log('Page loaded successfully');
      
      // Extract DOM elements
      const elements = await page.evaluate(() => {
        const extractedElements: Array<{
          tagName: string;
          attributes: Record<string, string>;
          innerText: string;
          xpath: string;
        }> = [];
        
        const allElements = document.querySelectorAll('a, button, input, select, h1, h2, h3, h4, h5, label, form');
        
        allElements.forEach((el) => {
          // Get attributes
          const attributes: Record<string, string> = {};
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            attributes[attr.name] = attr.value;
          }
          
          // Get text content
          const innerText = (el as HTMLElement).innerText || el.textContent || '';
          
          // Get XPath
          function getXPath(element: Element): string {
            if (element.id) {
              return '//*[@id="' + element.id + '"]';
            }
            if (element === document.body) {
              return '/body';
            }
            let ix = 0;
            const siblings = element.parentNode?.childNodes || [];
            for (let i = 0; i < siblings.length; i++) {
              const sibling = siblings[i];
              if (sibling === element) {
                return getXPath(element.parentNode as Element) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
              }
              if (sibling.nodeType === 1 && (sibling as Element).tagName === element.tagName) {
                ix++;
              }
            }
            return ''; // Fallback
          }
          
          extractedElements.push({
            tagName: el.tagName.toLowerCase(),
            attributes,
            innerText: innerText.trim(),
            xpath: getXPath(el)
          });
        });
        
        return extractedElements;
      });
      
      console.log(`Extracted ${elements.length} elements from page`);
      
      // Take screenshot for reference
      await page.screenshot({ path: 'page-screenshot.png', fullPage: true });
      console.log('Screenshot saved to page-screenshot.png');
      
      // Generate semantic keys for each element
      const elementsWithKeys = elements.map(element => ({
        ...element,
        semanticKey: this.sanitizeKey(this.generateRuleBasedSemanticKey(element))
      }));
      
      // Close browser
      await browser.close();
      
      return elementsWithKeys;
    } catch (error) {
      console.error('Error during Playwright page analysis:', error);
      // Make sure to close browser even if there's an error
      await browser.close();
      return [];
    }
  }

  // For backward compatibility
  async generateSemanticKeysForPageViaMCP(url: string): Promise<any[]> {
    console.log('Note: This method is maintained for backward compatibility');
    return this.generateSemanticKeysForPage(url);
  }

  /**
   * Generates a semantic key for a *single* pre-extracted element.
   * Can use generic AI endpoint or rule-based fallback.
   * Might be less preferred if MCP is available for full-page context.
   */
  async generateSemanticKeyForElement(element: any): Promise<string> { // Renamed from generateSemanticKey
    // If API key is available and MCP is not the primary method or failed, try generic AI
    if (this.options.apiKey && this.options.endpoint && this.options.useAIFallback !== false) {
       try {
           const elementDescription = this.createElementDescription(element);
           
           // Add timeout to avoid hanging API calls
           const controller = new AbortController();
           const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
           
           try {
               const response = await axios.post(
                   this.options.endpoint!,
                   {
                       prompt: `Generate a concise, descriptive, snake_case semantic key (max 5 words) for this HTML element, focusing on its purpose or main identifying feature: ${elementDescription}`,
                       max_tokens: 30 // Reduced tokens for just a key
                   },
                   {
                       headers: {
                           'Content-Type': 'application/json',
                           'Authorization': `Bearer ${this.options.apiKey}`
                       },
                       signal: controller.signal
                   }
               );
               
               clearTimeout(timeoutId);
               const semanticKey = this.processAndSanitizeAIResponse(response.data); // Use new sanitize function
               if (semanticKey && semanticKey !== 'ai_generated_key' && semanticKey !== 'invalid_key') { // Check sanitized key
                   return semanticKey;
               }
           } catch (apiError: any) {
               clearTimeout(timeoutId);
               console.warn(`AI API call failed: ${apiError.message}`);
               // Continue to fallback
           }
       } catch (error: any) { // Added type annotation
           console.warn('Error generating semantic key via generic AI:', error.message);
           // Continue to fallback
       }
    }

    // Default to rule-based if no AI options are configured or if they fail/are disabled
    return this.generateRuleBasedSemanticKey(element);
  }

  /**
   * Generate a semantic key based on element properties using rules and heuristics.
   * Reliable fallback method. Refined logic.
   */
  private generateRuleBasedSemanticKey(element: any): string {
    // Basic element type categorization
    let elementType = element.tagName;
    
    // Apply better classification for semantic meaning
    if (element.attributes.role) {
      elementType = element.attributes.role; // Use role as it has semantic meaning
    } else if (element.tagName === 'a' && element.attributes.href?.includes('mailto:')) {
      elementType = 'email_link';
    } else if (element.tagName === 'a' && element.attributes.href?.includes('tel:')) {
      elementType = 'phone_link';
    } else if (element.tagName === 'button' || (element.tagName === 'a' && !element.attributes.href)) {
      elementType = 'button';
    } else if (element.tagName === 'input') {
      elementType = `${element.attributes.type || 'text'}_input`; // e.g., text_input, email_input
    }
    
    // Get element text or label for the descriptive part
    let descriptivePart = '';
    
    // Use the best attribute for description based on priority
    if (element.attributes['aria-label']) {
      descriptivePart = element.attributes['aria-label'];
    } else if (element.attributes.title) {
      descriptivePart = element.attributes.title;
    } else if (element.attributes.placeholder) {
      descriptivePart = element.attributes.placeholder;
    } else if (element.attributes.name && !element.attributes.name.match(/^[0-9a-f]{8,}$/i)) {
      descriptivePart = element.attributes.name;
    } else if (element.innerText) {
      // For text content, take up to 4 words to keep keys concise but descriptive
      descriptivePart = element.innerText
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join(' ');
    }
    
    // Clean the descriptive part
    descriptivePart = descriptivePart
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove non-alphanumeric chars
      .replace(/\s+/g, '_'); // Convert spaces to underscores
    
    // Create context prefix for elements with specific functionality
    let contextPrefix = '';
    
    // Add contextual prefixes
    if (element.attributes.type === 'submit') {
      contextPrefix = 'submit_';
    } else if (element.tagName === 'a' && element.attributes.href?.startsWith('http')) {
      contextPrefix = 'external_';
    } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element.tagName)) {
      contextPrefix = 'heading_';
    } else if (element.tagName === 'label') {
      contextPrefix = 'label_';
    }
    
    // Assemble the key with consistent formatting
    let key = descriptivePart ? 
      `${contextPrefix}${elementType}_${descriptivePart}` : 
      `${contextPrefix}${elementType}`;
    
    // If we still don't have a good key, add fallback with location info
    if (!descriptivePart) {
      // Extract position info from xpath for better identification
      const positionMatch = element.xpath.match(/\[(\d+)\]$/);
      const position = positionMatch ? positionMatch[1] : '';
      const parentMatch = element.xpath.match(/\/([^\/\[]+)(?:\[\d+\])?\/[^\/]+(?:\[\d+\])?$/);
      const parent = parentMatch ? parentMatch[1] : '';
      
      if (parent && position) {
        key = `${elementType}_in_${parent}_at_position_${position}`;
      } else {
        // Last resort - use a hash but make it shorter and more readable
        const hashCode = this.simpleHash(JSON.stringify(element.attributes));
        key = `${elementType}_element_${hashCode}`;
      }
    }
    
    return this.sanitizeKey(key);
  }

  /**
   * Generate a simple hash code for a string. Modified for shorter, safer hash.
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Use a shorter, URL-safe hash representation if needed
    return Math.abs(hash).toString(36).substring(0, 6);
  }

  private createElementDescription(element: any): string {
    // Keep this method for potential use with the generic AI fallback
    let description = `<${element.tagName}`;
    if (element.id) description += ` id="${element.id}"`;
    if (element.classes && element.classes.length > 0) description += ` class="${element.classes.join(' ')}"`;
    const importantAttrs = ['role', 'aria-label', 'name', 'type', 'placeholder', 'href', 'title', 'value', 'for']; // Added value, for
    importantAttrs.forEach(attr => {
      if (element.attributes[attr]) {
        description += ` ${attr}="${element.attributes[attr]}"`;
      }
    });
    description += '>';
    if (element.innerText) {
      description += element.innerText.substring(0, 100).trim();
      if (element.innerText.length > 100) description += '...';
    }
    description += `</${element.tagName}>`;
    return description;
  }

  // Renamed from processAIResponse and uses sanitizeKey
  private processAndSanitizeAIResponse(response: any): string {
    // Extract the key from the AI response
    let key = response?.text || response?.choices?.[0]?.text || '';
    return this.sanitizeKey(key || 'ai_generated_key');
  }

  /**
   * Cleans and standardizes a potential semantic key.
   * New helper method.
   */
  private sanitizeKey(key: string): string {
      // Trim, remove quotes, convert to lower snake_case
      let sanitized = key.trim().replace(/['"]/g, '');
      sanitized = sanitized.replace(/\s+/g, '_').toLowerCase();
      // Remove invalid characters (allow only letters, numbers, underscore)
      sanitized = sanitized.replace(/[^a-z0-9_]/gi, '');
      // Remove leading/trailing underscores, collapse multiple underscores
      sanitized = sanitized.replace(/^_+|_+$/g, '').replace(/_+/g, '_');
      // Prevent excessively long keys
      sanitized = sanitized.substring(0, 50); // Limit length

      // Handle empty or invalid keys after sanitization
      if (!sanitized || sanitized === '_') {
          return 'invalid_key'; // Or generate a fallback hash
      }
      // Ensure key doesn't start with a number (problematic in some contexts)
      if (/^[0-9]/.test(sanitized)) {
          sanitized = `key_${sanitized}`;
      }
      return sanitized;
  }
} 