import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { CursorAIService } from './services/cursor-ai-service';
import { chromium, Browser, Page } from '@playwright/test';

/**
 * Command line utility for generating semantic keys for web pages.
 * This tool provides various options for customizing the key generation process.
 */

// Define CLI options
program
  .name('generate-semantic-keys')
  .description('Generate semantic keys for web pages using contextual analysis')
  .version('1.0.0')
  .option('-u, --url <url>', 'URL of the page to analyze')
  .option('-o, --output <path>', 'Output directory for mappings', './mappings')
  .option('-c, --context <name>', 'Feature/context name to use as prefix')
  .option('-s, --selectors <selectors>', 'CSS selectors to target specific elements', 'a, button, input, select, h1, h2, h3, label, nav, .nav-item')
  .option('-d, --dynamic', 'Analyze dynamic elements with state changes', false)
  .option('-w, --wait <milliseconds>', 'Wait time in ms after page load', '2000')
  .option('-f, --format <format>', 'Output format (json, html, both)', 'both')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .parse(process.argv);

const options = program.opts();

// Validate required parameters
if (!options.url) {
  console.error('Error: URL parameter is required');
  program.help();
  process.exit(1);
}

// Main function
async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  if (options.verbose) {
    console.log(`Analyzing page: ${options.url}`);
    console.log(`Using context: ${options.context || 'auto'}`);
    console.log(`Targeting selectors: ${options.selectors}`);
  }

  try {
    // Navigate to page
    await page.goto(options.url, { waitUntil: 'domcontentloaded' });
    console.log(`Page loaded: ${options.url}`);

    // Wait for page to stabilize
    await page.waitForTimeout(parseInt(options.wait, 10));

    // Initialize the CursorAIService for enhanced semantic key generation
    const aiService = new CursorAIService({
      mcpEnabled: true, // Using Cursor MCP when available
      useAI: true
    });

    // Extract DOM elements and generate semantic keys
    const elements = await extractElements(page, options.selectors);
    console.log(`Extracted ${elements.length} elements`);

    // Generate semantic keys
    const elementsWithKeys = await enhanceElementsWithSemanticKeys(elements, aiService);
    console.log(`Generated semantic keys for ${elementsWithKeys.length} elements`);

    // Save results
    const outputDir = options.output;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create filename from URL and context
    const urlObj = new URL(options.url);
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathname = urlObj.pathname.replace(/\//g, '_');
    const contextPrefix = options.context ? `${options.context.toLowerCase()}_` : '';
    const baseFilename = `${contextPrefix}${hostname}${pathname}`;

    // Save as JSON
    if (options.format === 'json' || options.format === 'both') {
      const jsonPath = path.join(outputDir, `${baseFilename}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(elementsWithKeys, null, 2));
      console.log(`JSON mapping saved to ${jsonPath}`);
    }

    // Save as HTML report
    if (options.format === 'html' || options.format === 'both') {
      const htmlPath = path.join(outputDir, `${baseFilename}.html`);
      const htmlContent = generateHTMLReport(options.url, elementsWithKeys, options.context);
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`HTML report saved to ${htmlPath}`);
    }

    // Create a screenshot
    const screenshotPath = path.join(outputDir, `${baseFilename}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Track dynamic elements if requested
    if (options.dynamic) {
      console.log('Analyzing dynamic elements...');
      await analyzeDynamicElements(page, elementsWithKeys, options);
    }

  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await browser.close();
  }
}

/**
 * Extract DOM elements from the page
 */
async function extractElements(page: Page, selectors: string): Promise<any[]> {
  return page.evaluate((selector) => {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.map(element => {
      // Get XPath
      const getXPath = (el: Element): string => {
        if (el.id) {
          return `//*[@id="${el.id}"]`;
        }
        if (el === document.body) {
          return '/html/body';
        }
        let ix = 1;
        const siblings = el.parentNode ? Array.from(el.parentNode.children) : [];
        for (const sibling of siblings) {
          if (sibling === el) {
            const path: string = getXPath(el.parentNode as Element);
            return path + '/' + el.tagName.toLowerCase() + '[' + ix + ']';
          }
          if (sibling.tagName === el.tagName) {
            ix++;
          }
        }
        return '';
      };

      // Get element attributes
      const attributes: Record<string, string> = {};
      Array.from(element.attributes).forEach(attr => {
        attributes[attr.name] = attr.value;
      });

      // Check if element is visible
      const rect = element.getBoundingClientRect();
      const isVisible = !!(rect.top || rect.bottom || rect.width || rect.height);

      return {
        tagName: element.tagName.toLowerCase(),
        id: element.id || undefined,
        classes: element.className ? element.className.split(' ').filter(c => c) : undefined,
        attributes,
        innerText: element.textContent?.trim() || undefined,
        xpath: getXPath(element),
        isVisible,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }
      };
    });
  }, selectors);
}

/**
 * Enhance elements with semantic keys using the CursorAIService
 */
async function enhanceElementsWithSemanticKeys(elements: any[], aiService: CursorAIService): Promise<any[]> {
  const enhancedElements = [];
  
  for (const element of elements) {
    try {
      const semanticKey = await aiService.generateSemanticKeyForElement(element);
      enhancedElements.push({
        ...element,
        semanticKey
      });
    } catch (error) {
      console.warn(`Failed to generate semantic key for element: ${error}`);
      enhancedElements.push(element);
    }
  }
  
  return enhancedElements;
}

/**
 * Analyze dynamic elements by simulating interactions
 */
async function analyzeDynamicElements(page: Page, elements: any[], options: any): Promise<void> {
  const interactableElements = elements.filter(el => 
    (el.tagName === 'button' || el.tagName === 'a' || 
     (el.tagName === 'input' && (el.attributes.type === 'checkbox' || el.attributes.type === 'radio'))) &&
    el.isVisible
  );
  
  console.log(`Found ${interactableElements.length} interactable elements for dynamic analysis`);
  
  // Create a copy of the page for interaction testing
  const context = await page.context().newPage();
  await context.goto(options.url, { waitUntil: 'domcontentloaded' });
  await context.waitForTimeout(parseInt(options.wait, 10));
  
  // Try to interact with elements to discover dynamic content
  const dynamicResults = [];
  
  for (const el of interactableElements.slice(0, 5)) { // Limit to first 5 for demo
    try {
      console.log(`Testing interaction with ${el.semanticKey || el.xpath}`);
      
      // Try to find and click the element
      if (el.id) {
        await context.click(`#${el.id}`);
      } else if (el.xpath) {
        await context.click(el.xpath);
      }
      
      // Wait for any potential dynamic changes
      await context.waitForTimeout(1000);
      
      // Take a screenshot of the result
      await context.screenshot({ 
        path: path.join(options.output, `dynamic_${el.semanticKey || 'element'}.png`) 
      });
      
      // Go back to original page for next test
      await context.goto(options.url, { waitUntil: 'domcontentloaded' });
      await context.waitForTimeout(parseInt(options.wait, 10));
      
    } catch (error) {
      console.warn(`Could not interact with element: ${error}`);
    }
  }
  
  await context.close();
}

/**
 * Generate an HTML report for the elements
 */
function generateHTMLReport(url: string, elements: any[], context?: string): string {
  const contextInfo = context ? `<p>Context: ${context}</p>` : '';
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Semantic Key Report - ${url}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { color: #333; }
      .element { 
        border: 1px solid #ddd; 
        padding: 10px; 
        margin-bottom: 10px; 
        border-radius: 5px;
        transition: all 0.3s ease;
      }
      .element:hover {
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .tag { color: #0066cc; font-weight: bold; }
      .id { color: #cc6600; }
      .semantic { color: #009900; font-weight: bold; }
      .feature { color: #990099; font-weight: bold; }
      .invisible { background-color: #ffeeee; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      .search-box { margin: 10px 0; padding: 10px; }
      .search-box input { padding: 8px; width: 300px; }
      .filters { margin: 10px 0; }
      .filters button { margin-right: 5px; padding: 5px 10px; cursor: pointer; }
      .hidden { display: none; }
      .code-block { 
        background-color: #f5f5f5; 
        padding: 10px; 
        border-radius: 5px;
        margin-top: 10px;
        font-family: monospace;
      }
      .copy-button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 5px 10px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 3px;
      }
      .tabs {
        overflow: hidden;
        border: 1px solid #ccc;
        background-color: #f1f1f1;
        margin-top: 20px;
      }
      .tabs button {
        background-color: inherit;
        float: left;
        border: none;
        outline: none;
        cursor: pointer;
        padding: 10px 16px;
        transition: 0.3s;
      }
      .tabs button:hover {
        background-color: #ddd;
      }
      .tabs button.active {
        background-color: #ccc;
      }
      .tab-content {
        display: none;
        padding: 12px;
        border: 1px solid #ccc;
        border-top: none;
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
      
      function filterByVisibility(visible) {
        const elements = document.getElementsByClassName('element');
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const isVisible = element.getAttribute('data-visible') === 'true';
          
          if (visible === 'all' || (visible === 'visible' && isVisible) || (visible === 'hidden' && !isVisible)) {
            element.classList.remove('hidden');
          } else {
            element.classList.add('hidden');
          }
        }
      }
      
      function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
          .then(() => {
            alert('Copied to clipboard!');
          })
          .catch(err => {
            console.error('Error copying: ', err);
          });
      }
      
      function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
          tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
          tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
      }
    </script>
  </head>
  <body>
    <h1>Semantic Key Report</h1>
    <p>URL: <a href="${url}" target="_blank">${url}</a></p>
    ${contextInfo}
    <p>Elements found: ${elements.length}</p>
    
    <div class="search-box">
      <input type="text" id="search" placeholder="Search elements..." onkeyup="filterElements()">
    </div>
    
    <div class="filters">
      <b>Filter by tag:</b>
      <button onclick="filterByTag('all')">All</button>
      ${Array.from(new Set(elements.map(e => e.tagName))).map(tag => 
        `<button onclick="filterByTag('${tag}')">${tag}</button>`
      ).join('')}
    </div>
    
    <div class="filters">
      <b>Filter by visibility:</b>
      <button onclick="filterByVisibility('all')">All</button>
      <button onclick="filterByVisibility('visible')">Visible only</button>
      <button onclick="filterByVisibility('hidden')">Hidden only</button>
    </div>
    
    <div class="tabs">
      <button class="tablinks active" onclick="openTab(event, 'Elements')">Elements</button>
      <button class="tablinks" onclick="openTab(event, 'CodeExport')">Code Export</button>
    </div>
    
    <div id="Elements" class="tab-content" style="display: block;">
      <h2>Elements</h2>
      ${elements.map(element => `
        <div class="element ${!element.isVisible ? 'invisible' : ''}" 
             data-tag="${element.tagName}" 
             data-visible="${element.isVisible}">
          <p>
            <span class="tag">${element.tagName}</span> 
            ${element.id ? `<span class="id">id="${element.id}"</span>` : ''}
            ${!element.isVisible ? '<span style="color:red">(Not visible)</span>' : ''}
          </p>
          ${element.semanticKey ? `<p><span class="semantic">Semantic Key: ${element.semanticKey}</span></p>` : ''}
          <p>XPath: ${element.xpath}</p>
          ${element.innerText ? `<p>Text: "${element.innerText.substring(0, 100)}${element.innerText.length > 100 ? '...' : ''}"</p>` : ''}
          
          <h3>Attributes</h3>
          <table>
            <tr><th>Name</th><th>Value</th></tr>
            ${Object.entries(element.attributes || {}).map(([key, value]) => `
              <tr><td>${key}</td><td>${value}</td></tr>
            `).join('')}
          </table>
          
          <h3>Playwright Selectors</h3>
          <div class="code-block">
            ${element.id ? `page.locator('#${element.id}')` : 
              element.attributes && element.attributes['data-testid'] ? 
                `page.locator('[data-testid="${element.attributes['data-testid']}"]')` : 
              element.innerText ? 
                `page.locator('${element.tagName}:has-text("${element.innerText.substring(0, 50).replace(/"/g, '\\"')}")` : 
              `page.locator('${element.xpath}')`}
          </div>
          
          <div class="code-block">
            ${element.semanticKey ? 
              `// Using semantic key\nconst ${element.semanticKey}Selector = await getSemanticSelector('${element.semanticKey}');\nawait page.locator(${element.semanticKey}Selector).click();` : 
              '// No semantic key available'}
          </div>
          
          <button class="copy-button" 
                  onclick="copyToClipboard('${element.semanticKey ? 
                    `const ${element.semanticKey}Selector = await getSemanticSelector(\\'${element.semanticKey}\\');\\nawait page.locator(${element.semanticKey}Selector).click();`.replace(/"/g, '\\"') : 
                    `await page.locator(\\'${element.xpath}\\').click();`.replace(/"/g, '\\"')}')">
            Copy Code
          </button>
        </div>
      `).join('')}
    </div>
    
    <div id="CodeExport" class="tab-content">
      <h2>Test Code Example</h2>
      <div class="code-block">
        <pre>
import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

test('Test using semantic selectors for ${url}', async ({ page }) => {
  // Navigate to page
  await page.goto('${url}');
  await page.waitForLoadState('networkidle');
  
  // Work with elements using semantic keys
${elements.filter(e => e.semanticKey && e.isVisible).slice(0, 5).map(element => {
  const key = element.semanticKey;
  const action = element.tagName === 'button' || element.tagName === 'a' ? 
    'click()' : 
    element.tagName === 'input' ? 
      "fill('value')" : 
      "waitFor({ state: 'visible' })";
      
  return `  // ${element.innerText ? element.innerText.substring(0, 30) : element.tagName}
  const ${key}Selector = await getSemanticSelector('${key}');
  await page.locator(${key}Selector).${action};
`;
}).join('\n')}

  // Add assertions and other test steps here
  
  // Take a screenshot
  await page.screenshot({ path: 'test-result.png' });
});
        </pre>
      </div>
      <button class="copy-button" onclick="copyToClipboard(document.querySelector('#CodeExport pre').textContent)">
        Copy Test Code
      </button>
    </div>
  </body>
  </html>
  `;
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 