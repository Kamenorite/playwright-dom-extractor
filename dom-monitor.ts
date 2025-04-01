import { Browser, Page, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface DOMMonitorOptions {
  useAI?: boolean;
  aiService?: any;
  elementSelector?: string;
  waitForSelector?: string;
  waitTimeout?: number;
  outputPath?: string;
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

export class DOMMonitor {
  private options: DOMMonitorOptions;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(options: DOMMonitorOptions = {}) {
    this.options = {
      useAI: false,
      elementSelector: '*[id], button, a, input, select, h1, h2, h3, label',
      waitTimeout: 5000,
      outputPath: './mappings',
      ...options
    };
  }

  async init() {
    this.browser = await chromium.launch();
  }

  async navigateTo(url: string) {
    if (!this.browser) {
      await this.init();
    }
    
    const context = await this.browser!.newContext();
    this.page = await context.newPage();
    await this.page.goto(url);

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
    
    return this.page.evaluate((selector) => {
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
  }

  async generateSemanticKeys(elements: DOMElement[]): Promise<DOMElement[]> {
    if (!this.options.useAI || !this.options.aiService) {
      return elements.map(element => ({
        ...element,
        semanticKey: element.id || `${element.tagName}_${element.innerText?.substring(0, 20).replace(/\s+/g, '_')}`
      }));
    }

    // Use AI service to generate semantic keys
    // This is a placeholder - implement your actual AI service integration
    return elements;
  }

  async saveReport(url: string, elements: DOMElement[]) {
    if (!fs.existsSync(this.options.outputPath!)) {
      fs.mkdirSync(this.options.outputPath!, { recursive: true });
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathname = urlObj.pathname.replace(/\//g, '_');
    const filename = `${hostname}${pathname}.json`;
    const filePath = path.join(this.options.outputPath!, filename);

    fs.writeFileSync(filePath, JSON.stringify(elements, null, 2));

    // Generate HTML report
    const htmlPath = path.join(this.options.outputPath!, `${hostname}${pathname}.html`);
    const htmlContent = this.generateHTMLReport(url, elements);
    fs.writeFileSync(htmlPath, htmlContent);

    return { jsonPath: filePath, htmlPath };
  }

  private generateHTMLReport(url: string, elements: DOMElement[]): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>DOM Monitor Report - ${url}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .element { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; }
        .tag { color: #0066cc; font-weight: bold; }
        .id { color: #cc6600; }
        .semantic { color: #009900; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>DOM Monitor Report</h1>
      <p>URL: ${url}</p>
      <p>Elements found: ${elements.length}</p>
      
      <h2>Elements</h2>
      ${elements.map(element => `
        <div class="element">
          <p><span class="tag">${element.tagName}</span> ${element.id ? `<span class="id">id="${element.id}"</span>` : ''}</p>
          ${element.semanticKey ? `<p><span class="semantic">Semantic Key: ${element.semanticKey}</span></p>` : ''}
          <p>XPath: ${element.xpath}</p>
          ${element.innerText ? `<p>Text: "${element.innerText.substring(0, 100)}${element.innerText.length > 100 ? '...' : ''}"</p>` : ''}
          
          <h3>Attributes</h3>
          <table>
            <tr><th>Name</th><th>Value</th></tr>
            ${Object.entries(element.attributes).map(([key, value]) => `
              <tr><td>${key}</td><td>${value}</td></tr>
            `).join('')}
          </table>
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
} 