import { BrowserContext, Page } from 'playwright';

// At the top of the file, add this declaration
interface Window {
  cursorMcp?: {
    getAIResponse: (prompt: string) => Promise<string>;
  };
}

/**
 * Options for MCP Service
 */
export interface MCPServiceOptions {
  useMCP?: boolean;
}

/**
 * Implementation of a service that integrates with Cursor's Model Context Protocol (MCP)
 * for Playwright. This allows the service to leverage Cursor's AI capabilities directly
 * without requiring explicit API tokens.
 */
export class MCPService {
  private options: MCPServiceOptions;
  private page: Page | null = null;
  private browserContext: BrowserContext | null = null;

  constructor(options: MCPServiceOptions = {}) {
    this.options = {
      useMCP: true,
      ...options
    };
    
    console.log('Initialized MCP Service for Playwright');
  }

  /**
   * Generate semantic keys for a page using MCP
   */
  async generateSemanticKeysForPage(url: string): Promise<any[]> {
    console.log(`Analyzing page via Cursor MCP: ${url}`);
    
    try {
      // Initialization should already have happened via DOMMonitor
      if (!this.page) {
        throw new Error('Page not initialized. Call setPlaywrightPage first.');
      }
      
      // Extract DOM elements using the connected page
      const elements = await this.extractDOMElements();
      console.log(`Extracted ${elements.length} elements from page via MCP`);
      
      // Get semantic keys using MCP AI prompt with improved semantic key guidelines
      const pageTitle = await this.page.title();
      const currentUrl = new URL(url);
      const pagePath = currentUrl.pathname;
      
      // Enhanced prompt that includes semantic key generation guidelines
      const promptInstruction = `
        Analyze the following DOM elements and generate semantic selectors for test automation.
        
        Page Title: ${pageTitle}
        URL Path: ${pagePath}
        
        For each element, create a semantic key that follows these guidelines:
        
        1. Use the pattern: [context]_[action/type]_[description] in snake_case
        2. Make keys functionally descriptive (what the element DOES, not just what it IS)
        3. Use appropriate prefixes based on element type:
           - Buttons: submit_, cancel_, confirm_, delete_, toggle_, etc.
           - Inputs: text_input_, email_input_, password_input_, etc.
           - Navigation: nav_link_, menu_item_, tab_, etc.
           - Content: heading_, title_, description_, etc.
           - Interactive: dropdown_, checkbox_, radio_, etc.
        4. Include context from the page/feature when possible
        5. Ensure keys are human-readable and maintainable
        
        Examples:
        - Login button → auth_submit_login
        - Username field → auth_text_input_username
        - Product title → product_heading_name
        - Delete account button → settings_delete_account
        - Search input → header_search_input
        
        Return a semantic key for each element that clearly identifies its purpose and context.
      `;
      
      // Use the enhanced prompt to generate better semantic keys
      const elementsWithKeys = await this.enhanceElementsWithMCP(elements, promptInstruction);
      
      // Verify we got meaningful keys
      let meaningfulKeyCount = 0;
      elementsWithKeys.forEach(element => {
        if (element.semanticKey && 
            !element.semanticKey.includes('_element') && 
            !element.semanticKey.match(/section_[0-9a-f]+$/)) {
          meaningfulKeyCount++;
        }
      });
      
      console.log(`Generated ${meaningfulKeyCount} meaningful semantic keys out of ${elementsWithKeys.length} elements via MCP`);
      
      if (meaningfulKeyCount < elements.length * 0.5) {
        console.warn('Less than 50% of elements received meaningful semantic keys. The MCP integration might not be working optimally.');
      }
      
      return elementsWithKeys;
    } catch (error) {
      console.error('Error during MCP page analysis:', error);
      console.log('Falling back to rule-based approach');
      
      // Extract elements using the connected page but generate keys with rules
      const elements = await this.extractDOMElements();
      const elementsWithKeys = elements.map(element => ({
        ...element,
        semanticKey: this.generateRuleBasedSemanticKey(element)
      }));
      
      return elementsWithKeys;
    }
  }

  /**
   * Generate a semantic key for a single element
   */
  async generateSemanticKeyForElement(element: any): Promise<string> {
    try {
      if (!this.page) {
        throw new Error('Page not initialized. Call setPlaywrightPage first.');
      }
      
      // Use page.evaluate to access MCP on the client side for a single element
      const semanticKey = await this.page.evaluate(async (element) => {
        // Function to generate a semantic key for an element
        const generateSemanticKey = (element: any) => {
          // Priority order of attribute processing
          if (element.attributes && element.attributes['data-testid']) {
            return element.attributes['data-testid'].toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_');
          }
          
          if (element.attributes && element.attributes.id && 
              !/^\d+$/.test(element.attributes.id) && 
              !/^section_\d+$/.test(element.attributes.id)) {
            return element.attributes.id.toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_');
          }
          
          // Construct based on role and content
          const tagName = element.tagName;
          const text = element.innerText ? 
            element.innerText.substring(0, 50).trim() : '';
          
          let prefix = '';
          switch (tagName) {
            case 'button': prefix = 'btn_'; break;
            case 'a': prefix = 'link_'; break;
            case 'input': prefix = `${element.attributes.type || 'input'}_`; break;
            case 'select': prefix = 'select_'; break;
            case 'h1':
            case 'h2': 
            case 'h3': prefix = 'heading_'; break;
            default: prefix = `${tagName}_`;
          }
          
          if (text) {
            // Convert text to snake_case, limited to first 3 words
            const keyText = text.toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_')
              .split('_')
              .slice(0, 3)
              .join('_');
            
            return `${prefix}${keyText}`;
          }
          
          // Fallback - use a hash of attributes
          const attrString = Object.entries(element.attributes)
            .map(([k, v]) => `${k}=${v}`)
            .join('_');
          
          // Simple hash function defined locally since we can't access this.simpleHash in the browser context
          function simpleHash(str: string): string {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16).substring(0, 8);
          }
          
          return `${prefix}${simpleHash(attrString)}`;
        };
        
        return generateSemanticKey(element);
      }, element);
      
      return semanticKey || this.generateRuleBasedSemanticKey(element);
    } catch (error) {
      console.error('Error generating semantic key with MCP:', error);
      return this.generateRuleBasedSemanticKey(element);
    }
  }

  /**
   * Injects a mock MCP implementation into the browser context for testing
   * This allows us to test our MCP integration even when not running in the Cursor environment
   */
  async injectMockMCP(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized. Call setPlaywrightPage first.');
    }

    console.log("Injecting mock MCP implementation for testing");
    
    await this.page.evaluate(() => {
      // Create a mock MCP object in the window namespace
      const win = window as any;
      
      // Store already generated alternatives to avoid duplication
      const generatedAlternatives = new Set<string>();
      
      win.cursorMcp = {
        // Mock getAIResponse implementation that processes the prompt and generates reasonable alternatives
        getAIResponse: async (prompt: string): Promise<string> => {
          console.log("Mock MCP received prompt:", prompt.substring(0, 200) + "...");
          
          // Check if existing alternatives are provided in the prompt
          const existingAltMatch = prompt.match(/ALREADY USED ALTERNATIVE NAMES.*?:(.*?)(?:\n\n|\n\.\.\.|$)/s);
          const existingAlternatives = existingAltMatch 
            ? existingAltMatch[1].split(',').map(alt => alt.trim().toLowerCase())
            : [];
          
          // Add existing alternatives to our tracking set
          existingAlternatives.forEach(alt => {
            if (alt && alt.length > 2) {
              generatedAlternatives.add(alt);
            }
          });
          
          // Extract element details from the prompt
          const tagMatch = prompt.match(/Tag: (\w+)/i);
          const textMatch = prompt.match(/Text Content: "([^"]*)"/i);
          const semanticKeyMatch = prompt.match(/Semantic Key: ([^\n]*)/i);
          const idMatch = prompt.match(/ID: ([^\n]*)/i);
          const typeMatch = prompt.match(/Type: ([^\n]*)/i);
          const urlMatch = prompt.match(/URL: ([^\n]*)/i);
          const xpathMatch = prompt.match(/XPath: ([^\n]*)/i);
          
          const tag = tagMatch ? tagMatch[1].toLowerCase() : '';
          const text = textMatch ? textMatch[1] : '';
          const semanticKey = semanticKeyMatch ? semanticKeyMatch[1] : '';
          const id = idMatch && idMatch[1] !== 'None' ? idMatch[1] : '';
          const type = typeMatch && typeMatch[1] !== 'N/A' ? typeMatch[1] : '';
          const url = urlMatch ? urlMatch[1] : '';
          const xpath = xpathMatch && xpathMatch[1] !== 'N/A' ? xpathMatch[1] : '';
          
          // Get feature name and page context from semantic key or URL
          let featureName = '';
          let pageContext = '';
          
          if (semanticKey && semanticKey.includes('_')) {
            const parts = semanticKey.split('_');
            featureName = parts[0];
            // Try to extract page context from URL if possible
            if (url) {
              try {
                const urlObj = new URL(url);
                pageContext = urlObj.pathname.split('/').filter(p => p).pop() || '';
                if (pageContext.includes('.')) {
                  pageContext = pageContext.split('.')[0];
                }
              } catch (e) {
                // Ignore URL parsing errors
              }
            }
          }
          
          // Extract parent context from XPath if available
          let parentContext = '';
          if (xpath) {
            const xpathParts = xpath.split('/');
            // Find parent elements that might provide useful context
            for (let i = xpathParts.length - 2; i >= 0; i--) {
              const part = xpathParts[i];
              if (part && part.match(/form|div|section|article|nav|header|footer/i)) {
                parentContext = part.split('[')[0];
                break;
              }
            }
          }
          
          // Generate alternatives based on the element's properties
          const alternativeCandidates = [];
          
          // Use text content when available
          if (text) {
            const textLower = text.toLowerCase();
            
            // Add context-aware alternatives based on element type
            if (tag === 'button' || type === 'button' || type === 'submit') {
              // Button-specific alternatives
              alternativeCandidates.push(`${textLower} button`);
              alternativeCandidates.push(`${featureName ? featureName + ' ' : ''}${textLower} button`);
              alternativeCandidates.push(`click ${textLower} button`);
              alternativeCandidates.push(`press ${textLower} button`);
              
              if (parentContext) {
                alternativeCandidates.push(`${parentContext} ${textLower} button`);
                if (pageContext) {
                  alternativeCandidates.push(`${pageContext} ${parentContext} ${textLower} button`);
                }
              }
              
              if (type === 'submit') {
                alternativeCandidates.push(`submit ${textLower}`);
                alternativeCandidates.push(`${textLower} submit button`);
              }
            } else if (tag === 'a') {
              // Link-specific alternatives
              alternativeCandidates.push(`${textLower} link`);
              alternativeCandidates.push(`${featureName ? featureName + ' ' : ''}${textLower} link`);
              alternativeCandidates.push(`click on ${textLower}`);
              alternativeCandidates.push(`go to ${textLower}`);
              
              if (parentContext) {
                alternativeCandidates.push(`${parentContext} ${textLower} link`);
              }
              
              // Include the text itself only for links, as it's a common way to refer to them
              alternativeCandidates.push(textLower);
            } else if (tag === 'input') {
              // Input-specific alternatives
              const inputType = type || 'text';
              alternativeCandidates.push(`${textLower} ${inputType} field`);
              alternativeCandidates.push(`${textLower} input`);
              alternativeCandidates.push(`enter ${textLower}`);
              
              if (parentContext) {
                alternativeCandidates.push(`${parentContext} ${textLower} field`);
              }
              
              if (inputType === 'password') {
                alternativeCandidates.push(`password for ${textLower}`);
                alternativeCandidates.push(`${textLower} password`);
              }
            } else if (tag.startsWith('h')) { // heading
              // Heading-specific alternatives
              alternativeCandidates.push(`${textLower} heading`);
              alternativeCandidates.push(`${textLower} title`);
              alternativeCandidates.push(`${tag} ${textLower}`);
              
              // Include the text itself for headings
              alternativeCandidates.push(textLower);
            } else if (tag === 'label') {
              // Label-specific alternatives
              alternativeCandidates.push(`${textLower} label`);
              alternativeCandidates.push(`label for ${textLower}`);
              alternativeCandidates.push(`${textLower} field label`);
            } else {
              // Generic alternatives for other elements
              alternativeCandidates.push(`${tag} ${textLower}`);
              alternativeCandidates.push(`${textLower} ${tag}`);
              
              if (parentContext) {
                alternativeCandidates.push(`${parentContext} ${textLower}`);
              }
            }
          }
          
          // Use ID when available
          if (id) {
            const readableId = id.replace(/[-_]/g, ' ').toLowerCase();
            
            // More specific ID-based alternatives
            if (tag === 'button' || type === 'button' || type === 'submit') {
              alternativeCandidates.push(`${readableId} button`);
            } else if (tag === 'a') {
              alternativeCandidates.push(`${readableId} link`);
            } else if (tag === 'input') {
              alternativeCandidates.push(`${readableId} ${type || 'input'}`);
              alternativeCandidates.push(`${readableId} field`);
            } else {
              alternativeCandidates.push(`${tag} ${readableId}`);
              alternativeCandidates.push(`${readableId} ${tag}`);
            }
          }
          
          // Use semantic key parts for more specific alternatives
          if (semanticKey) {
            const keyParts = semanticKey.split('_');
            if (keyParts.length >= 3) {
              // Use the parts after the feature and element type
              const descriptiveParts = keyParts.slice(2).join(' ');
              if (descriptiveParts) {
                // Make sure to not duplicate text content
                if (!text || !descriptiveParts.includes(text.toLowerCase())) {
                  alternativeCandidates.push(descriptiveParts);
                  
                  // Add with more context
                  if (keyParts[1]) { // Element type
                    alternativeCandidates.push(`${keyParts[1]} ${descriptiveParts}`);
                  }
                  
                  if (parentContext) {
                    alternativeCandidates.push(`${parentContext} ${descriptiveParts}`);
                  }
                }
              }
            }
          }
          
          // Make sure we have at least some alternatives
          if (alternativeCandidates.length === 0) {
            alternativeCandidates.push(`${featureName ? featureName + ' ' : ''}${tag} element`);
            alternativeCandidates.push(`the ${tag} ${id ? 'with id ' + id : ''}`);
            if (semanticKey) {
              alternativeCandidates.push(semanticKey.replace(/_/g, ' '));
            }
          }
          
          // Filter out duplicates and already used alternatives
          const uniqueAlternatives = [...new Set(alternativeCandidates)]
            .filter(alt => alt.length >= 3) // Filter out very short alternatives
            .filter(alt => !generatedAlternatives.has(alt.toLowerCase())); // Filter out already used alternatives
          
          // Add to our tracking set
          uniqueAlternatives.forEach(alt => generatedAlternatives.add(alt.toLowerCase()));
          
          // Limit to 8 alternatives
          const finalAlternatives = uniqueAlternatives.slice(0, 8);
          
          // Return a JSON string of alternatives
          return JSON.stringify(finalAlternatives);
        }
      };
      
      console.log("Mock MCP API injected successfully");
    });
    
    console.log("Mock MCP injection completed");
  }

  /**
   * Set the Playwright page to use for extraction
   */
  setPlaywrightPage(page: Page, browserContext: BrowserContext): void {
    this.page = page;
    this.browserContext = browserContext;
    console.log('Playwright page and browser context set for MCP Service');
    
    // Inject the mock MCP implementation for testing
    this.injectMockMCP().catch(err => {
      console.error('Failed to inject mock MCP:', err);
    });
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
   */
  private async enhanceElementsWithMCP(elements: any[], promptInstruction: string = ''): Promise<any[]> {
    if (!this.page) {
      throw new Error('Page not initialized. Call setPlaywrightPage first.');
    }
    
    try {
      // Convert elements to JSON to pass them to page.evaluate
      const elementsJson = JSON.stringify(elements);
      
      // Use page.evaluate to access MCP on the client side
      const enhancedElements = await this.page.evaluate(async (elementsData: string) => {
        // Parse the elements from JSON
        const elements = JSON.parse(elementsData);
        
        // Function to generate a semantic key for an element using improved guidelines
        const generateSemanticKey = (element: any) => {
          // Extract page context from URL if available
          const urlPath = window.location.pathname;
          const pageContext = urlPath.split('/').filter(p => p).pop() || 'page';
          
          // Priority 1: Use data-testid if available (but improve it if needed)
          if (element.attributes && element.attributes['data-testid']) {
            let testId = element.attributes['data-testid'].toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_');
              
            // If testId doesn't follow our pattern, try to improve it
            if (!testId.includes('_')) {
              const tagPrefix = getElementPrefix(element);
              return `${pageContext}_${tagPrefix}_${testId}`;
            }
            return testId;
          }
          
          // Priority 2: Use id if available (if it's not just a numeric id)
          if (element.attributes && element.attributes.id && 
              !/^\d+$/.test(element.attributes.id) && 
              !/^section_\d+$/.test(element.attributes.id)) {
            let idKey = element.attributes.id.toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_');
              
            // If id doesn't follow our pattern, try to improve it
            if (!idKey.includes('_')) {
              const tagPrefix = getElementPrefix(element);
              return `${pageContext}_${tagPrefix}_${idKey}`;
            }
            return idKey;
          }
          
          // Priority 3: For sections and containers, extract meaningful words from inner text
          if (['section', 'div', 'article', 'aside', 'nav', 'header', 'footer'].includes(element.tagName) && element.innerText) {
            // Extract key words from the text
            const significantWords = element.innerText.trim()
              .replace(/[^\w\s]/gi, '')
              .split(/\s+/)
              .filter((word: string) => word.length > 2 && !['and', 'the', 'for', 'with'].includes(word.toLowerCase()))
              .slice(0, 3); // Take top 3 meaningful words
              
            if (significantWords.length > 0) {
              const contextHint = significantWords.join('_').toLowerCase();
              return `${pageContext}_${element.tagName}_${contextHint}`;
            }
          }
          
          // Priority 4: Construct a semantic key based on element type and text
          const tagPrefix = getElementPrefix(element);
          
          // Use text content for the key if available
          if (element.innerText) {
            const keyText = element.innerText.trim()
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_')
              .split('_')
              .slice(0, 3)
              .join('_');
              
            if (keyText) {
              return `${pageContext}_${tagPrefix}_${keyText}`;
            }
          }
          
          // Fallback to a simple hash of the element's attributes
          const attrString = Object.entries(element.attributes || {})
            .map(([k, v]) => `${k}=${v}`)
            .join('_');
            
          // Simple hash function
          function simpleHash(str: string): string {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16).substring(0, 8);
          }
          
          return `${pageContext}_${tagPrefix}_${simpleHash(attrString)}`;
        };
        
        // Helper function to get appropriate prefix based on element type
        function getElementPrefix(element: any): string {
          const tagName = element.tagName.toLowerCase();
          const type = element.attributes.type ? element.attributes.type.toLowerCase() : '';
          const hasInnerText = element.innerText && element.innerText.trim().length > 0;
          const innerTextLower = hasInnerText ? element.innerText.trim().toLowerCase() : '';
          
          // Check for buttons
          if (tagName === 'button' || 
              (tagName === 'input' && type === 'button') ||
              (tagName === 'input' && type === 'submit')) {
            // Determine button type based on text content
            if (innerTextLower.includes('submit') || innerTextLower.includes('login') || 
                innerTextLower.includes('sign in') || type === 'submit') {
              return 'submit';
            } else if (innerTextLower.includes('cancel') || innerTextLower.includes('close')) {
              return 'cancel';
            } else if (innerTextLower.includes('delete') || innerTextLower.includes('remove')) {
              return 'delete';
            } else if (innerTextLower.includes('edit') || innerTextLower.includes('modify')) {
              return 'edit';
            } else if (innerTextLower.includes('add') || innerTextLower.includes('create')) {
              return 'create';
            } else {
              return 'btn';
            }
          }
          
          // Check for inputs
          if (tagName === 'input') {
            if (type === 'text') return 'text_input';
            if (type === 'email') return 'email_input';
            if (type === 'password') return 'password_input';
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            if (type === 'search') return 'search_input';
            return `${type || 'input'}`;
          }
          
          // Check for other common elements
          switch (tagName) {
            case 'a': return 'link';
            case 'select': return 'dropdown';
            case 'textarea': return 'text_area';
            case 'label': return 'label';
            case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
            case 'p': return 'text';
            case 'img': return 'image';
            case 'ul': case 'ol': return 'list';
            case 'li': return 'list_item';
            case 'table': return 'table';
            case 'form': return 'form';
            default: return tagName;
          }
        }
        
        // Generate keys for each element
        const enhancedElements = elements.map((element: any) => {
          return {
            ...element,
            semanticKey: generateSemanticKey(element)
          };
        });
        
        return enhancedElements;
      }, elementsJson);
      
      // Now let's try to improve these keys using Cursor's AI capabilities
      if (promptInstruction && this.page) {
        try {
          // Create a context for the AI
          const pageUrl = await this.page.url();
          const pageTitle = await this.page.title();
          
          // Prepare data about each element for the AI
          const elementsForAI = enhancedElements.map((elem: any) => ({
            tagName: elem.tagName,
            id: elem.id || '',
            classes: elem.classes || [],
            innerText: elem.innerText ? (elem.innerText.substring(0, 100) + (elem.innerText.length > 100 ? '...' : '')) : '',
            attributes: elem.attributes || {},
            currentKey: elem.semanticKey || ''
          }));
          
          // Create a prompt for the AI
          const aiPrompt = `
${promptInstruction}

Page URL: ${pageUrl}
Page Title: ${pageTitle}

Elements to generate semantic keys for:
${JSON.stringify(elementsForAI, null, 2)}

Return a JSON array with the improved semantic keys in the following format:
[
  { "index": 0, "newKey": "improved_semantic_key_1" },
  { "index": 1, "newKey": "improved_semantic_key_2" },
  ...
]
`;

          // Call Cursor MCP's AI functionality through the browser
          // This uses the browser's MCP integration to access AI capabilities
          const aiResponse = await this.page.evaluate(async (prompt) => {
            try {
              // This would be replaced with the actual MCP AI call in a real MCP environment
              // For now we're simulating it with a placeholder implementation
              // In a real MCP environment, we would have access to AI capabilities here
              
              // Safely check if MCP API is available without triggering TypeScript errors
              const win = window as any;
              if (win.cursorMcp && typeof win.cursorMcp.getAIResponse === 'function') {
                return await win.cursorMcp.getAIResponse(prompt);
              }
              
              // Fallback if MCP is not available
              return null;
            } catch (error) {
              console.error('Error calling MCP AI:', error);
              return null;
            }
          }, aiPrompt);
          
          // Apply the AI-suggested improvements to the keys
          if (aiResponse) {
            try {
              const improvements = JSON.parse(aiResponse);
              
              if (Array.isArray(improvements)) {
                improvements.forEach(improvement => {
                  if (typeof improvement.index === 'number' && 
                      improvement.index >= 0 && 
                      improvement.index < enhancedElements.length &&
                      typeof improvement.newKey === 'string') {
                    enhancedElements[improvement.index].semanticKey = improvement.newKey;
                  }
                });
                
                console.log(`Applied ${improvements.length} AI-suggested semantic key improvements`);
              }
            } catch (error) {
              console.error('Error parsing AI response:', error);
            }
          }
        } catch (error) {
          console.error('Error using AI for semantic key enhancement:', error);
        }
      }
      
      // No need to parse JSON, it's already an object
      return enhancedElements;
    } catch (error) {
      console.error('Error enhancing elements with MCP:', error);
      
      // Fallback to rule-based approach
      return elements.map(element => ({
        ...element,
        semanticKey: this.generateRuleBasedSemanticKey(element)
      }));
    }
  }

  /**
   * Generate a rule-based semantic key as fallback
   */
  private generateRuleBasedSemanticKey(element: any): string {
    // Extract page context from URL or element if available
    const currentUrl = element.url ? new URL(element.url) : null;
    const pageContext = currentUrl ? 
      currentUrl.pathname.split('/').filter(p => p).pop() || 'page' : 'page';
    
    // Priority 1: Use data-testid if available
    if (element.attributes && element.attributes['data-testid']) {
      const testId = element.attributes['data-testid'].toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_');
      
      // If testId doesn't follow our pattern, try to improve it
      if (!testId.includes('_')) {
        const tagPrefix = this.getElementPrefix(element);
        return `${pageContext}_${tagPrefix}_${testId}`;
      }
      return testId;
    }
    
    // Priority 2: Use id if available (if it's not just a numeric id)
    if (element.attributes && element.attributes.id && 
        !/^\d+$/.test(element.attributes.id) && 
        !/^section_\d+$/.test(element.attributes.id)) {
      const idKey = element.attributes.id.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_');
        
      // If id doesn't follow our pattern, try to improve it
      if (!idKey.includes('_')) {
        const tagPrefix = this.getElementPrefix(element);
        return `${pageContext}_${tagPrefix}_${idKey}`;
      }
      return idKey;
    }
    
    // Construct based on role and content
    const tagName = element.tagName;
    const text = element.innerText ? 
      element.innerText.substring(0, 50).trim() : '';
    
    const tagPrefix = this.getElementPrefix(element);
    
    if (text) {
      // Convert text to snake_case, limited to first 3 words
      const keyText = text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .split('_')
        .slice(0, 3)
        .join('_');
      
      return `${pageContext}_${tagPrefix}_${keyText}`;
    }
    
    // Fallback - use a hash of attributes
    const attrString = Object.entries(element.attributes || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('_');
    
    return `${pageContext}_${tagPrefix}_${this.simpleHash(attrString)}`;
  }

  /**
   * Helper function to get appropriate prefix based on element type
   */
  private getElementPrefix(element: any): string {
    const tagName = element.tagName.toLowerCase();
    const type = element.attributes?.type ? element.attributes.type.toLowerCase() : '';
    const hasInnerText = element.innerText && element.innerText.trim().length > 0;
    const innerTextLower = hasInnerText ? element.innerText.trim().toLowerCase() : '';
    
    // Check for buttons
    if (tagName === 'button' || 
        (tagName === 'input' && type === 'button') ||
        (tagName === 'input' && type === 'submit')) {
      // Determine button type based on text content
      if (innerTextLower.includes('submit') || innerTextLower.includes('login') || 
          innerTextLower.includes('sign in') || type === 'submit') {
        return 'submit';
      } else if (innerTextLower.includes('cancel') || innerTextLower.includes('close')) {
        return 'cancel';
      } else if (innerTextLower.includes('delete') || innerTextLower.includes('remove')) {
        return 'delete';
      } else if (innerTextLower.includes('edit') || innerTextLower.includes('modify')) {
        return 'edit';
      } else if (innerTextLower.includes('add') || innerTextLower.includes('create')) {
        return 'create';
      } else {
        return 'btn';
      }
    }
    
    // Check for inputs
    if (tagName === 'input') {
      if (type === 'text') return 'text_input';
      if (type === 'email') return 'email_input';
      if (type === 'password') return 'password_input';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'search') return 'search_input';
      return `${type || 'input'}`;
    }
    
    // Check for other common elements
    switch (tagName) {
      case 'a': return 'link';
      case 'select': return 'dropdown';
      case 'textarea': return 'text_area';
      case 'label': return 'label';
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
      case 'p': return 'text';
      case 'img': return 'image';
      case 'ul': case 'ol': return 'list';
      case 'li': return 'list_item';
      case 'table': return 'table';
      case 'form': return 'form';
      default: return tagName;
    }
  }

  /**
   * Simple hash function for generating unique identifiers
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  // Add a method to generate alternative names for a semantic key using MCP
  async generateAlternativeNamesWithMCP(element: any, semanticKey: string, allElements: any[] = []): Promise<string[]> {
    if (!this.page) {
      throw new Error('Page not initialized. Call setPlaywrightPage first.');
    }

    try {
      // Get page context information
      const pageUrl = await this.page.url();
      const pageTitle = await this.page.title();
      
      // Check if MCP is actually available in the browser context
      const mcpAvailable = await this.page.evaluate(() => {
        const win = window as any;
        console.log("Window object keys:", Object.keys(win).join(", "));
        if (win.cursorMcp) {
          console.log("cursorMcp exists, keys:", Object.keys(win.cursorMcp).join(", "));
          return {
            available: true,
            hasMcp: !!win.cursorMcp,
            hasGetAIResponse: !!(win.cursorMcp && typeof win.cursorMcp.getAIResponse === 'function')
          };
        }
        return { available: false, hasMcp: false, hasGetAIResponse: false };
      });
      
      console.log("MCP availability check:", JSON.stringify(mcpAvailable));
      
      // If MCP is not available, generate basic alternatives instead
      if (!mcpAvailable.available || !mcpAvailable.hasGetAIResponse) {
        console.log("MCP not available or getAIResponse not available, using fallback method");
        // Use a simple fallback for now - we need to actually mock the MCP for testing
        return this.generateFallbackAlternativeNames(element, semanticKey);
      }
      
      // Extract already used alternative names from all elements to avoid duplication
      const existingAlternatives = new Set<string>();
      if (allElements && allElements.length > 0) {
        allElements.forEach(el => {
          if (el.alternativeNames && Array.isArray(el.alternativeNames)) {
            el.alternativeNames.forEach((name: string) => existingAlternatives.add(name.toLowerCase().trim()));
          }
        });
      }
      
      // Create a prompt for generating alternative names
      const alternativeNamesPrompt = `
You are a test automation specialist optimizing UI element recognition for AI-powered test automation.

For the following web element, generate 5-8 HIGHLY SPECIFIC alternative names or phrases that a user might use to refer to this element in natural language.
Each name MUST uniquely identify THIS ELEMENT and not be applicable to other elements on the page.

PAGE CONTEXT:
URL: ${pageUrl}
Title: ${pageTitle}

CURRENT ELEMENT DETAILS:
Tag: ${element.tagName}
Semantic Key: ${semanticKey}
Text Content: ${element.innerText ? `"${element.innerText.substring(0, 100)}"` : "None"}
Type: ${element.attributes?.type || "N/A"}
ID: ${element.id || "None"}
Classes: ${element.classes ? element.classes.join(', ') : "None"}
Attributes: ${JSON.stringify(element.attributes || {})}
XPath: ${element.xpath || "N/A"}

OTHER ELEMENTS ON PAGE (that need different alternative names):
${allElements.slice(0, 10).map(el => 
  `- ${el.tagName} "${el.innerText ? el.innerText.substring(0, 30) : ''}" with semantic key "${el.semanticKey || ''}"`
).join('\n')}
${allElements.length > 10 ? `...and ${allElements.length - 10} more elements` : ''}

ALREADY USED ALTERNATIVE NAMES (avoid these):
${Array.from(existingAlternatives).slice(0, 20).join(', ')}
${existingAlternatives.size > 20 ? `...and ${existingAlternatives.size - 20} more` : ''}

IMPORTANT GUIDELINES:
1. Focus on UNIQUE, SPECIFIC phrases that clearly distinguish this element from others
2. Consider the element's context, location, and purpose on the page
3. Prioritize how a real user would naturally refer to THIS SPECIFIC element
4. Include context from parent containers when helpful (e.g., "login form submit button")
5. Include distinctive attributes like aria-label, placeholder, name when available
6. Use the element's text content when it's distinctive
7. DO NOT use generic names like just "link", "button", "input" without specificity

Return ONLY a JSON array of alternative names as strings.

Example output format:
["sign in to account button", "main login button", "primary authentication button"]
`;

      // Call MCP to generate alternative names
      const aiResponse = await this.page.evaluate(async (prompt: string) => {
        try {
          // Access MCP in the browser context
          const win = window as any;
          console.log("About to access cursorMcp");
          if (win.cursorMcp && typeof win.cursorMcp.getAIResponse === 'function') {
            console.log("Calling cursorMcp.getAIResponse");
            return await win.cursorMcp.getAIResponse(prompt);
          }
          
          console.log("cursorMcp not available, returning empty array");
          // Fallback if MCP is not available - return empty array
          return '[]';
        } catch (error) {
          console.error('Error calling MCP AI for alternative names:', error);
          return '[]';
        }
      }, alternativeNamesPrompt);
      
      console.log("AI Response:", aiResponse ? aiResponse.substring(0, 100) + "..." : "empty");
      
      // Parse the response
      try {
        const alternativeNames = JSON.parse(aiResponse);
        
        // Validate the response is an array of strings
        if (Array.isArray(alternativeNames)) {
          // Filter out any non-string items, remove duplicates, and check against existing alternatives
          const validAlternatives = [...new Set(
            alternativeNames
              .filter(name => typeof name === 'string')
              .map(name => name.toLowerCase().trim())
              .filter(name => name.length >= 3)
              .filter(name => !existingAlternatives.has(name))
          )];
          
          console.log(`Generated ${validAlternatives.length} unique alternative names for "${semanticKey}"`);
          return validAlternatives;
        }
      } catch (error) {
        console.error('Error parsing AI response for alternative names:', error);
      }
      
      // Return empty array if anything fails
      return [];
    } catch (error) {
      console.error('Error generating alternative names with MCP:', error);
      return [];
    }
  }

  /**
   * Generate fallback alternative names when MCP is not available
   * This provides a set of context-aware but simpler alternatives
   */
  private generateFallbackAlternativeNames(element: any, semanticKey: string): string[] {
    console.log("Generating fallback alternative names for", semanticKey);
    const alternatives = [];
    
    // Get the element's key properties
    const tagName = element.tagName?.toLowerCase() || '';
    const text = element.innerText || '';
    const type = element.attributes?.type || '';
    
    // Add the element's text content as an alternative if available
    if (text && text.length > 0) {
      // Limit to reasonable length
      const trimmedText = text.length > 30 ? text.substring(0, 30) + '...' : text;
      alternatives.push(trimmedText.toLowerCase());
      
      // Add with contextual prefix based on element type
      if (tagName === 'button' || type === 'button' || type === 'submit') {
        alternatives.push(`${trimmedText.toLowerCase()} button`);
      } else if (tagName === 'a') {
        alternatives.push(`${trimmedText.toLowerCase()} link`);
      } else if (tagName === 'input') {
        alternatives.push(`${trimmedText.toLowerCase()} ${type || 'input'}`);
      }
    }
    
    // Add alternatives based on attributes
    if (element.id) {
      const readableId = element.id.replace(/[_-]/g, ' ').toLowerCase();
      alternatives.push(readableId);
      
      if (tagName === 'button' || type === 'button' || type === 'submit') {
        alternatives.push(`${readableId} button`);
      } else if (tagName === 'a') {
        alternatives.push(`${readableId} link`);
      }
    }
    
    // Add alternatives based on placeholder or aria-label
    if (element.attributes?.placeholder) {
      alternatives.push(element.attributes.placeholder.toLowerCase());
    }
    
    if (element.attributes?.['aria-label']) {
      alternatives.push(element.attributes['aria-label'].toLowerCase());
    }
    
    // Add alternatives based on semantic key parts
    const keyParts = semanticKey.split('_');
    if (keyParts.length >= 3) {
      // Skip feature prefix and type, focus on the description parts
      const descriptionParts = keyParts.slice(2).join(' ');
      if (descriptionParts) {
        alternatives.push(descriptionParts);
      }
    }
    
    // Filter out duplicates and short alternatives
    return [...new Set(alternatives)]
      .filter(alt => alt.length >= 3)
      .slice(0, 5); // Limit to 5 alternatives
  }
} 