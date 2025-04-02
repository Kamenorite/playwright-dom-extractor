import { Browser, BrowserContext, Page, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { MCPAIService } from './services/mcp-ai-service';

interface DOMMonitorOptions {
  useAI?: boolean;
  aiService?: any;
  useMCP?: boolean;
  elementSelector?: string;
  waitForSelector?: string;
  waitTimeout?: number;
  outputPath?: string;
  featureName?: string;
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

export class DOMMonitor {
  private options: DOMMonitorOptions;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private browserContext: BrowserContext | null = null;
  private currentUrl: string | null = null;
  private mcpAiService: MCPAIService | null = null;

  constructor(options: DOMMonitorOptions = {}) {
    this.options = {
      useAI: false,
      useMCP: false,
      elementSelector: '*[id], button, a, input, select, h1, h2, h3, label',
      waitTimeout: 5000,
      outputPath: './mappings',
      ...options
    };
    
    // If MCP is enabled, create an MCPAIService
    if (this.options.useMCP) {
      this.mcpAiService = new MCPAIService();
      this.options.useAI = true; // MCP implies using AI
      this.options.aiService = this.mcpAiService;
    }
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

    // If using MCP AI Service, set the page object
    if (this.mcpAiService && this.page && this.browserContext) {
      this.mcpAiService.setPlaywrightPage(this.page, this.browserContext);
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

        return {
          tagName: element.tagName.toLowerCase(),
          id: element.id || undefined,
          classes: element.className ? element.className.split(' ').filter(c => c) : undefined,
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
    if (!this.options.useAI) {
      // Default fallback if AI is not enabled
      return elements.map(element => ({
        ...element,
        semanticKey: this.generateDefaultSemanticKey(element)
      }));
    }

    if (!this.options.aiService) {
      throw new Error('AI service not provided but useAI is true');
    }

    // Special case for MCP AI Service which takes whole page context
    if (this.mcpAiService && this.currentUrl) {
      try {
        // Clone elements to avoid modifying original array
        const elementsClone = JSON.parse(JSON.stringify(elements));
        const enhancedElements = await this.mcpAiService.generateSemanticKeysForPage(this.currentUrl);
        
        // Map the semantic keys back to our original elements
        return elements.map((element, index) => {
          const matchingEnhanced = enhancedElements.find(e => 
            e.tagName === element.tagName && 
            e.id === element.id && 
            e.xpath === element.xpath
          );
          
          // Use enhanced key if available, otherwise fall back to default
          const semanticKey = matchingEnhanced?.semanticKey || this.generateDefaultSemanticKey(element);
          
          // Add feature name prefix if available
          let finalKey = semanticKey;
          if (this.options.featureName && !finalKey.startsWith(this.options.featureName.toLowerCase())) {
            finalKey = `${this.options.featureName.toLowerCase()}_${finalKey}`;
          }
          
          return {
            ...element,
            semanticKey: finalKey
          };
        });
      } catch (error) {
        console.error('Error using MCP AI service, falling back to regular key generation:', error);
        // Fall back to standard approach
      }
    }

    // Standard approach using the provided AI service
    const result = [...elements];
    
    // Process elements one by one to generate semantic keys
    for (let i = 0; i < result.length; i++) {
      try {
        const element = result[i];
        // Use either generateSemanticKeyForElement or an equivalent method from your AIService
        const semanticKey = await this.options.aiService.generateSemanticKeyForElement(element);
        
        // Ensure we got a valid key
        if (semanticKey && typeof semanticKey === 'string' && semanticKey.length > 0) {
          // Add feature name prefix if available
          let finalKey = semanticKey;
          if (this.options.featureName && !finalKey.startsWith(this.options.featureName.toLowerCase())) {
            finalKey = `${this.options.featureName.toLowerCase()}_${finalKey}`;
          }
          
          result[i] = {
            ...element,
            semanticKey: finalKey
          };
        } else {
          console.warn(`Failed to generate semantic key for element ${i}, using fallback`);
          result[i] = {
            ...element,
            semanticKey: this.generateDefaultSemanticKey(element)
          };
        }
      } catch (error) {
        console.error(`Error generating semantic key for element ${i}:`, error);
        // Use a fallback key in case of error
        result[i] = {
          ...result[i],
          semanticKey: this.generateDefaultSemanticKey(result[i])
        };
      }
    }

    return result;
  }
  
  /**
   * Generate a default semantic key based on element properties
   */
  private generateDefaultSemanticKey(element: DOMElement): string {
    // Start with feature name if available
    const prefix = element.featureName ? `${element.featureName.toLowerCase()}_` : '';
    
    // Prioritize data-testid when available - NEW PRIORITY
    if (element.attributes && element.attributes['data-testid']) {
      // Clean up the data-testid value for use as a semantic key
      const testId = element.attributes['data-testid']
        .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
        .replace(/[\s-]+/g, '_')  // Replace spaces and multiple hyphens with underscore
        .toLowerCase();
      
      return `${prefix}${testId}`;
    }
    
    // Use id if available and seems reasonable (not just numbers or hex)
    if (element.id && !/^[a-f0-9]{8,}$/i.test(element.id) && !/^\d+$/.test(element.id) && !/^section_\d+$/.test(element.id)) {
      return `${prefix}${element.id}`;
    }
    
    // Use innerText for common interactive elements and section elements
    if (['button', 'a', 'h1', 'h2', 'h3', 'label', 'section', 'nav', 'header', 'footer', 'article', 'aside'].includes(element.tagName) && element.innerText) {
      // Create a more descriptive key based on text content
      const words = element.innerText.trim()
        .replace(/[^\w\s]/gi, '')  // Remove special characters
        .split(/\s+/)              // Split by whitespace
        .filter(word => word.length > 1) // Filter out short words
        .slice(0, 3);              // Take first 3 meaningful words
      
      if (words.length > 0) {
        const cleanText = words.join('_').toLowerCase();
        return `${prefix}${element.tagName}_${cleanText}`;
      }
    }
    
    // Special handling for form elements
    if (element.tagName === 'input') {
      const key = `input_${element.attributes.placeholder || element.attributes.name || element.attributes.type || 'field'}`;
      return `${prefix}${key}`;
    }
    
    if (['select', 'textarea'].includes(element.tagName)) {
      const key = `${element.tagName}_${element.attributes.name || 'field'}`;
      return `${prefix}${key}`;
    }
    
    // For sections without text, try to get text from children
    if (element.tagName === 'section' && element.innerText) {
      // Extract key words from the text
      const textKey = element.innerText.trim()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 2)
        .join('_')
        .toLowerCase();
      
      if (textKey.length > 3) {
        return `${prefix}section_${textKey}`;
      }
    }
    
    // Final fallback
    const idHash = this.simpleHash(JSON.stringify(element));
    return `${prefix}${element.tagName}_${idHash}`;
  }
  
  /**
   * Generate a simple hash code for a string
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
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

    // Ensure each element has the URL
    const elementsWithUrl = elements.map(el => ({
      ...el,
      url: url
    }));

    fs.writeFileSync(filePath, JSON.stringify(elementsWithUrl, null, 2));

    // Generate HTML report
    const htmlPath = path.join(this.options.outputPath!, `${featurePrefix}${hostname}${pathname}.html`);
    const htmlContent = this.generateHTMLReport(url, elementsWithUrl);
    fs.writeFileSync(htmlPath, htmlContent);

    return { jsonPath: filePath, htmlPath };
  }

  private generateHTMLReport(url: string, elements: DOMElement[]): string {
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
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .search-box { margin: 10px 0; padding: 10px; }
        .search-box input { padding: 8px; width: 300px; }
        .filters { margin: 10px 0; }
        .filters button { margin-right: 5px; padding: 5px 10px; cursor: pointer; }
        .hidden { display: none; }
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
      <p>URL: ${url}</p>
      ${featureInfo}
      <p>Elements found: ${elements.length}</p>
      
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
          ${element.featureName ? `<p><span class="feature">Feature: ${element.featureName}</span></p>` : ''}
          <p>XPath: ${element.xpath}</p>
          ${element.innerText ? `<p>Text: "${element.innerText.substring(0, 100)}${element.innerText.length > 100 ? '...' : ''}"</p>` : ''}
          
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
} 