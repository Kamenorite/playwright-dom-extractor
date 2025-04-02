# Playwright DOM Extractor

A powerful tool for extracting DOM elements from web pages, generating semantic keys, and creating Playwright tests.

## Features

- Extract DOM elements from web pages and generate semantic keys
- Scan Playwright test files to identify pages and extract elements
- Generate Playwright tests from manual test instructions
- Classify semantic elements by feature for better organization
- **NEW**: Direct integration with Cursor AI via Model Context Protocol (MCP)
- Context-aware semantic key generation with advanced patterns
- Dynamic element analysis capabilities
- Prioritization of data-testid attributes for reliable test selectors

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/playwright-dom-extractor.git
cd playwright-dom-extractor

# Install dependencies (recommended for consistency)
npm ci
```

## Cross-Machine Compatibility

This project now includes Docker support and dependency versioning to ensure consistent behavior across different machines and environments.

### Option 1: Docker Installation (Recommended)

```bash
# Build and run with Docker
docker-compose up --build
```

### Option 2: Direct Installation

```bash
# Install with exact versions
npm ci
```

For detailed guidance on cross-machine setup, troubleshooting ESM vs CommonJS issues, and best practices, see [CROSS-MACHINE-SETUP.md](CROSS-MACHINE-SETUP.md).

## Enhanced Semantic Key Generation

This project now includes an enhanced semantic key generation system that creates more consistent, contextual, and descriptive keys for web elements. The keys follow a structured format:

```
[context]_[action/type]_[description]
```

For detailed documentation on the semantic key system, see [SEMANTIC-KEYS.md](SEMANTIC-KEYS.md).

### Key Generation Tools

```bash
# Generate semantic keys for a page with context
npm run generate-semantic-keys -- --url https://example.com --context profile

# Enhance existing semantic keys
npm run enhance-keys -- --file ./mappings/example.json
```

### Selector Prioritization

The system automatically prioritizes selectors in the following order:

1. **data-testid attributes**: Used as first choice when available
2. **ID attributes**: Used when data-testid is not available
3. **Content and attribute-based selectors**: Used as fallback options

This prioritization ensures tests remain stable even when UI changes occur, especially when your application uses data-testid attributes for testing purposes.

For best practices on implementing data-testid attributes in your application, see [BEST-PRACTICES.md](BEST-PRACTICES.md).

## Setup

### Cursor MCP Integration (NEW)

Playwright DOM Extractor now directly integrates with Cursor's AI via Model Context Protocol (MCP), allowing you to use AI features without needing API keys.

To enable this integration:

1. Create a `.cursor` directory in your project root
2. Add an `mcp.json` file with the following content:

```json
{
  "mcp_server": "https://api.cursor.sh",
  "cursor_use_internal": true,
  "ai": {
    "provider": "cursor"
  }
}
```

3. When initializing the DOMMonitor, set the `useMCP` option to `true`:

```typescript
const domMonitor = new DOMMonitor({ 
  useAI: true,
  useMCP: true, // Enable MCP integration
  outputPath: './mappings'
});
```

For more details, see [MCP-INTEGRATION.md](docs/MCP-INTEGRATION.md).

### Legacy MCP Server Configuration

For the traditional Playwright MCP server without direct Cursor AI integration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}
```

## Usage

### Scanning Spec Files

The `scan-specs` command analyzes your Playwright spec files, extracts URLs, and generates semantic mappings for each page:

```bash
# Scan all spec files in the tests directory
npm run scan-specs -- --tests-dir ./tests

# Use MCP integration for AI-powered semantic key generation
npm run scan-specs -- --tests-dir ./tests --use-mcp

# Specify custom output directory
npm run scan-specs -- --tests-dir ./tests --output-path ./custom-mappings

# Skip screenshot generation to save space
npm run scan-specs -- --tests-dir ./tests --no-screenshots
```

### Monitoring a Page

Extract DOM elements and generate semantic keys for a specific page:

```bash
# Monitor a single page
npm run monitor-page -- --url https://example.com

# Use MCP integration for AI-powered semantic key generation
npm run monitor-page -- --url https://example.com --use-mcp

# With feature context
npm run monitor-page -- --url https://example.com --feature login

# Skip screenshot generation
npm run monitor-page -- --url https://example.com --no-screenshots
```

### Updating Semantic Index

Update semantic mappings for a URL or refresh all existing mappings:

```bash
# Update for a specific URL
npm run update-semantics -- --url https://example.com

# Update all existing mappings
npm run update-semantics -- --update-index
```

### Generating Tests from Manual Instructions

Convert manual test instructions to Playwright tests:

```bash
# Generate a test from a single file
npm run generate-test -- --file ./manual-tests/login-test.txt

# Generate tests from all files in a directory
npm run generate-test -- --dir ./manual-tests
```

### Using Cursor for Test Development

1. Use `@Web` commands in Cursor to interact with web pages via the Playwright MCP server.
2. Cursor will suggest semantic selectors while you're developing tests.
3. Example: `@Web Visit https://example.com and analyze the semantic structure of the page.`

## API Reference

### DOM Monitor

The `DOMMonitor` class provides methods to:
- Navigate to web pages
- Extract DOM elements
- Generate semantic keys
- Save reports in JSON and HTML formats

### Semantic Helper

The `utils/semantic-helper.ts` module provides:
- `getSemanticSelector(key, featureName?)`: Get a selector for a semantic key
- `updateSelectorIndex(url, path?, featureName?)`: Update semantic mappings
- `getAllSemanticKeys(path?)`: Get all available semantic keys
- `getFeatureSemanticKeys(featureName, path?)`: Get keys for a specific feature
- `suggestSemanticKeys(description, path?)`: Find semantic keys matching a description

## CLI Tools

- `scan-spec-files.ts`: Scan Playwright spec files and generate mappings
- `dom-monitor-cli.ts`: Extract DOM elements from a specific URL
- `update-semantic-index.ts`: Update semantic mappings
- `generate-test.ts`: Generate Playwright tests from manual instructions
- `test-mcp.ts`: Test the Playwright MCP integration

## Workflow

1. **Extract DOM Elements**: Use `scan-specs` or `monitor-page` to extract elements
2. **Update Semantic Index**: Maintain mapping of semantic keys to selectors
3. **Generate Tests**: Create tests from manual instructions with `generate-test`
4. **Develop Tests with Cursor**: Use AI-powered suggestions for semantic selectors
5. **Run Tests**: Execute tests with `npm test`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
