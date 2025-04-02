# Playwright DOM Extractor
## Semantic Selectors for Resilient Test Automation

---

## The Problem

- **Brittle Selectors**: Minor UI changes break tests
- **Manual Maintenance**: Significant time updating selectors
- **Inconsistent Naming**: No standard conventions
- **Context Disconnect**: Selectors don't reflect element purpose

---

## Solution: Playwright DOM Extractor

A framework for resilient, maintainable test automation:

- **Extract & Analyze**: Automatically extract DOM elements
- **Generate Semantic Keys**: Create meaningful, consistent selectors
- **Intelligent Selection**: Use smart matching and context detection
- **AI Enhancement**: Leverage Cursor AI for better element analysis

---

## Key Components

1. **DOM Monitor**: Extract and analyze elements from web pages
2. **Semantic Helper**: Find elements with smart, intelligent matching
3. **Cursor AI Integration**: Enhance key generation without API keys

---

## Semantic Key Format

```
[context]_[element-type]_[purpose]
```

Examples:
- `login_text_input_username`
- `profile_button_save`
- `cart_checkbox_gift_wrap`

---

## Smart Selector System

```typescript
// Traditional approach - exact key
const button = await getSemanticSelector('login_button_submit');

// Smart selector - partial key
const button = await getSemanticSelector('submit');

// Smart selector - natural language
const button = await getSemanticSelector('login button');

// Smart selector - with context
const button = await getSemanticSelector('save', 'profile');

// Smart selector - pattern matching
const button = await getSemanticSelector('*_button_*');
```

---

## data-testid Prioritization

### Without data-testid:
```typescript
// Using brittle selectors
await page.fill('#username', 'testuser');
await page.fill('.password-field', 'password123');
await page.click('.login-btn');
```

### With data-testid:
```typescript
// Using semantic selectors with data-testid priority
const username = await getSemanticSelector('username');
const password = await getSemanticSelector('password');
const loginBtn = await getSemanticSelector('login button');

await page.fill(username, 'testuser');
await page.fill(password, 'password123');
await page.click(loginBtn);
```

---

## Cursor MCP Integration

```typescript
// Initialize DOM Monitor with MCP enabled
const domMonitor = new DOMMonitor({
  useAI: true,
  useMCP: true, // Use Cursor AI without external API keys
  outputPath: './mappings'
});

// Extract elements and generate AI-enhanced keys
const elements = await domMonitor.extractDOMElements(page);
const enhancedElements = await domMonitor.generateSemanticKeys(
  elements, 'https://example.com/login'
);
```

---

## Key Benefits

- **Resilience**: Tests remain stable through UI changes
- **Maintainability**: Clear, semantic naming improves readability
- **Flexibility**: Smart matching reduces cognitive load
- **Context Awareness**: Keys reflect element purpose and location
- **AI Enhancement**: Better quality keys with less effort

---

## Getting Started

```bash
# Clone repository
git clone https://github.com/yourusername/playwright-dom-extractor.git

# Install dependencies
npm ci

# Run demos
node examples/dom-extraction-demo.js
node examples/mcp-integration-demo.js
npx playwright test examples/essential-demo.spec.ts
```

---

## Resources

- GitHub: [github.com/yourusername/playwright-dom-extractor](https://github.com/yourusername/playwright-dom-extractor)
- Documentation: README.md, SMART-SELECTOR.md, MCP-INTEGRATION.md
- Examples: See `/examples` directory

---

## Q&A

[Contact Information] 