# Playwright DOM Extractor Tests

This directory contains integration tests for the Playwright DOM Extractor tool.

## Running Tests

To run all tests:

```bash
npx playwright test tests/integration-suite.spec.ts
```

To run a specific test group:

```bash
npx playwright test tests/integration-suite.spec.ts --grep "Semantic Helper"
```

## Test Groups

The integration test suite is organized into the following groups:

1. **Basic Functionality**: Tests for initialization, navigation, DOM extraction, semantic key generation, and report saving.
2. **AI Integration**: Tests for AI service connection and semantic key generation with AI.
3. **data-testid Prioritization**: Tests that verify data-testid attributes are properly prioritized.
4. **CLI Tools**: Tests for the command-line interface tools.
5. **Semantic Helper**: Tests for the semantic selector retrieval utilities.
6. **Wait and Timeout Features**: Tests for network idle waiting and timeout functionality.
7. **Screenshot Options**: Tests for screenshot capabilities and configuration.

## AI Integration Tests

Some tests require an AI API key to run. By default, these tests are skipped unless you provide:

1. An `AI_API_KEY` environment variable with your Cursor API key
2. A `RUN_AI_TESTS=1` environment variable to explicitly enable AI tests

### Setting up Cursor AI API Key

There are two ways to set up your Cursor AI API key for testing:

#### Option 1: Using MCP Integration (Preferred within Cursor IDE)

1. Create a `.cursor` directory in your project:
   ```bash
   mkdir -p .cursor
   ```

2. Create a `mcp.json` file in the `.cursor` directory:
   ```bash
   echo '{
     "mcp_server": "https://api.cursor.sh",
     "cursor_use_internal": true,
     "ai": {
       "provider": "cursor"
     }
   }' > .cursor/mcp.json
   ```

3. Create a `.env` file in your project root for environment variables:
   ```bash
   echo 'AI_API_KEY=your_cursor_api_key
   AI_API_ENDPOINT=https://api.cursor.sh/v1/ai/completions
   RUN_AI_TESTS=1' > .env
   ```

4. Install dotenv-cli if needed:
   ```bash
   npm install -g dotenv-cli
   ```

5. Run tests with environment variables:
   ```bash
   dotenv -e .env -- npx playwright test tests/integration-suite.spec.ts
   ```

#### Option 2: Manual API Key Setup

1. Find your Cursor API key in Cursor settings or generate a new one
2. Set environment variables before running the tests:
   ```bash
   export AI_API_KEY=your_cursor_api_key
   export AI_API_ENDPOINT=https://api.cursor.sh/v1/ai/completions
   export RUN_AI_TESTS=1
   npx playwright test tests/integration-suite.spec.ts
   ```

## Test Files

- `integration-suite.spec.ts`: The main test suite file
- `../test-html/data-testid-test.html`: A test HTML file with data-testid attributes

## Test Organization

The test suite is organized into several sections:

### integration-suite.spec.ts

This is a comprehensive integration test suite that verifies:

1. **Basic Functionality**
   - DOM element extraction
   - Semantic key generation
   - Report generation

2. **AI Integration**
   - Connection to AI service
   - AI-powered semantic key generation

3. **data-testid Prioritization**
   - Proper handling of data-testid attributes
   - Prioritization in semantic key generation

4. **CLI Tools**
   - Proper functioning of dom-monitor-cli
   - Proper functioning of scan-spec-files

5. **Semantic Helper**
   - Semantic selector retrieval
   - Proper selector generation based on mapped keys

6. **Wait and Timeout Features**
   - Network idle waiting
   - Timeout implementation

7. **Screenshot Options**
   - Screenshot generation
   - Screenshot skipping when disabled

## Test Data

- `test-html/data-testid-test.html`: HTML file with data-testid attributes for testing prioritization

## Adding New Tests

When adding new tests:

1. Follow the existing organization structure
2. Use descriptive test names
3. Clean up resources after tests complete
4. Avoid dependencies between tests

## Troubleshooting

If tests fail:

1. Check that all dependencies are installed
2. Verify that test HTML files exist
3. Ensure the temporary output directory is writable
4. Check for browser-specific issues 