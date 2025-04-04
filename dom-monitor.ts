import { Browser, BrowserContext, Page, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { MCPService } from './services/mcp-ai-service';
import * as crypto from 'crypto';

interface DOMMonitorOptions {
  elementSelector?: string;
  waitForSelector?: string;
  waitTimeout?: number;
  outputPath?: string;
  featureName?: string;
  useAI?: boolean;
  useMCP?: boolean;
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
}

export class DOMMonitor {
  private options: DOMMonitorOptions;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private browserContext: BrowserContext | null = null;
  private currentUrl: string | null = null;
  private mcpService: MCPService | null = null;

  constructor(options: DOMMonitorOptions = {}) {
    this.options = {
      elementSelector: '*[id], button, a, input, select, h1, h2, h3, label',
      waitTimeout: 5000,
      outputPath: './mappings',
      ...options
    };
    
    // Create MCPService by default
    this.mcpService = new MCPService();
  }

  async init() {
    this.browser = await chromium.launch();
  }

  async navigateTo(url: string) {
    if (!this.browser) {
      await this.init();
    }
    
    this.browserContext = await this.browser!.newContext();
    this.page = await this.browserContext.newPage();
    await this.page.goto(url);
    this.currentUrl = url;

    // Set the page object in the MCP service
    if (this.mcpService && this.page && this.browserContext) {
      this.mcpService.setPlaywrightPage(this.page, this.browserContext);
    }

    if (this.options.waitForSelector) {
      await this.page.waitForSelector(this.options.waitForSelector, { 
        timeout: this.options.waitTimeout 
      });
    }
  }

  async extractDOMElements(): Promise<DOMElement[]> {
    if (!this.page) {
      throw new Error('Page not initialized. Call navigateTo first.');
    }

    const selector = this.options.elementSelector || '*[id], button, a, input, select, h1, h2, h3, label';
    
    const elements = await this.page.evaluate((selector) => {
      const elements = Array.from(document.querySelectorAll(selector));
      return elements.map(element => {
        // Get XPath
        const getXPath = (el: Element): string => {
          if (!el.parentElement) return '';
          const siblings = Array.from(el.parentElement.children);
          const index = siblings.indexOf(el) + 1;
          const tagName = el.tagName.toLowerCase();
          const siblingTag = siblings.filter(sibling => 
            sibling.tagName.toLowerCase() === tagName
          );
          
          const xpathIndex = siblingTag.length > 1 ? 
            `[${siblingTag.indexOf(el) + 1}]` : '';
          
          return `${getXPath(el.parentElement)}/${tagName}${xpathIndex}`;
        };

        // Get element attributes
        const attributes: Record<string, string> = {};
        Array.from(element.attributes).forEach(attr => {
          attributes[attr.name] = attr.value;
        });

        // Safely handle className which might not be a string
        let classes;
        if (element.className) {
          if (typeof element.className === 'string') {
            // Normal case: className is a string
            classes = element.className.split(' ').filter((c: string) => c);
          } else if (typeof element.className === 'object' && 
                     'baseVal' in element.className &&
                     typeof (element.className as any).baseVal === 'string') {
            // SVG case: className is an SVGAnimatedString with baseVal property
            classes = (element.className as any).baseVal.split(' ').filter((c: string) => c);
          } else {
            // Other cases: just convert to string as fallback
            try {
              const classString = String(element.className);
              classes = classString.split(' ').filter((c: string) => c);
            } catch (e) {
              classes = undefined;
            }
          }
        }

        return {
          tagName: element.tagName.toLowerCase(),
          id: element.id || undefined,
          classes: classes,
          attributes,
          innerText: element.textContent?.trim() || undefined,
          xpath: getXPath(element),
        };
      });
    }, selector);
    
    // Add URL and feature name to each element
    return elements.map(element => ({
      ...element,
      url: this.currentUrl || undefined,
      featureName: this.options.featureName
    }));
  }

  async generateSemanticKeys(elements: DOMElement[]): Promise<DOMElement[]> {
    console.log(`Generating semantic keys for ${elements.length} elements`);
    
    if (this.options.useMCP && this.mcpService) {
      try {
        // Use MCP to enhance elements with semantic keys
        const enhancedElements = await this.mcpService.generateSemanticKeysForPage(this.currentUrl || 'unknown');
        console.log(`Generated ${enhancedElements.filter(e => e.semanticKey).length} semantic keys using MCP`);
        
        // Map the semantic keys back to our original elements and add stable IDs
        const processedElements = [];
        
        for (const element of elements) {
          const matchingEnhanced = enhancedElements.find(e => 
            e.tagName === element.tagName && 
            e.id === element.id && 
            e.xpath === element.xpath
          );
          
          // Use enhanced key if available, otherwise generate a basic one
          const semanticKey = matchingEnhanced?.semanticKey || this.generateBasicSemanticKey(element, elements.indexOf(element));
          
          // Add feature name prefix if available
          let finalKey = semanticKey;
          if (typeof finalKey === 'string' && this.options.featureName && 
              !finalKey.startsWith(this.options.featureName.toLowerCase())) {
            finalKey = `${this.options.featureName.toLowerCase()}_${finalKey}`;
          }
          
          // Create an enhanced element with semantic key
          const enhancedElement = {
            ...element,
            semanticKey: finalKey,
            stableId: this.generateStableId(element),
          };
          
          processedElements.push(enhancedElement);
        }
        
        // Now that we have all elements with semantic keys, generate alternative names
        // Process in two passes to allow awareness of other elements
        
        // First, collect all elements with their basic info
        for (const element of processedElements) {
          if (!element.alternativeNames) {
            element.alternativeNames = [];
          }
        }
        
        // Second pass: generate alternative names with awareness of other elements
        for (const element of processedElements) {
          if (this.mcpService && element.semanticKey && typeof element.semanticKey === 'string') {
            try {
              // Pass all elements to provide context
              element.alternativeNames = await this.mcpService.generateAlternativeNamesWithMCP(
                element, 
                element.semanticKey,
                processedElements.filter(e => e !== element) // Pass all other elements for context
              );
              
              // Add a basic fallback if MCP didn't return any alternatives
              if (!element.alternativeNames || element.alternativeNames.length === 0) {
                element.alternativeNames = this.generateBasicAlternativeNames(element);
              }
            } catch (error) {
              console.error('Error generating alternative names with MCP, falling back to basic method:', error);
              element.alternativeNames = this.generateBasicAlternativeNames(element);
            }
          } else {
            // Fall back to basic alternatives if MCP is not available
            element.alternativeNames = this.generateBasicAlternativeNames(element);
          }
        }
        
        return processedElements;
      } catch (error) {
        console.error('Error using MCP for semantic keys, falling back to rule-based approach:', error);
        return this.generateRuleBasedSemanticKeys(elements);
      }
    } else {
      // Use rule-based approach
      return this.generateRuleBasedSemanticKeys(elements);
    }
  }

  private generateBasicSemanticKey(element: DOMElement, index: number): string {
    // Extract a basic semantic key from element properties
    let key = '';
    
    // Try to use data-testid or id as a starting point
    if (element.attributes && element.attributes['data-testid']) {
      key = element.attributes['data-testid'];
    } else if (element.id) {
      key = element.id;
    } else if (element.innerText) {
      // Create a key from the first few words of inner text
      key = element.innerText
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .split('_')
        .slice(0, 3)
        .join('_');
    }
    
    // If we couldn't generate a meaningful key, use a simple fallback
    if (!key) {
      key = `${element.tagName.toLowerCase()}_${index}`;
    }
    
    // Prefix with element type
    const elementType = this.getElementType(element);
    return `${elementType}_${key}`;
  }

  private getElementType(element: DOMElement): string {
    const tagName = element.tagName.toLowerCase();
    const type = element.attributes?.type?.toLowerCase();
    
    if (tagName === 'button' || (tagName === 'input' && (type === 'button' || type === 'submit'))) {
      return 'button';
    } else if (tagName === 'input') {
      if (type === 'text') return 'text_input';
      if (type === 'email') return 'email_input';
      if (type === 'password') return 'password_input';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      return `${type || 'input'}`;
    } else if (tagName === 'a') {
      return 'link';
    } else if (tagName === 'select') {
      return 'dropdown';
    } else {
      return tagName;
    }
  }

  private async generateRuleBasedSemanticKeys(elements: DOMElement[]): Promise<DOMElement[]> {
    const processedElements = [];
    
    // First pass: generate basic keys and stable IDs
    for (const element of elements) {
      const basicKey = this.generateBasicSemanticKey(element, elements.indexOf(element));
      
      // Add feature name prefix if available
      let semanticKey = basicKey;
      if (this.options.featureName && !semanticKey.startsWith(this.options.featureName.toLowerCase())) {
        semanticKey = `${this.options.featureName.toLowerCase()}_${semanticKey}`;
      }
      
      element.semanticKey = semanticKey;
      
      // Generate a stable ID based on position, attributes, and tag
      element.stableId = this.generateStableId(element);
      
      if (!element.alternativeNames) {
        element.alternativeNames = [];
      }
      
      processedElements.push(element);
    }
    
    // Second pass: generate alternative names with awareness of other elements
    for (const element of processedElements) {
      // Generate alternative names using MCP if available, otherwise use basic method
      if (this.mcpService && element.semanticKey && typeof element.semanticKey === 'string') {
        try {
          element.alternativeNames = await this.mcpService.generateAlternativeNamesWithMCP(
            element, 
            element.semanticKey,
            processedElements.filter(e => e !== element) // Pass all other elements for context
          );
          
          // Add a basic fallback if MCP didn't return any alternatives
          if (!element.alternativeNames || element.alternativeNames.length === 0) {
            element.alternativeNames = this.generateBasicAlternativeNames(element);
          }
        } catch (error) {
          console.error('Error generating alternative names with MCP in rule-based approach, falling back to basic method:', error);
          element.alternativeNames = this.generateBasicAlternativeNames(element);
        }
      } else {
        // Fall back to basic alternatives if MCP is not available
        element.alternativeNames = this.generateBasicAlternativeNames(element);
      }
    }
    
    return processedElements;
  }

  private generateStableId(element: DOMElement): string {
    // Create a consistent hash from element properties that are less likely to change
    const stableProps = {
      tagName: element.tagName,
      role: element.attributes?.role,
      position: element.xpath ? element.xpath.split('/').length : 0, // Depth in DOM
      // Include a subset of the most stable attributes
      label: element.attributes?.['aria-label'] || element.attributes?.placeholder || element.attributes?.name,
      text: element.innerText ? element.innerText.substring(0, 50) : ''
    };
    
    // Create a hash of these properties
    const hashInput = JSON.stringify(stableProps);
    const hash = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 8);
    
    // Create an ID like "e123abc" that combines the element type with the hash
    return `e${hash}`;
  }

  private generateAlternativeNames(element: DOMElement): string[] {
    const alternativeNames: string[] = [];
    
    if (!element.semanticKey || typeof element.semanticKey !== 'string') {
      return alternativeNames;
    }
    
    const semanticKey = element.semanticKey;
    const tagName = element.tagName.toLowerCase();
    const innerText = element.innerText ? element.innerText.trim().toLowerCase() : '';
    const type = element.attributes?.type?.toLowerCase();
    
    // 1. Extract key parts and concepts for processing
    const keyParts = semanticKey.split('_');
    const keyLower = semanticKey.toLowerCase();
    
    // Detect common concepts in the semantic key
    const hasLoginConcept = keyLower.includes('login') || keyLower.includes('signin') || keyLower.includes('sign_in');
    const hasSignupConcept = keyLower.includes('signup') || keyLower.includes('register') || keyLower.includes('sign_up');
    const hasSubmitConcept = keyLower.includes('submit') || keyLower.includes('confirm');
    const hasCancelConcept = keyLower.includes('cancel') || keyLower.includes('close');
    const hasSearchConcept = keyLower.includes('search');
    const hasUsernameConcept = keyLower.includes('username') || keyLower.includes('user_name') || keyLower.includes('userid');
    const hasPasswordConcept = keyLower.includes('password') || keyLower.includes('pass');
    const hasEmailConcept = keyLower.includes('email');
    const hasNavConcept = keyLower.includes('nav') || keyLower.includes('menu');
    
    // 2. Add basic semantic key variations
    
    // Add the pure key without prefixes
    if (keyParts.length >= 3) {
      // Skip the feature/context and type parts
      const descriptionParts = keyParts.slice(2);
      alternativeNames.push(descriptionParts.join(' '));
      
      // Add with type prefix (e.g., "button login" instead of just "login")
      if (keyParts[1]) {
        alternativeNames.push(`${keyParts[1]} ${descriptionParts.join(' ')}`);
      }
    }
    
    // Add just the description part
    if (keyParts.length >= 3) {
      alternativeNames.push(keyParts.slice(2).join(' '));
    }
    
    // Add the last part as a simple name
    if (keyParts.length > 0) {
      alternativeNames.push(keyParts[keyParts.length - 1]);
    }
    
    // 3. Add element-specific variations
    
    // Handle buttons with extensive alternatives
    if (tagName === 'button' || keyLower.includes('button') || keyLower.includes('btn') || 
        (tagName === 'input' && (type === 'button' || type === 'submit')) ||
        keyLower.includes('submit')) {
      
      // Add "button" to description if it doesn't already contain it
      const hasButtonWord = alternativeNames.some(name => name.includes('button'));
      if (!hasButtonWord && keyParts.length >= 3) {
        alternativeNames.push(`${keyParts.slice(2).join(' ')} button`);
      }
      
      // Add verb-noun combinations that users might type
      if (innerText) {
        alternativeNames.push(`press ${innerText}`);
        alternativeNames.push(`click ${innerText}`);
        alternativeNames.push(`select ${innerText}`);
        alternativeNames.push(`${innerText} button`);
      }
      
      // Add action-oriented alternatives for common button types
      if (hasLoginConcept) {
        alternativeNames.push('sign in');
        alternativeNames.push('sign in button');
        alternativeNames.push('log in');
        alternativeNames.push('log in button');
        alternativeNames.push('login');
        alternativeNames.push('login button');
        alternativeNames.push('access account');
        alternativeNames.push('enter credentials');
        alternativeNames.push('authenticate');
      } else if (hasSignupConcept) {
        alternativeNames.push('sign up');
        alternativeNames.push('sign up button');
        alternativeNames.push('register');
        alternativeNames.push('register button');
        alternativeNames.push('create account');
        alternativeNames.push('join');
        alternativeNames.push('new account');
        alternativeNames.push('registration');
      } else if (hasSubmitConcept) {
        alternativeNames.push('submit');
        alternativeNames.push('submit button');
        alternativeNames.push('confirm');
        alternativeNames.push('confirm button');
        alternativeNames.push('continue');
        alternativeNames.push('proceed');
        alternativeNames.push('send');
        alternativeNames.push('apply');
      } else if (hasCancelConcept) {
        alternativeNames.push('cancel');
        alternativeNames.push('cancel button');
        alternativeNames.push('close');
        alternativeNames.push('close button');
        alternativeNames.push('dismiss');
        alternativeNames.push('exit');
        alternativeNames.push('go back');
        alternativeNames.push('back button');
      } else if (keyLower.includes('save')) {
        alternativeNames.push('save');
        alternativeNames.push('save button');
        alternativeNames.push('store');
        alternativeNames.push('update');
        alternativeNames.push('keep');
        alternativeNames.push('preserve changes');
      } else if (keyLower.includes('delete') || keyLower.includes('remove')) {
        alternativeNames.push('delete');
        alternativeNames.push('delete button');
        alternativeNames.push('remove');
        alternativeNames.push('trash');
        alternativeNames.push('delete button');
        alternativeNames.push('remove button');
        alternativeNames.push('eliminate');
      } else if (keyLower.includes('edit') || keyLower.includes('modify')) {
        alternativeNames.push('edit');
        alternativeNames.push('edit button');
        alternativeNames.push('modify');
        alternativeNames.push('change');
        alternativeNames.push('update');
        alternativeNames.push('alter');
      } else if (keyLower.includes('add') || keyLower.includes('create') || keyLower.includes('new')) {
        alternativeNames.push('add');
        alternativeNames.push('add button');
        alternativeNames.push('create');
        alternativeNames.push('new');
        alternativeNames.push('insert');
        alternativeNames.push('plus');
      }
    }
    
    // Handle inputs with comprehensive alternatives
    else if (tagName === 'input' || keyLower.includes('input') || keyLower.includes('field')) {
      // Add common input field references
      alternativeNames.push(`${type || 'text'} field`);
      alternativeNames.push(`${type || 'text'} input`);
      alternativeNames.push(`${type || 'text'} box`);
      
      // Add specific input types
      if (hasUsernameConcept) {
        alternativeNames.push('username');
        alternativeNames.push('username field');
        alternativeNames.push('username input');
        alternativeNames.push('user id');
        alternativeNames.push('login id');
        alternativeNames.push('user name');
        alternativeNames.push('account name');
        alternativeNames.push('login name');
      } else if (hasPasswordConcept) {
        alternativeNames.push('password');
        alternativeNames.push('password field');
        alternativeNames.push('password input');
        alternativeNames.push('pass');
        alternativeNames.push('secret');
        alternativeNames.push('security code');
        alternativeNames.push('passphrase');
      } else if (hasEmailConcept) {
        alternativeNames.push('email');
        alternativeNames.push('email field');
        alternativeNames.push('email input');
        alternativeNames.push('email address');
        alternativeNames.push('mail');
        alternativeNames.push('e-mail');
      } else if (hasSearchConcept) {
        alternativeNames.push('search');
        alternativeNames.push('search field');
        alternativeNames.push('search input');
        alternativeNames.push('search box');
        alternativeNames.push('find');
        alternativeNames.push('lookup');
        alternativeNames.push('query');
      } else if (type === 'checkbox') {
        alternativeNames.push('checkbox');
        alternativeNames.push('check');
        alternativeNames.push('tick');
        alternativeNames.push('toggle');
        alternativeNames.push('option');
        alternativeNames.push('checkmark');
      } else if (type === 'radio') {
        alternativeNames.push('radio');
        alternativeNames.push('radio button');
        alternativeNames.push('option');
        alternativeNames.push('radio option');
        alternativeNames.push('selection');
        alternativeNames.push('choice');
      }
      
      // Add placeholder text as an alternative
      if (element.attributes?.placeholder) {
        alternativeNames.push(element.attributes.placeholder.toLowerCase());
        alternativeNames.push(`${element.attributes.placeholder.toLowerCase()} field`);
      }
      
      // Add label text if it might exist
      if (element.attributes?.name) {
        alternativeNames.push(element.attributes.name.toLowerCase().replace(/[_-]/g, ' '));
      }
    }
    
    // Handle links with comprehensive alternatives
    else if (tagName === 'a' || keyLower.includes('link')) {
      alternativeNames.push('link');
      
      if (innerText) {
        alternativeNames.push(`${innerText} link`);
        alternativeNames.push(innerText);
        alternativeNames.push(`link to ${innerText}`);
        alternativeNames.push(`go to ${innerText}`);
        alternativeNames.push(`navigate to ${innerText}`);
      }
      
      if (element.attributes?.href) {
        const href = element.attributes.href;
        // Extract the last part of the URL path as a name
        const urlParts = href.split('/').filter(Boolean);
        if (urlParts.length > 0) {
          const lastPart = urlParts[urlParts.length - 1].replace(/[_\-\.]/g, ' ');
          if (lastPart.length > 0) {
            alternativeNames.push(lastPart);
            alternativeNames.push(`${lastPart} link`);
          }
        }
      }
    }
    
    // Handle selects/dropdowns
    else if (tagName === 'select' || keyLower.includes('select') || keyLower.includes('dropdown')) {
      alternativeNames.push('dropdown');
      alternativeNames.push('select');
      alternativeNames.push('select box');
      alternativeNames.push('dropdown menu');
      alternativeNames.push('combo box');
      alternativeNames.push('selection box');
      alternativeNames.push('options');
      alternativeNames.push('picker');
      
      if (element.attributes?.name) {
        const name = element.attributes.name.toLowerCase().replace(/[_-]/g, ' ');
        alternativeNames.push(`${name} dropdown`);
        alternativeNames.push(`${name} select`);
        alternativeNames.push(`${name} options`);
      }
    }
    
    // Handle navigation elements
    else if (hasNavConcept || tagName === 'nav') {
      alternativeNames.push('navigation');
      alternativeNames.push('menu');
      alternativeNames.push('nav');
      alternativeNames.push('navbar');
      alternativeNames.push('site menu');
      alternativeNames.push('navigation bar');
      alternativeNames.push('menu bar');
      
      if (innerText) {
        alternativeNames.push(`${innerText} menu`);
        alternativeNames.push(`${innerText} navigation`);
        alternativeNames.push(`${innerText} nav`);
      }
    }
    
    // 4. Add alternatives based on element attributes
    
    // If element has innerText, use it as an alternative with variations
    if (innerText) {
      // Use the full text if it's not too long
      if (innerText.length < 30) {
        alternativeNames.push(innerText);
        
        // Add with element type if it makes sense
        if (!alternativeNames.some(name => name === `${tagName} ${innerText}`)) {
          alternativeNames.push(`${tagName} ${innerText}`);
        }
      }
      
      // Also add the first few words for longer text
      const firstFewWords = innerText.split(/\s+/).slice(0, 3).join(' ');
      if (firstFewWords.length > 0 && firstFewWords !== innerText) {
        alternativeNames.push(firstFewWords);
      }
    }
    
    // Add aria attributes as alternatives
    if (element.attributes?.['aria-label']) {
      alternativeNames.push(element.attributes['aria-label'].toLowerCase());
    }
    
    if (element.attributes?.title) {
      alternativeNames.push(element.attributes.title.toLowerCase());
    }
    
    // 5. Add variations with parent context if available
    if (element.xpath) {
      // Try to extract parent context from xpath
      const xpathParts = element.xpath.split('/');
      const parentTags = xpathParts.filter(part => part && !part.includes('[') && part !== '');
      
      if (parentTags.length > 1) {
        const parentTag = parentTags[parentTags.length - 2].toLowerCase();
        
        // Add context for common parent elements
        if (['header', 'footer', 'nav', 'main', 'aside', 'form'].includes(parentTag)) {
          alternativeNames.push(`${parentTag} ${tagName}`);
          
          if (innerText && innerText.length < 30) {
            alternativeNames.push(`${parentTag} ${innerText}`);
          }
        }
      }
    }
    
    // Remove duplicates and very short names (less than 3 chars)
    return [...new Set(alternativeNames)]
      .filter(name => name.length >= 3)
      .slice(0, 15); // Limit to 15 alternatives to avoid overly large mapping files
  }

  async saveReport(url: string, elements: DOMElement[]) {
    if (!fs.existsSync(this.options.outputPath!)) {
      fs.mkdirSync(this.options.outputPath!, { recursive: true });
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathname = urlObj.pathname.replace(/\//g, '_');
    
    // Add feature name to filename if available
    const featurePrefix = this.options.featureName ? 
      `${this.options.featureName.toLowerCase()}_` : '';
    
    const filename = `${featurePrefix}${hostname}${pathname}.json`;
    const filePath = path.join(this.options.outputPath!, filename);

    // Get current timestamp for the report
    const timestamp = new Date().toISOString();

    // Metadata for the JSON report
    const metadata = {
      url,
      timestamp,
      featureName: this.options.featureName || 'Unknown',
      elementCount: elements.length
    };

    // Ensure each element has the URL
    const elementsWithUrl = elements.map(el => ({
      ...el,
      url: url
    }));

    // Write JSON with metadata
    const jsonData = {
      metadata,
      elements: elementsWithUrl
    };
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

    // Generate HTML report
    const htmlPath = path.join(this.options.outputPath!, `${featurePrefix}${hostname}${pathname}.html`);
    const htmlContent = this.generateHTMLReport(url, elementsWithUrl, timestamp);
    fs.writeFileSync(htmlPath, htmlContent);

    return { jsonPath: filePath, htmlPath };
  }

  private generateHTMLReport(url: string, elements: DOMElement[], timestamp: string): string {
    const featureInfo = this.options.featureName ? 
      `<p>Feature: ${this.options.featureName}</p>` : '';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>DOM Monitor Report - ${url}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .element { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
        .tag { color: #0066cc; font-weight: bold; }
        .id { color: #cc6600; }
        .semantic { color: #009900; font-weight: bold; }
        .feature { color: #990099; font-weight: bold; }
        .metadata { background-color: #f0f8ff; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .search-box { margin: 10px 0; padding: 10px; }
        .search-box input { padding: 8px; width: 300px; }
        .filters { margin: 10px 0; }
        .filters button { margin-right: 5px; padding: 5px 10px; cursor: pointer; }
        .hidden { display: none; }
        .alternatives { background-color: #f9f9f9; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .alternatives ul { margin: 0; padding-left: 20px; columns: 3; column-gap: 20px; }
        .alternatives li { margin-bottom: 3px; }
        @media (max-width: 768px) {
          .alternatives ul { columns: 1; }
        }
      </style>
      <script>
        function filterElements() {
          const searchText = document.getElementById('search').value.toLowerCase();
          const elements = document.getElementsByClassName('element');
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const text = element.textContent.toLowerCase();
            
            if (text.includes(searchText)) {
              element.classList.remove('hidden');
            } else {
              element.classList.add('hidden');
            }
          }
        }
        
        function filterByTag(tag) {
          const elements = document.getElementsByClassName('element');
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const elementTag = element.getAttribute('data-tag');
            
            if (tag === 'all' || elementTag === tag) {
              element.classList.remove('hidden');
            } else {
              element.classList.add('hidden');
            }
          }
        }
      </script>
    </head>
    <body>
      <h1>DOM Monitor Report</h1>
      <div class="metadata">
        <p>URL: ${url}</p>
        ${featureInfo}
        <p>Elements found: ${elements.length}</p>
        <p>Generated: ${new Date(timestamp).toLocaleString()}</p>
      </div>
      
      <div class="search-box">
        <input type="text" id="search" placeholder="Search elements..." onkeyup="filterElements()">
      </div>
      
      <div class="filters">
        <button onclick="filterByTag('all')">All</button>
        ${Array.from(new Set(elements.map(e => e.tagName))).map(tag => 
          `<button onclick="filterByTag('${tag}')">${tag}</button>`
        ).join('')}
      </div>
      
      <h2>Elements</h2>
      ${elements.map(element => `
        <div class="element" data-tag="${element.tagName}">
          <p><span class="tag">${element.tagName}</span> ${element.id ? `<span class="id">id="${element.id}"</span>` : ''}</p>
          ${element.semanticKey ? `<p><span class="semantic">Semantic Key: ${element.semanticKey}</span></p>` : ''}
          ${element.stableId ? `<p><span class="feature">Stable ID: ${element.stableId}</span></p>` : ''}
          ${element.featureName ? `<p><span class="feature">Feature: ${element.featureName}</span></p>` : ''}
          <p>XPath: ${element.xpath}</p>
          ${element.innerText ? `<p>Text: "${element.innerText.substring(0, 100)}${element.innerText.length > 100 ? '...' : ''}"</p>` : ''}
          
          ${element.alternativeNames && element.alternativeNames.length > 0 ? `
          <h3>Alternative Names</h3>
          <div class="alternatives">
            <ul>
              ${element.alternativeNames.map(alt => `<li>${alt}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          <h3>Attributes</h3>
          <table>
            <tr><th>Name</th><th>Value</th></tr>
            ${Object.entries(element.attributes).map(([key, value]) => `
              <tr><td>${key}</td><td>${value}</td></tr>
            `).join('')}
          </table>
          
          <h3>Suggested Playwright Selector</h3>
          <code>
            ${element.id ? `page.locator('#${element.id}')` : 
              element.attributes['data-testid'] ? `page.locator('[data-testid="${element.attributes['data-testid']}"]')` : 
              element.innerText ? `page.locator('${element.tagName}:has-text("${element.innerText.substring(0, 50).replace(/"/g, '\\"')}")` : 
              `page.locator('${element.xpath}')`}
          </code>
        </div>
      `).join('')}
    </body>
    </html>
    `;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Wait for network activity to be idle
   * @param timeout Optional timeout in milliseconds
   */
  async waitForNetworkIdle(timeout?: number) {
    if (!this.page) {
      throw new Error('Page not initialized. Call navigateTo first.');
    }
    
    try {
      await this.page.waitForLoadState('networkidle', { 
        timeout: timeout || this.options.waitTimeout 
      });
    } catch (error) {
      console.warn('Network idle timeout');
    }
  }

  /**
   * Wait for a specified amount of time
   * @param ms Time to wait in milliseconds
   */
  async waitForTimeout(ms: number) {
    if (!this.page) {
      throw new Error('Page not initialized. Call navigateTo first.');
    }
    
    await this.page.waitForTimeout(ms);
  }

  /**
   * Take a screenshot of the current page
   * @param path File path where to save the screenshot
   * @param fullPage Whether to take a screenshot of the full page or just the viewport
   * @param skipScreenshot If true, no screenshot will be taken
   */
  async takeScreenshot(path: string, fullPage: boolean = false, skipScreenshot: boolean = false) {
    if (!this.page) {
      throw new Error('Page not initialized. Call navigateTo first.');
    }
    
    if (skipScreenshot) {
      console.log('Skipping screenshot generation as per configuration.');
      return;
    }
    
    await this.page.screenshot({
      path,
      fullPage
    });
  }

  /**
   * Basic fallback method to generate a few alternative names when MCP is not available
   * This is much simpler than our original extensive method, just to provide some alternatives
   */
  private generateBasicAlternativeNames(element: DOMElement): string[] {
    const alternativeNames: string[] = [];
    
    if (!element.semanticKey || typeof element.semanticKey !== 'string') {
      return alternativeNames;
    }
    
    const semanticKey = element.semanticKey;
    const keyParts = semanticKey.split('_');
    
    // Add the last part as a simple name
    if (keyParts.length > 0) {
      alternativeNames.push(keyParts[keyParts.length - 1]);
    }
    
    // Add alternative from the semantic key structure
    if (keyParts.length >= 3) {
      // Skip the feature/context and type parts
      const descriptionParts = keyParts.slice(2);
      alternativeNames.push(descriptionParts.join(' '));
    }
    
    // Add text content as alternative if available and not too long
    if (element.innerText && element.innerText.trim()) {
      const text = element.innerText.trim().toLowerCase();
      if (text.length < 30) {
        alternativeNames.push(text);
      }
    }
    
    // Remove duplicates and very short names (less than 3 chars)
    return [...new Set(alternativeNames)]
      .filter(name => name.length >= 3);
  }

  /**
   * Reads DOM elements from an existing mapping file if it exists
   * @param filePath Path to the existing mapping file
   * @returns The DOM elements from the file or null if file doesn't exist
   */
  private readExistingMappingFile(filePath: string): { elements: DOMElement[], timestamp?: string } | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      
      // Handle both old (array) and new (object with metadata and elements) formats
      if (Array.isArray(jsonData)) {
        // Old format - just an array of elements
        return { elements: jsonData };
      } else if (jsonData.elements && Array.isArray(jsonData.elements)) {
        // New format - object with metadata and elements
        return { 
          elements: jsonData.elements,
          timestamp: jsonData.metadata?.timestamp
        };
      }
      
      // Unknown format
      return null;
    } catch (error) {
      console.error(`Error reading existing mapping file: ${error}`);
      return null;
    }
  }
} 