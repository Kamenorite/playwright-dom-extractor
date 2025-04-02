# Playwright DOM Extractor

A powerful tool for extracting DOM elements from web pages, generating semantic keys, and creating maintainable Playwright tests.

## Features

- **Extract DOM Elements**: Analyze web pages and extract elements for testing
- **Generate Semantic Keys**: Create consistent, meaningful selectors for elements
- **Smart Selector System**: Use partial keys, fuzzy matching and context detection
- **Data-testid Prioritization**: Automatically use the most stable selectors
- **AI Integration**: Generate better keys with Cursor AI via MCP
- **Simplified Test Creation**: Create robust, maintainable Playwright tests

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/playwright-dom-extractor.git
cd playwright-dom-extractor

# Install dependencies
npm ci

# Run a basic demo
node examples/dom-extraction-demo.js
```

## Demo Examples

The repository includes several demos to help you get started:

```bash
# Basic DOM extraction
node examples/dom-extraction-demo.js

# Cursor MCP integration (AI-powered keys)
node examples/mcp-integration-demo.js

# Run the smart semantic selector demo
npx playwright test examples/essential-demo.spec.ts
```

## Using Semantic Selectors

The semantic selector system lets you find elements using a variety of approaches:

```typescript
// Traditional exact semantic key
const loginButton = await getSemanticSelector('login_button_submit');

// Smart partial key matching
const loginButton = await getSemanticSelector('submit');

// Natural language description
const loginButton = await getSemanticSelector('login button');

// Context-aware matching (when on the profile page)
const saveButton = await getSemanticSelector('save');  // Finds profile_button_save

// Pattern matching with wildcards
const anyButton = await getSemanticSelector('*_button_*');
```

## Core Components

### DOM Monitor

```typescript
// Extract DOM elements from a page
const domMonitor = new DOMMonitor({
  outputPath: './mappings',
  useAI: false,       // Set to true to use AI for key generation
  useMCP: false,      // Set to true to use Cursor MCP
  featureName: 'login' // Optional context
});

// Usage with Playwright
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://example.com/login');

// Extract elements and generate keys
const elements = await domMonitor.extractDOMElements(page, context);
const elementsWithKeys = await domMonitor.generateSemanticKeys(elements, 'https://example.com/login');

// Save output to files (JSON, HTML)
await domMonitor.saveOutput(elementsWithKeys, 'https://example.com/login');
```

### Semantic Helper

```typescript
import { getSemanticSelector } from './utils/semantic-helper';

// Get a selector from a semantic key
const selector = await getSemanticSelector('login_button_submit');

// With feature context
const selector = await getSemanticSelector('button_submit', 'login');

// Smart/fuzzy matching
const selector = await getSemanticSelector('submit login');
```

## Cursor MCP Integration

This project integrates with Cursor's AI capabilities via the Model Context Protocol (MCP), allowing AI-powered semantic key generation without external API keys:

1. Create a `.cursor/mcp.json` file:
```json
{
  "mcp_server": "https://api.cursor.sh",
  "cursor_use_internal": true,
  "ai": {
    "provider": "cursor"
  }
}
```

2. Enable MCP when using the DOM Monitor:
```typescript
const domMonitor = new DOMMonitor({ 
  useAI: true,
  useMCP: true,  // Enable MCP integration
  outputPath: './mappings'
});
```

## Documentation

- [Semantic Key Guidelines](SEMANTIC-KEYS.md): Learn about the semantic key naming convention
- [Best Practices](BEST-PRACTICES.md): Tips for implementing data-testid attributes
- [MCP Integration](docs/MCP-INTEGRATION.md): Detailed guide for Cursor AI integration
- [Smart Selector System](SMART-SELECTOR.md): Guide to using the smart selector capabilities

## License

[MIT](LICENSE)