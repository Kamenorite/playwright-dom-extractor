# Semantic Key Generation System

This document explains how to use the semantic key generation system for Playwright tests. The system helps create consistent, meaningful selectors that improve test readability and maintenance.

## Key Benefits

- **Improved readability**: Semantic keys describe the purpose of elements, not just their location
- **Resilience to UI changes**: Tests remain stable even when element attributes change
- **Consistent naming conventions**: Follows structured patterns for easy understanding
- **Context awareness**: Keys include the page/component context 
- **Test reusability**: Semantic keys can be shared across test suites
- **data-testid prioritization**: Automatically leverages data-testid attributes when available

## Semantic Key Format

Our semantic keys follow this pattern:

```
[context]_[action/type]_[description]
```

### Components:

1. **Context**: Where the element is located (page, feature, section)
   - Examples: `homepage`, `analytics`, `nav`, `form`

2. **Action/Type**: What the element does or what type it is
   - For interactive elements: `button`, `link`, `submit`, `cancel`
   - For form elements: `input`, `dropdown`, `checkbox`
   - For content elements: `heading`, `text`, `image`

3. **Description**: Brief identifier for the specific element
   - Use meaningful words that describe the element's purpose
   - Keep concise (2-3 words maximum)
   - Use snake_case

### Examples:

```
homepage_heading_welcome
auth_submit_login
nav_link_products
form_text_input_email
profile_button_edit
```

## Priority Rules for Selector Generation

The system prioritizes selectors in the following order:

1. **data-testid attributes** (highest priority): When elements have a `data-testid` attribute, it will be:
   - Used directly as the semantic key if it already follows the pattern
   - Combined with context if needed to follow the pattern
   - Used as the selector in tests (`[data-testid="value"]`)

2. **ID attributes**: When elements have an ID but no data-testid:
   - Used to generate the semantic key
   - Used as the selector in tests (`#id`)

3. **Content and attributes**: When elements have neither data-testid nor ID:
   - Text content, ARIA attributes, etc. are used to generate a meaningful key
   - XPath is used as a last resort for selectors

This prioritization ensures tests are as reliable as possible, especially when the application has been specifically instrumented with data-testid attributes for testing.

For more details on implementing data-testid attributes effectively, see [BEST-PRACTICES.md](BEST-PRACTICES.md).

## Tools for Semantic Key Generation

### 1. Command Line Generator

The `generate-semantic-keys` tool analyzes web pages and generates semantic keys:

```bash
npm run generate-semantic-keys -- --url https://example.com --context profile
```

Options:
- `--url`: The page to analyze (required)
- `--context`: Feature/section name to use as key prefix
- `--output`: Output directory for mappings (default: ./mappings)
- `--selectors`: CSS selectors for targeting elements
- `--dynamic`: Analyze interactive elements and their states
- `--format`: Output format (json, html, both)
- `--wait`: Wait time after page load
- `--verbose`: Enable detailed logging

### 2. Enhanced Keys Tool

Improve existing semantic keys with better context awareness:

```bash
npm run enhance-keys -- --file ./mappings/example.json 
```

Options:
- `--file`: Single mapping file to enhance
- `--dir`: Directory with mapping files to enhance
- `--output`: Custom output location

### 3. DOM Monitor

Interactive tool for analyzing pages and extracting elements:

```bash
npm run monitor-page -- --url https://example.com --feature login
```

## Using Semantic Keys in Tests

In test files, use the `getSemanticSelector` function:

```typescript
import { getSemanticSelector } from '../utils/semantic-helper';

test('Login workflow', async ({ page }) => {
  // Navigate to page
  await page.goto('https://example.com/login');
  
  // Get semantic selectors
  const usernameSelector = await getSemanticSelector('login_text_input_username');
  const passwordSelector = await getSemanticSelector('login_password_input');
  const submitSelector = await getSemanticSelector('login_submit_button');
  
  // Use selectors in test
  await page.fill(usernameSelector, 'testuser');
  await page.fill(passwordSelector, 'password123');
  await page.click(submitSelector);
  
  // Assert login success
  const welcomeSelector = await getSemanticSelector('dashboard_heading_welcome');
  await expect(page.locator(welcomeSelector)).toBeVisible();
});
```

For intelligent ways to use partial or descriptive keys instead of full semantic keys, see [SMART-SELECTOR.md](SMART-SELECTOR.md).

## Best Practices

1. **Add data-testid attributes** to important elements in your application for maximum reliability
2. **Use meaningful data-testid values** that follow the `[context]_[action/type]_[description]` pattern when possible
3. **Be consistent** with naming patterns across the project
4. **Use meaningful names** that describe element purpose, not appearance
5. **Keep keys concise** (max 5 words total)
6. **Include context** for easier organization and understanding
7. **Consider element state** (especially for dynamic elements)
8. **Periodically update** keys when site structure changes
9. **Use appropriate waiting strategies** when working with dynamic content

For an expanded set of best practices, see [BEST-PRACTICES.md](BEST-PRACTICES.md).

## Integration with Cursor AI

This system integrates with Cursor's AI capabilities to generate better semantic keys. The `.cursor/prompts/semantic-ai-master.mdc` file defines rules for semantic key generation that Cursor AI can use when assisting with test creation.

To get AI help with semantic keys, use the following prompts:

- `@analyze <url>`: Analyze page structure and suggest semantic keys
- `@generate-keys <url>`: Generate semantic keys for all interactive elements
- `@create-test <description>`: Create a test using semantic selectors 

For more details on Cursor AI integration, see [MCP-INTEGRATION.md](MCP-INTEGRATION.md).

## Related Documentation

- [SMART-SELECTOR.md](SMART-SELECTOR.md): Using the smart selector system with partial and descriptive keys
- [BEST-PRACTICES.md](BEST-PRACTICES.md): Best practices for testing with semantic selectors
- [MCP-INTEGRATION.md](MCP-INTEGRATION.md): Using Cursor AI to enhance semantic key generation 