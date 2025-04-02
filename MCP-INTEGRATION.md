# Cursor Model Context Protocol (MCP) Integration

This document explains how to use the Playwright DOM Extractor with Cursor's Model Context Protocol (MCP) for AI-powered semantic key generation without requiring explicit API tokens.

## What is MCP?

Model Context Protocol (MCP) is Cursor's internal mechanism for allowing communication between the editor and AI services. It provides a way for tools to leverage Cursor's AI capabilities directly without requiring separate API credentials.

## Benefits of MCP Integration

- **No API Tokens Required**: Use Cursor's AI capabilities directly without setting up separate API keys
- **Contextual Awareness**: MCP provides richer context to the AI, resulting in better semantic keys
- **Simplified Setup**: Works out-of-the-box in Cursor environments without additional configuration

## Setup Instructions

### 1. Create Cursor MCP Configuration

Create a `.cursor/mcp.json` file with:

```json
{
  "mcp_server": "https://api.cursor.sh",
  "cursor_use_internal": true,
  "ai": {
    "provider": "cursor"
  }
}
```

### 2. Using MCP in DOMMonitor

```typescript
// Initialize DOMMonitor with MCP enabled
const domMonitor = new DOMMonitor({ 
  useAI: true,
  useMCP: true,  // Enable MCP integration
  outputPath: './mappings'
});

// Use with Playwright
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://example.com/login');

// Extract elements and generate AI-enhanced keys
const elements = await domMonitor.extractDOMElements(page, context);
const elementsWithKeys = await domMonitor.generateSemanticKeys(elements, 'https://example.com/login');

// Save to JSON/HTML files
await domMonitor.saveOutput(elementsWithKeys, 'https://example.com/login');
```

### 3. Command Line Usage

```bash
# Extract elements with MCP-powered AI key generation
npm run monitor-page -- --url https://example.com/login --use-mcp

# Interactive CLI with MCP option
npm run cli
```

## Working with Semantic Keys

MCP-generated semantic keys are typically more contextual and meaningful than rule-based ones. Example:

Rule-based: `button_submit`
MCP-generated: `login_button_submit`

To use these keys in your tests:

```typescript
import { getSemanticSelector } from './utils/semantic-helper';

// Get a selector from an exact semantic key
const selector = await getSemanticSelector('login_button_submit');

// Or use smart matching with MCP-generated keys
const loginButton = await getSemanticSelector('login button');
const submitButton = await getSemanticSelector('submit');
```

For more details on using smart semantic selectors, see [SMART-SELECTOR.md](SMART-SELECTOR.md).

## Troubleshooting

If you encounter issues with MCP integration:

1. Verify your Cursor installation is up-to-date
2. Check that `.cursor/mcp.json` is correctly configured
3. Try the fallback mode with `--use-ai` instead of `--use-mcp`
4. Look for error messages related to MCP in the console output

For more examples, see `examples/mcp-integration-demo.js`.

## Fallback Behavior

If MCP integration fails for any reason, the system will automatically fall back to rule-based semantic key generation. This ensures that your tests and scripts will continue to work even if AI services are unavailable.

## Limitations

- MCP integration only works when running within the Cursor environment
- Some advanced AI features may require fine-tuning that's not available through MCP

## Testing MCP Integration

The integration test suite includes tests for MCP integration. To run these tests:

```bash
npx playwright test tests/integration-suite.spec.ts --grep "AI Integration"
```

These tests will check if the MCP configuration exists and use it for semantic key generation if available.

## Using MCP with AI Prompts

The Playwright DOM Extractor includes two specialized AI prompts in the `.cursor/prompts` directory that leverage MCP:

1. **`semantic-ai-master.mdc`**: Comprehensive prompt for element analysis and selector operations
   - **Element Analysis**: Analyze HTML elements to determine their purpose and generate semantic keys
   - **Selector Translation**: Convert natural language or partial keys into precise selectors
   - **Enhancement**: Improve existing semantic keys with better context awareness
   - **Best Practices**: Provide guidance on semantic selector usage

2. **`playwright-automation-master.mdc`**: Master prompt for test generation and automation
   - **Test Script Generation**: Create complete Playwright test scripts using semantic selectors
   - **Test Refactoring**: Convert existing tests to use semantic selectors
   - **Testing Patterns**: Suggest patterns for common testing scenarios
   - **Debugging Support**: Help identify and fix issues in test scripts

### Using the AI Prompts

You can access these capabilities through the Cursor interface using several methods:

#### 1. Direct Prompt Usage

Simply type `@` followed by the operation and description:

```
@ANALYZE_ELEMENT: <button class="primary-btn" onclick="submitForm()">Sign In</button>
```

```
@TRANSLATE_SELECTOR: login button
```

```
@GENERATE_TEST: User can log in with valid credentials
```

#### 2. Through Code Rules

The project includes code rules (in `.cursor/rules.json`) that automatically suggest AI capabilities when:
- You write a selector directly in a Playwright test
- You navigate to a web page in a test
- You have TODO comments for tests to implement
- You're working with HTML elements or mapping files

These prompts will appear in your editor as you work with relevant code patterns.

## Related Documentation

- [SEMANTIC-KEYS.md](SEMANTIC-KEYS.md): Learn about semantic key naming conventions
- [SMART-SELECTOR.md](SMART-SELECTOR.md): Detailed guide on using the smart selector system
- [BEST-PRACTICES.md](BEST-PRACTICES.md): Best practices for testing with semantic selectors 