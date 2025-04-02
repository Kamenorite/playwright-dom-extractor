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

In your Playwright tests, use the `getSemanticSelector` function to benefit from data-testid prioritization:

```typescript
import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

test('User can log in', async ({ page }) => {
  await page.goto('https://example.com/login');
  
  // These will use data-testid selectors if available
  const usernameSelector = await getSemanticSelector('login_text_input_username');
  const passwordSelector = await getSemanticSelector('login_password_input');
  const submitSelector = await getSemanticSelector('login_submit_button');
  
  await page.fill(usernameSelector, 'testuser');
  await page.fill(passwordSelector, 'password123');
  await page.click(submitSelector);
  
  // Assertion
  const welcomeText = await getSemanticSelector('dashboard_heading_welcome');
  await expect(page.locator(welcomeText)).toBeVisible();
});
```

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

By following these best practices, you'll maximize the effectiveness of the Playwright DOM Extractor's data-testid prioritization feature and make your tests more robust and maintainable. 