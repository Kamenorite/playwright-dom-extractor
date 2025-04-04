# Playwright DOM Extractor
## Semantic Selectors for Resilient Test Automation

---

## The Problem

- **Brittle Selectors**: Minor UI changes break tests
- **Manual Maintenance**: Significant time updating selectors
- **Inconsistent Naming**: No standard conventions
- **Context Disconnect**: Selectors don't reflect element purpose
- **Ambiguous Selectors**: Multiple similar elements cause test flakiness

---

## Solution: Playwright DOM Extractor

A framework for resilient, maintainable test automation:

- **Extract & Analyze**: Automatically extract DOM elements
- **Generate Semantic Keys**: Create meaningful, consistent selectors
- **Intelligent Selection**: Use smart matching and context detection
- **AI Enhancement**: Leverage Cursor AI for better element analysis
- **Ambiguity Detection**: Ensure unique element identification

---

## System Architecture

![System Architecture](./reveal/architecture-diagram.png)

1. **DOM Monitor**: Extracts page elements and communicates with AI services
2. **Semantic Helper**: Manages element lookup and ambiguity detection
3. **MCPAIService**: Interfaces with Cursor AI for semantic key generation
4. **Natural Language Matcher**: Translates descriptions to selectors

---

## Component Interactions

```
┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
│ Test Scripts  │─────▶│ Semantic Helper │─────▶│ DOM Monitor    │
└───────────────┘      └─────────────────┘      └────────────────┘
                               │  ▲                     │
                               ▼  │                     ▼
                        ┌──────────────┐       ┌────────────────┐
                        │ Mapping Files│◀──────│ MCP AI Service │
                        └──────────────┘       └────────────────┘
```

- **Tests** use natural language descriptions via `getByDescription`
- **Semantic Helper** matches descriptions to elements using mapping files
- **DOM Monitor** extracts elements from pages
- **MCP AI Service** generates semantic keys and alternative names

---

## Key Components

1. **DOM Monitor**: Extract and analyze elements from web pages
2. **Semantic Helper**: Find elements with natural language descriptions
3. **Cursor AI Integration**: Enhance key generation without API keys 
4. **Mapping Files**: Cache element information for faster lookups

---

## Natural Language Description Matching

```typescript
// Old approach - exact semantic key
const button = await getSemanticSelector('login_button_submit');

// New approach - natural language description
const button = await getByDescription(page, 'login button');

// With feature context for disambiguation
const button = await getByDescription(page, 'submit button', 'checkout');
```

---

## Ambiguity Detection

```typescript
try {
  // This might match multiple elements with similar scores
  const deleteButton = await getByDescription(page, 'delete button');
  await deleteButton.click();
} catch (error) {
  // Will suggest more specific descriptions when ambiguous
  console.error(error);
  // Example output: "Ambiguous match for 'delete button'. 
  // Consider using 'delete item button' or 'delete account button'"
}
```

---

## How Ambiguity Detection Works

1. **Score-based Matching**: Elements scored by relevance to description
2. **Threshold Analysis**: Detect when multiple elements have similar scores
3. **Alternative Suggestions**: Propose more specific descriptions
4. **Feature Enforcement**: Require feature specification when necessary

---

## Under The Hood: Description to Selector

1. User calls `getByDescription(page, 'login button')`
2. Semantic helper loads cached mapping files
3. Each element scored based on:
   - Semantic key match
   - Alternative name match
   - Feature context
   - Tag name and text content
4. Ambiguity detection identifies similar scores
5. Best match translated to a Playwright selector
6. Returned as a Playwright locator

---

## data-testid Prioritization

### Without data-testid:
```typescript
// Using brittle selectors
await page.fill('#username', 'testuser');
await page.fill('.password-field', 'password123');
await page.click('.login-btn');
```

### With data-testid and natural language:
```typescript
// Using descriptions with data-testid priority
await getByDescription(page, 'username field').fill('testuser');
await getByDescription(page, 'password field').fill('password123');
await getByDescription(page, 'login button').click();
```

---

## Cursor MCP Integration

```typescript
// DOM Monitor initializes MCPAIService
const monitor = new DOMMonitor({
  useAI: true,
  useMCP: true  // Use Cursor AI without external API keys
});

// MCPAIService uses Cursor for:
// 1. Generating semantic keys for elements
// 2. Creating alternative names for better matching
// 3. Analyzing element context and purpose
```

---

## Alternative Names for Flexibility

```json
{
  "tagName": "button",
  "semanticKey": "login_submit_button",
  "alternativeNames": [
    "login button", 
    "sign in button",
    "submit credentials button",
    "log in to account button"
  ]
}
```

- Generated by AI to provide multiple ways to refer to elements
- Used by natural language matcher to find best matches
- Longer alternatives help resolve ambiguity

---

## Key Benefits

- **Resilience**: Tests remain stable through UI changes
- **Maintainability**: Clear, semantic naming improves readability
- **Flexibility**: Natural language matching reduces cognitive load
- **Ambiguity Prevention**: Unique element identification guaranteed
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
node examples/ambiguity-detection-demo.ts
npx playwright test examples/essential-demo.spec.ts
```

---

## Resources

- GitHub: [github.com/yourusername/playwright-dom-extractor](https://github.com/yourusername/playwright-dom-extractor)
- Documentation: README.md, BEST-PRACTICES.md, MCP-INTEGRATION.md
- Examples: See `/examples` directory

---

## Q&A

[Contact Information] 