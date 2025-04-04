# Examples Directory

This directory contains example files and demonstrations for the Playwright DOM Extractor.

## Demo Scripts

- **dom-extraction-demo.js**: Demonstrates the basic DOM extraction functionality
- **mcp-integration-demo.js**: Shows how to integrate with Cursor MCP for AI-powered key generation
- **essential-demo.spec.ts**: Demonstrates the natural language selector system in a test context

## Additional Demos & Tools

- **show-natural-language-selector-demo.ts**: Interactive demonstration of the smart selector capabilities
- **run-natural-language-selector-demo.js**: Runner script for the smart selector demo
- **test-natural-language-selector.js**: Simple test script for the semantic key functionality
- **test-ts-natural-language-selector.ts**: TypeScript version of the semantic key test

## Test Data

The `test-data` directory contains sample mapping files:
- `login_example_com_.json`: Example mapping for a login page
- `profile_example_com_profile.json`: Example mapping for a profile page

## Test HTML

The `test-html` directory contains HTML files for testing:
- `data-testid-demo.html`: Example HTML file with data-testid attributes

## Running the Examples

```bash
# Basic DOM extraction demo
npm run basic-demo

# MCP integration demo
npm run mcp-demo

# Smart semantic selector demo
npm run semantic-demo

# Run the smart selector interactive demo
node --loader ts-node/esm examples/run-natural-language-selector-demo.js
```

These examples demonstrate the core functionality of the Playwright DOM Extractor project and how to use it in different scenarios. 