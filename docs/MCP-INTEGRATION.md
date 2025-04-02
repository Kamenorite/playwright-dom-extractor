# Cursor Model Context Protocol (MCP) Integration

This document explains how to use the Playwright DOM Extractor with Cursor's Model Context Protocol (MCP) for AI-powered semantic key generation without requiring explicit API tokens.

## What is MCP?

Model Context Protocol (MCP) is Cursor's internal mechanism for allowing communication between the editor and AI services. It provides a way for tools to leverage Cursor's AI capabilities directly without requiring separate API credentials.

## Benefits of MCP Integration

- **No API Tokens Required**: Use Cursor's AI capabilities directly without setting up separate API keys
- **Contextual Awareness**: MCP provides richer context to the AI, potentially resulting in better semantic keys
- **Simplified Setup**: Works out-of-the-box in Cursor environments without additional configuration

## How to Enable MCP Integration

### 1. Create Cursor MCP Configuration

Create a `.cursor` directory in your project root and add the following `mcp.json` file:

```json
{
  "mcp_server": "https://api.cursor.sh",
  "cursor_use_internal": true,
  "ai": {
    "provider": "cursor"
  }
}
```

This configuration tells Cursor to use its internal authentication for AI requests.

### 2. Using MCP in DOMMonitor

When instantiating the DOMMonitor class, set the `useMCP` option to true:

```typescript
const domMonitor = new DOMMonitor({ 
  useAI: true,
  useMCP: true,
  outputPath: './output',
  waitTimeout: 3000
});
```

When `useMCP` is true, the DOMMonitor will:
- Create an instance of `MCPAIService`
- Connect the Playwright page to the MCP service
- Use the MCP service for semantic key generation

### 3. Using MCPAIService Directly

You can also use the MCPAIService directly:

```typescript
import { MCPAIService } from './services/mcp-ai-service';
import { chromium } from 'playwright';

async function example() {
  // Create the MCP AI Service
  const mcpAiService = new MCPAIService({
    useMCP: true
  });
  
  // Launch browser and navigate to page
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://example.com');
  
  // Connect the page to the MCP service
  mcpAiService.setPlaywrightPage(page, context);
  
  // Generate semantic keys for the page
  const elements = await mcpAiService.generateSemanticKeysForPage('https://example.com');
  
  console.log(elements);
  await browser.close();
}
```

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