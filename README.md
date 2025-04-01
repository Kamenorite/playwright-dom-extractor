# Playwright DOM Extractor

A utility for monitoring and tracking DOM elements across test runs, with AI-powered semantic key generation for resilient test automation.

## Features

- **DOM Monitoring**: Track changes to DOM elements between test runs
- **Semantic Selectors**: Use AI-generated semantic keys instead of brittle CSS selectors
- **Visual Reporting**: Generate HTML reports to visualize DOM changes
- **CLI Tool**: Run the DOM monitor from the command line
- **Playwright Integration**: Seamlessly integrate with Playwright tests

## Installation

```bash
npm install
```

## Usage

### CLI Usage

```bash
# Run the DOM monitor on a URL
npm run dom-monitor -- --url https://example.com

# Enable AI-powered semantic key generation
npm run dom-monitor -- --url https://example.com --use-ai

# Specify output path for reports
npm run dom-monitor -- --url https://example.com --output-path ./custom-path
```

### Using Semantic Selectors in Tests

```typescript
import { test, expect } from "@playwright/test";
import { getSemanticSelector } from "../utils/semantic-helper";

test("Using semantic selectors", async ({ page }) => {
  await page.goto("https://example.com");

  // Use a semantic selector instead of a brittle CSS selector
  const documentationLink = await getSemanticSelector("documentationLink");
  await page.locator(documentationLink).click();

  // Verify that we navigated to the correct page
  await expect(page).toHaveURL(/documentation/);
});
```

## Example Reports

The DOM monitor generates two types of reports:

1. **JSON Report**: Contains detailed information about DOM elements and changes
2. **HTML Report**: Visual representation of DOM changes for easier analysis

Reports are saved in the `mappings` directory by default.

## Architecture

The DOM Extractor consists of several components:

- **DOM Monitor**: Core utility for tracking DOM elements
- **AI Service**: Integration with Claude or other AI services for semantic key generation
- **Report Generator**: Creates visual HTML reports from DOM monitor results
- **Semantic Helper**: Utility for using semantic selectors in tests

## Advanced Usage

### Customizing AI Integration

The DOM monitor supports different AI services:

```typescript
// Using the DOM monitor with a custom AI service
const monitor = new DOMMonitor({
  useAI: true,
  aiService: new CustomAIService(),
});
```

### Monitoring Specific Elements

```typescript
// Only monitor elements matching certain criteria
const monitor = new DOMMonitor({
  elementSelector: "button, a, input, select",
});
```

### Handling Dynamic Content

```typescript
// Wait for dynamic content to load before capturing DOM state
const monitor = new DOMMonitor({
  waitForSelector: ".content-loaded",
  waitTimeout: 10000,
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
