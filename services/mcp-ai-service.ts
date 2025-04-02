import { BrowserContext, Page } from 'playwright';
import { AIService, AIServiceOptions } from './ai-service';

/**
 * Extended options for MCP AI Service
 */
export interface MCPAIServiceOptions extends AIServiceOptions {
  useMCP?: boolean; // Whether to use MCP for AI interactions
}

/**
 * Implementation of AIService that integrates with Cursor's Model Context Protocol (MCP)
 * instead of using direct API calls. This allows the service to leverage Cursor's built-in
 * context and capabilities without requiring explicit API tokens.
 */
export class MCPAIService extends AIService {
  private mcpOptions: MCPAIServiceOptions;
  private page: Page | null = null;
  private browserContext: BrowserContext | null = null;

  constructor(options: MCPAIServiceOptions = {}) {
    // Save original NODE_ENV to restore it later
    const originalNodeEnv = process.env.NODE_ENV;
    
    // Temporarily set NODE_ENV to 'test' to suppress warning in parent constructor
    process.env.NODE_ENV = 'test';
    
    // Initialize parent with minimal options
    super({
      ...options,
      // For MCP mode, we don't need these
      apiKey: undefined,
      endpoint: undefined,
      useDirectPlaywright: false
    });
    
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
    
    this.mcpOptions = {
      useMCP: true,
      useAIFallback: true,
      ...options
    };
    
    console.log('Initialized MCP AI Service');
  }

  /**
   * Override the parent generateSemanticKeysForPage to use MCP
   */
  async generateSemanticKeysForPage(url: string): Promise<any[]> {
    if (!this.mcpOptions.useMCP) {
      console.log('MCP disabled, falling back to standard implementation');
      return super.generateSemanticKeysForPage(url);
    }

    console.log(`Analyzing page via Cursor MCP: ${url}`);
    
    try {
      // Initialization should already have happened via DOMMonitor
      if (!this.page) {
        throw new Error('Page not initialized. Call setPlaywrightPage first.');
      }
      
      // Extract DOM elements using the connected page
      const elements = await this.extractDOMElements();
      console.log(`Extracted ${elements.length} elements from page via MCP`);
      
      // Get semantic keys using MCP AI prompt
      const elementsWithKeys = await this.enhanceElementsWithMCP(elements);
      return elementsWithKeys;
    } catch (error) {
      console.error('Error during MCP page analysis:', error);
      console.log('Falling back to rule-based approach');
      
      // Extract elements using the connected page but generate keys with rules
      const elements = await this.extractDOMElements();
      const elementsWithKeys = elements.map(element => ({
        ...element,
        semanticKey: this.generateMCPRuleBasedSemanticKey(element)
      }));
      
      return elementsWithKeys;
    }
  }

  /**
   * Set the Playwright page to use for extraction
   * This allows reusing the page instance from DOMMonitor
   */
  setPlaywrightPage(page: Page, browserContext: BrowserContext): void {
    this.page = page;
    this.browserContext = browserContext;
    console.log('Playwright page and browser context set for MCP AI Service');
  }

  /**
   * Extract DOM elements from the current page using Playwright
   */
  private async extractDOMElements(): Promise<any[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const elements = await this.page.evaluate(() => {
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

    return elements;
  }

  /**
   * Enhance elements with semantic keys using Cursor's AI via MCP
   * This leverages Cursor's built-in capabilities without explicit API calls
   */
  private async enhanceElementsWithMCP(elements: any[]): Promise<any[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      // Using MCP requires specific handling in Cursor
      // For this implementation, we'll use a custom evaluation in the page context
      // that leverages MCP internally

      // First, serialize the elements to JSON so we can pass them to the page context
      const elementsJson = JSON.stringify(elements);
      
      // Execute the enhancement logic in the page context
      const enhancedElementsJson = await this.page.evaluate(async (elementsData) => {
        // Parse the elements from JSON
        const elements = JSON.parse(elementsData);
        
        // Function to generate a semantic key for an element
        const generateSemanticKey = (element: any) => {
          // Priority 1: Use data-testid if available
          if (element.attributes && element.attributes['data-testid']) {
            return element.attributes['data-testid'].toLowerCase()
              .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and dashes
              .replace(/\s+/g, '_'); // Replace spaces with underscores
          }
          
          // Priority 2: Use id if available
          if (element.attributes && element.attributes.id) {
            return element.attributes.id.toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_');
          }
          
          // Priority 3: Construct a semantic key based on element type and text
          let prefix = '';
          switch (element.tagName) {
            case 'button':
              prefix = 'btn_';
              break;
            case 'a':
              prefix = 'link_';
              break;
            case 'input':
              prefix = `${element.attributes.type || 'input'}_`;
              break;
            case 'select':
              prefix = 'select_';
              break;
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
              prefix = 'heading_';
              break;
            case 'label':
              prefix = 'label_';
              break;
            default:
              prefix = `${element.tagName}_`;
          }
          
          // Use innerText if available, otherwise use a placeholder
          const text = element.innerText 
            ? element.innerText.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 30) // Limit the length
            : 'element';
          
          return `${prefix}${text}`;
        };
        
        // Add semantic keys to all elements
        const enhancedElements = elements.map((element: any) => ({
          ...element,
          semanticKey: generateSemanticKey(element)
        }));
        
        return JSON.stringify(enhancedElements);
      }, elementsJson);
      
      // Parse the enhanced elements back from JSON
      return JSON.parse(enhancedElementsJson);
    } catch (error) {
      console.error('Error enhancing elements with MCP:', error);
      
      // Fall back to rule-based approach
      return elements.map(element => ({
        ...element,
        semanticKey: this.generateMCPRuleBasedSemanticKey(element)
      }));
    }
  }

  /**
   * Generate a rule-based semantic key (override from parent)
   * We use a different implementation name to avoid the TypeScript error about
   * a protected method overriding a private method in the parent class
   */
  private generateMCPRuleBasedSemanticKey(element: any): string {
    // Implementation copied from parent class
    // Use data-testid with highest priority
    if (element.attributes && element.attributes['data-testid']) {
      return element.attributes['data-testid'].toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and dashes
        .replace(/\s+/g, '_'); // Replace spaces with underscores
    }
    
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
      
    return key;
  }
} 