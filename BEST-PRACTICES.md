# Best Practices for Playwright DOM Extractor

This document outlines best practices for working with the Playwright DOM Extractor tool, with a focus on using data-testid attributes effectively.

## Using data-testid Attributes

### Why Use data-testid?

Data-testid attributes provide several advantages for test automation:

- **Stability**: Unlike CSS classes or XPath, data-testid attributes are specifically for testing and won't change due to styling updates
- **Clarity**: They explicitly mark elements that should be interacted with during tests
- **Performance**: Selectors using data-testid are typically faster than complex XPath expressions
- **Isolation**: They separate testing concerns from styling and functional concerns

### Implementing data-testid in Your Application

#### React Example

```jsx
// Good practice
<button 
  data-testid="profile_submit_button" 
  onClick={handleSubmit}
  className="btn btn-primary"
>
  Save Changes
</button>

// Avoid this (no data-testid)
<button 
  onClick={handleSubmit}
  className="btn btn-primary"
>
  Save Changes
</button>
```

#### Vue Example

```vue
<!-- Good practice -->
<template>
  <button 
    data-testid="checkout_payment_button"
    @click="processPayment"
    class="payment-btn"
  >
    Process Payment
  </button>
</template>

<!-- Avoid this (no data-testid) -->
<template>
  <button 
    @click="processPayment"
    class="payment-btn"
  >
    Process Payment
  </button>
</template>
```

#### Angular Example

```html
<!-- Good practice -->
<button 
  data-testid="dashboard_refresh_button"
  (click)="refreshData()"
  class="refresh-btn"
>
  Refresh Data
</button>

<!-- Avoid this (no data-testid) -->
<button 
  (click)="refreshData()"
  class="refresh-btn"
>
  Refresh Data
</button>
```

### Naming Conventions for data-testid

For maximum compatibility with the DOM Extractor's semantic key system, name your data-testid attributes following this pattern:

```
[context]_[action/type]_[description]
```

Examples:
- `login_text_input_username`
- `products_filter_dropdown`
- `checkout_submit_payment`
- `cart_remove_button_item`
- `profile_image_avatar`

For more details on the semantic key format, see [SEMANTIC-KEYS.md](SEMANTIC-KEYS.md).

### data-testid in Forms

Forms should have data-testid attributes for all interactive elements:

```html
<form data-testid="login_form">
  <input data-testid="login_text_input_username" type="text" />
  <input data-testid="login_password_input" type="password" />
  <button data-testid="login_submit_button" type="submit">Login</button>
</form>
```

### data-testid in Lists

For lists of similar items, include the index or a unique identifier:

```html
<ul data-testid="product_list">
  <li data-testid="product_list_item_1">
    <button data-testid="product_add_button_1">Add to Cart</button>
  </li>
  <li data-testid="product_list_item_2">
    <button data-testid="product_add_button_2">Add to Cart</button>
  </li>
</ul>
```

## Using the DOM Extractor with data-testid

### Scanning Pages with data-testid

When using the Playwright DOM Extractor to scan pages that have data-testid attributes, the system will automatically prioritize them:

```bash
npm run scan-specs -- --tests-dir ./tests
```

The generated mappings will primarily use data-testid attributes when available.

### Writing Tests with Semantic Selectors

In your Playwright tests, use the `getByDescription` function to benefit from data-testid prioritization:

```typescript
import { test, expect } from '@playwright/test';
import { getByDescription } from '../utils/semantic-helper';

test('User can log in', async ({ page }) => {
  await page.goto('https://example.com/login');
  
  // These will use data-testid selectors if available
  const usernameSelector = await getByDescription('login_text_input_username');
  const passwordSelector = await getByDescription('login_password_input');
  const submitSelector = await getByDescription('login_submit_button');
  
  await page.fill(usernameSelector, 'testuser');
  await page.fill(passwordSelector, 'password123');
  await page.click(submitSelector);
  
  // Assertion
  const welcomeText = await getByDescription('dashboard_heading_welcome');
  await expect(page.locator(welcomeText)).toBeVisible();
});
```

You can also use the smart selector system with partial keys or descriptive terms for more readable tests. See [SMART-SELECTOR.md](SMART-SELECTOR.md) for details.

## Handling Dynamic Content and States

Even with data-testid attributes, dynamic content can be challenging. Here are some strategies:

### Dynamic States

For elements with multiple states, use descriptive data-testid attributes:

```html
<!-- Initially -->
<button data-testid="notification_toggle_button_off">Enable Notifications</button>

<!-- After clicking -->
<button data-testid="notification_toggle_button_on">Disable Notifications</button>
```

### Loading States

For loading indicators:

```html
<div data-testid="products_loading_indicator" class="spinner">Loading...</div>
<div data-testid="products_empty_state" class="empty-state">No products found</div>
<div data-testid="products_error_message" class="error">Failed to load products</div>
```

## Common Pitfalls to Avoid

1. **Changing data-testid values**: Once set, avoid changing data-testid values as this will break tests
2. **Duplicate data-testid values**: Each data-testid should be unique within a page
3. **Using data-testid for non-testing purposes**: Keep these attributes solely for testing
4. **Generic data-testid values**: Avoid generic names like "button" or "input" without context
5. **Missing data-testid on key elements**: Ensure all interactive elements have data-testid

## Advanced Techniques

### Component Libraries

For component libraries, establish data-testid conventions early:

```jsx
// React component library example
function Button({ onClick, children, testId }) {
  return (
    <button 
      data-testid={testId} 
      onClick={onClick}
      className="btn"
    >
      {children}
    </button>
  );
}

// Usage
<Button testId="checkout_submit_button">Submit Order</Button>
```

### Automated data-testid Addition

Consider tools to enforce data-testid attributes in your codebase:

- ESLint plugins that warn when interactive elements lack data-testid
- Pre-commit hooks that check for data-testid presence
- Component templates that include data-testid by default

## Continuous Integration

Incorporate data-testid checks into your CI/CD pipeline:

1. Run automated tests that verify data-testid attributes are present
2. Generate reports of elements missing data-testid attributes
3. Include data-testid coverage in code review checklists

## Related Documentation

- [SEMANTIC-KEYS.md](SEMANTIC-KEYS.md): Comprehensive guide to semantic key conventions
- [SMART-SELECTOR.md](SMART-SELECTOR.md): Using the smart selector system for more readable tests
- [MCP-INTEGRATION.md](MCP-INTEGRATION.md): Using Cursor AI to help identify and generate semantic selectors

## Element Selection Best Practices

### Use Natural Language Descriptions

When selecting elements on a page, prefer using natural language descriptions with the `getByDescription` function. It provides a more maintainable and resilient approach than standard CSS or XPath selectors. For example:

```typescript
// ✅ Good - natural language description
const searchButton = await getByDescription(page, 'search button');

// ❌ Avoid - brittle selectors
const searchButton = page.locator('#search-btn');
```

### Handling Ambiguous Element Matches

The natural language description matcher now includes ambiguity detection that provides feedback when a description might match multiple elements with similar relevance scores. The system will:

1. Warn you when a description matches multiple elements with similar scores
2. Suggest more specific alternative names to try based on available element metadata
3. Show which features the ambiguous elements belong to, so you can scope your selection

When ambiguity is detected and elements belong to different features, you may receive an error requiring feature specification. This helps ensure that your tests are selecting the exact elements you intend.

```typescript
// When ambiguity exists between features, specify the feature
const submitButton = await getByDescription(page, 'submit button', 'checkout');
```

You can see this in action by running the ambiguity detection demo:

```bash
ts-node examples/ambiguity-detection-demo.ts
```

### Be Specific in Element Descriptions

More specific descriptions lead to more accurate element matching. For best results:

- Include the element type (button, input, etc.) in your description
- Add contextual information when available (e.g., "login form submit button")
- Use exact text content when it's distinctive (e.g., "accept cookies button")

```typescript
// ✅ Better - more specific description
const loginButton = await getByDescription(page, 'login form submit button');

// ❌ Less specific, may lead to ambiguity
const button = await getByDescription(page, 'submit button');
```

By following these best practices, you'll maximize the effectiveness of the Playwright DOM Extractor's data-testid prioritization feature and make your tests more robust and maintainable. 