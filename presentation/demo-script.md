# Playwright DOM Extractor - Demo Script

This script provides a step-by-step guide for demonstrating the capabilities of the Playwright DOM Extractor tool in a live presentation.

## Setup Before Presentation

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/Kamenorite/playwright-dom-extractor.git
   cd playwright-dom-extractor
   npm install
   ```

2. Ensure Cursor MCP is properly configured:
   - Verify `.cursor/mcp.json` exists and contains the correct configuration
   - Ensure Cursor is running and MCP integration is active

3. Check that all demo HTML files are in place:
   - Verify `test-html/data-testid-demo.html` exists

4. Open these terminal windows/tabs:
   - One in the project root directory for running commands
   - One ready to open JSON/HTML files from the mappings directory
   - One ready to demonstrate the generated files

5. Test the demo script in advance to ensure everything works as expected

## Demo Flow

### Introduction (2 minutes)

1. Introduce yourself and the purpose of the presentation
2. Briefly explain what Playwright DOM Extractor is and why it was created
3. Show the GitHub repository to set the context
4. Outline what you'll be demonstrating

### Demo 1: Basic DOM Extraction (5 minutes)

1. Start by showing the interactive CLI:
   ```bash
   npm run cli
   ```

2. When prompted:
   - Choose "Extract DOM from a URL"
   - Enter the URL: `https://example.com`
   - Choose "Basic (Rule-based)" for semantic key generation
   - Output directory: `./mappings`
   - Feature name: `demo`
   - Take screenshot: Yes
   - Wait for selector: (leave empty)
   - Wait timeout: 5000 (default)

3. Show the generated files:
   ```bash
   ls -la mappings/
   ```

4. Open and explain the JSON file:
   ```bash
   cat mappings/demo_example_com_.json | head -n 20
   ```

5. Open the HTML report in your browser:
   ```bash
   open mappings/demo_example_com_.html  # On macOS
   # or
   xdg-open mappings/demo_example_com_.html  # On Linux
   # or
   start mappings/demo_example_com_.html  # On Windows
   ```

6. In the HTML report, highlight:
   - The interactive filtering capabilities
   - Element details and their attributes
   - The suggested Playwright selectors
   - The semantically generated keys

### Demo 2: AI-Powered Extraction with MCP (5 minutes)

1. Return to the interactive CLI:
   ```bash
   npm run cli
   ```

2. When prompted:
   - Choose "Extract DOM from a URL"
   - Enter the URL: `https://hivebrite.io` (or another more complex site)
   - Choose "AI-powered (via MCP)" for semantic key generation
   - Output directory: `./mappings`
   - Feature name: `ai_demo`
   - Take screenshot: Yes
   - Wait for selector: (leave empty)
   - Wait timeout: 5000 (default)

3. While it's running, explain:
   - How MCP integration works
   - The advantages of AI-powered semantic key generation
   - How it's using Cursor's AI capabilities

4. Compare the AI-generated keys with the basic ones:
   ```bash
   grep "semanticKey" mappings/demo_example_com_.json | head -n 10
   grep "semanticKey" mappings/ai_demo_hivebrite_io_.json | head -n 10
   ```

5. Show the improved quality of semantic keys:
   - More context-aware
   - Better descriptions
   - More consistent naming patterns

### Demo 3: Data-testid Prioritization (5 minutes)

1. First, show the demo HTML file that contains data-testid attributes:
   ```bash
   cat test-html/data-testid-demo.html | grep -A 2 data-testid
   ```

2. Extract DOM elements from this local file using the CLI or direct command:
   ```bash
   npm run monitor-page -- --url file://$(pwd)/test-html/data-testid-demo.html --feature testid_demo
   ```

3. Examine the results:
   ```bash
   cat mappings/testid_demo_*.json | grep -A 5 "data-testid"
   ```

4. Show how the generated selectors prioritize data-testid:
   - Open the HTML report
   - Filter for elements with data-testid
   - Point out how the suggested selectors use data-testid instead of ID or XPath

5. Explain the advantages of using data-testid:
   - Resilience to UI changes
   - Explicit testing intent
   - Better performance than complex XPath expressions

### Demo 4: Smart Selector System (5 minutes)

1. Show the demo test script:
   ```bash
   cat presentation/demo-test.ts
   ```

2. Explain key parts of the test:
   - How the `getSemanticSelector` function works
   - How selectors are prioritized based on data-testid
   - The improved readability of tests using semantic keys

3. Run the test to demonstrate it in action:
   ```bash
   npx playwright test presentation/demo-test.ts
   ```

4. Show the test results and the screenshot of the filled form:
   ```bash
   open presentation/form-filled.png # Or equivalent command for your OS
   ```

5. Explain what happens if HTML structure changes:
   - Show a theoretical example where IDs or classes change
   - Explain how tests using data-testid remain stable
   - Demonstrate how intelligent matching can find elements even with partial keys

### Conclusion and Advanced Features (3 minutes)

1. Summarize the key benefits demonstrated:
   - Automated element extraction
   - Semantic key generation
   - Data-testid prioritization
   - AI integration via MCP
   - Improved test stability and readability

2. Briefly mention additional features:
   - Mapping file management
   - Test generation capabilities
   - Integration with CI/CD pipelines
   - Additional configuration options

3. Show resources for additional information:
   - GitHub repository
   - README.md
   - SMART-SELECTOR.md
   - MCP-INTEGRATION.md
   - BEST-PRACTICES.md

### Q&A (5 minutes)

Be prepared to answer questions about:
- Installation and setup
- Integration with existing test suites
- Customization options
- Handling dynamic content
- Performance considerations
- Using with different frameworks

## Post-Demo Cleanup

1. Clean up any generated files if needed:
   ```bash
   rm -rf mappings/demo_* mappings/ai_demo_* mappings/testid_demo_*
   ```

2. Close all opened files and browsers

3. Push any changes made during the demo to GitHub if appropriate 