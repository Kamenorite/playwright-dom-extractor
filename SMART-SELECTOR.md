# Natural Language Selector System

The Natural Language Selector system enhances the traditional selector approach by adding intelligent matching capabilities that make your tests more maintainable and easier to write.

## Key Features

### 1. Partial Key Matching

Instead of typing the entire semantic key, you can use a partial key:

```typescript
// Instead of:
const element = await getByDescription('login_text_input_username');

// You can use:
const element = await getByDescription('username');
```

The system will find the best match based on the partial key, taking into account:
- Current page context (URL)
- Key relevance 
- Element importance

### 2. Natural Language Descriptions

You can describe elements in natural language:

```typescript
// These all work to find the login button:
const loginButton = await getByDescription('login button');
const loginButton = await getByDescription('submit login');
const loginButton = await getByDescription('sign in button');
```

The system will analyze your description and find the most semantically matching element key.

### 3. Context Awareness

The system automatically detects the current page context:

```typescript
// On login page
await page.goto('https://example.com/login');
const submitButton = await getByDescription('submit');  // Finds login_button_submit

// On profile page 
await page.goto('https://example.com/profile');
const submitButton = await getByDescription('submit');  // Finds profile_button_save
```

You can also specify the context explicitly:

```typescript
// Force login context regardless of current page
const element = await getByDescription('submit', 'login');
```

### 4. Pattern Matching with Wildcards

Use wildcards (`*`) to match patterns in semantic keys:

```typescript
// Find all buttons in the login context
const buttons = await getByDescription('login_button_*');

// Find all input fields regardless of context
const inputs = await getByDescription('*_input_*');
```

### 5. Automatic Fallback to Smart Matching

If an exact match isn't found, the system will:
1. Try partial key matching
2. Check for contextual matches
3. Look for natural language matches
4. Return the best available match based on a scoring system

## How It Works

The smart selector system uses a multi-step matching process:

1. Check for exact matches
2. Try context-aware partial matching
3. Apply intelligent word/term matching
4. Use pattern matching for wildcards
5. Score and rank potential matches
6. Return the best match (or throw an error if no good match)

## Usage Examples

### Basic Usage

```typescript
import { getByDescription, getElementByDescription } from '../utils/semantic-helper';

test('Login flow', async ({ page }) => {
  await page.goto('https://example.com/login');
  
  // Smart selectors make the test more readable and maintainable
  const username = await getByDescription('username');
  const password = await getByDescription('password');
  const loginButton = await getByDescription('login button');
  
  await page.fill(username, 'testuser');
  await page.fill(password, 'password123');
  await page.click(loginButton);
  
  // Notice how this is much clearer than remembering exact semantic keys
});
```

### Advanced Context Handling

```typescript
// With explicit context
const profileSaveButton = await getByDescription('save', 'profile');

// With URL-based automatic context
await page.goto('https://example.com/profile');
const saveButton = await getByDescription('save');  // Automatically uses profile context
```

### Element Groups with Wildcards

```typescript
// Find all social media links
const socialLinks = await getByDescription('profile_link_social_*');

// Find primary navigation items
const navItems = await getByDescription('header_nav_*');
```

## Best Practices

1. **Start Simple**: Begin with simple descriptors that identify the element's purpose
2. **Use Context**: When possible, let the system infer context from the URL
3. **Be Descriptive**: Use meaningful terms that match the element's purpose
4. **Fallback Strategy**: Have a fallback plan for elements that might be difficult to match

For more best practices on semantic selectors and data-testid attributes, see [BEST-PRACTICES.md](BEST-PRACTICES.md).

## Troubleshooting

If you're having trouble with smart selectors:

1. **Check Mapping Files**: Ensure your mapping files are up-to-date and have good semantic keys
2. **Be More Specific**: Add more context if you're getting the wrong element
3. **Explicit Context**: Use the optional context parameter if automatic detection isn't working
4. **Examine Available Keys**: Use `getAllSemanticKeys()` to see what keys are available

## Try It Out

The simplest way to experience the natural language selector system is to run the demo:

```bash
npm run semantic-demo
```

This will run a test that demonstrates all the features of the natural language selector system.

## Related Documentation

- [SEMANTIC-KEYS.md](SEMANTIC-KEYS.md): Learn about semantic key naming conventions and formats
- [BEST-PRACTICES.md](BEST-PRACTICES.md): Best practices for testing with semantic selectors
- [MCP-INTEGRATION.md](MCP-INTEGRATION.md): Using Cursor AI to enhance semantic key generation 