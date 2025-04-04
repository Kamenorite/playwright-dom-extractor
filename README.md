# Playwright DOM Extractor

A powerful tool for extracting DOM elements from web pages, generating semantic keys, and creating maintainable Playwright tests using natural language descriptions.

## Important: Deprecation Notice

The following functions are deprecated and will be removed in a future version:

- ⛔️ `getSemanticSelector` - Use `getByDescription` for better natural language matching
- ⛔️ `getSelfHealingLocator` - Use `getByDescription` for better natural language matching
- ⛔️ `updateSelectorForKey` - No longer needed with the new natural language selectors

These functions remain for backward compatibility but will display deprecation warnings. Please migrate your tests to use the new natural language functions.

## Features

- **Extract DOM Elements**: Analyze web pages and extract elements for testing
- **Generate Semantic Keys**: Create consistent, meaningful selectors for elements
- **Natural Language Descriptions**: Use human language to describe elements in tests
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

The repository includes several demos in the `examples` directory:

```bash
# Basic DOM extraction
node examples/dom-extraction-demo.js

# Cursor MCP integration (AI-powered keys)
node examples/mcp-integration-demo.js

# Run the natural language selector demo
npx playwright test examples/essential-demo.spec.ts

# Interactive demo of the natural language selector
node examples/run-smart-selector-demo.js
```

## Documentation

Refer to these documents for detailed information:

- **[SEMANTIC-KEYS.md](SEMANTIC-KEYS.md)**: Learn about the semantic key naming convention and generation
- **[SMART-SELECTOR.md](SMART-SELECTOR.md)**: Guide to using the smart selector capabilities
- **[BEST-PRACTICES.md](BEST-PRACTICES.md)**: Tips for implementing data-testid attributes
- **[MCP-INTEGRATION.md](MCP-INTEGRATION.md)**: Guide for Cursor AI integration
- **[CROSS-MACHINE-SETUP.md](CROSS-MACHINE-SETUP.md)**: Setup instructions for different environments

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
import { getElementByDescription, getByDescription } from './utils/semantic-helper';

// Get a selector using human-readable descriptions
const selector = await getElementByDescription('submit button');

// Get a locator directly
const submitButton = await getByDescription(page, 'submit button');

// Use with feature context for better matching
const selector = await getElementByDescription('submit button', 'login');
```

## Natural Language Selectors

Playwright DOM Extractor includes a powerful smart selector system based on natural language descriptions:

```typescript
import { getElementByDescription, getByDescription } from './utils/semantic-helper';

// Get a selector using natural language description
const selector = await getElementByDescription('login submit button');

// Get a ready-to-use locator - most convenient approach
const loginButton = await getByDescription(page, 'login button');
const usernameField = await getByDescription(page, 'username input');
```

## Natural Language Tests

Playwright DOM Extractor now supports natural language descriptions for element selection, making tests more readable and maintainable.

### How It Works

1. Each element in the mapping file has a semantic key and alternative names
2. The system matches natural language descriptions against these identifiers
3. It uses smart scoring to find the best match, even with partial or inexact descriptions
4. Elements can be accessed directly by what they are, not by technical identifiers

### Using Natural Language in Tests

```typescript
import { getByDescription, getElementByDescription } from './utils/semantic-helper';

test('User can log in', async ({ page }) => {
  // Use natural language descriptions to get locators
  const usernameField = await getByDescription(page, 'username input');
  const passwordField = await getByDescription(page, 'password input');
  const loginButton = await getByDescription(page, 'login button');
  
  // Descriptions are flexible and forgiving
  const usernameField = await getByDescription(page, 'username field');
  const passwordField = await getByDescription(page, 'password box');
  const loginButton = await getByDescription(page, 'sign in button');
  
  // Use locators normally
  await usernameField.fill('testuser');
  await passwordField.fill('password123');
  await loginButton.click();
});
```

### How Elements Are Matched

The natural language matching system uses multiple strategies:

1. **Semantic Keys**: Matches against the semantic keys in the mapping file
2. **Alternative Names**: Uses the alternative names stored for each element
3. **Element Content**: Considers the element's text content and attributes
4. **Scoring System**: Ranks matches based on relevance and context

This approach makes tests more readable, maintainable, and resistant to changes in the application structure.

## Project Structure

```
playwright-dom-extractor/
├── examples/             # Demo examples and test files
│   ├── test-data/        # Example mapping data
│   └── test-html/        # HTML files for testing
├── mappings/             # Mapping files generated by DOM Monitor
├── services/             # Core services
├── utils/                # Utility functions
│   └── semantic-helper.ts # Natural language selector implementation
└── .cursor/              # Cursor AI integration
    ├── prompts/          # AI prompts for element analysis
    └── rules/            # Coding rules for AI assistance
```

## License

[MIT](LICENSE)

The following functions are now deprecated and will be removed in a future version:

- `getSemanticSelector` - Use `getByDescription` for better natural language matching
- `getByDescription` - Use `getByDescription` for better natural language matching 
- `updateSelectorForKey` - No longer needed with the new natural language selectors

These functions will continue to work for backward compatibility but will show deprecation warnings in the console. Please update your code to use the new functions.
