import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

// This test demonstrates the intelligent/fuzzy semantic selector capabilities
test('Demo of smart semantic selector usage', async ({ page }) => {
  // Navigate to our test page - this helps the system detect the context
  await page.goto('https://example.com/login');
  
  // Example 1: Using a partial key (no underscores)
  // Instead of typing the exact key 'login_text_input_username'
  // you can just use 'username' and the system will find the closest match
  const usernameSelector = await getSemanticSelector('username');
  await page.fill(usernameSelector, 'testuser');
  
  // Example 2: Using context prefix with partial key
  // If you know the context but not the full key
  const passwordSelector = await getSemanticSelector('login_password');
  await page.fill(passwordSelector, 'password123');
  
  // Example 3: Using descriptive terms instead of exact keys
  // The system will find elements with matching descriptions
  const submitSelector = await getSemanticSelector('submit login');
  await page.click(submitSelector);
  
  // Example 4: Using wildcards for pattern matching
  // Great for finding elements when you know part of the pattern
  const welcomeSelector = await getSemanticSelector('*_heading_welcome');
  await expect(page.locator(welcomeSelector)).toBeVisible();
  
  // Example 5: The system can detect the page context from the URL
  // and suggest selectors from the right mapping file
  const profileSelector = await getSemanticSelector('edit profile');
  await page.click(profileSelector);
  
  // Traditional way - for comparison
  const traditionalSelector = await getSemanticSelector('settings_checkbox_notifications');
  await page.check(traditionalSelector);
});

// This test shows how the system can automatically detect context
test('Auto-detect feature context from URL', async ({ page }) => {
  // When navigating to a URL, the system can detect the feature
  // from the mapping files that match this URL pattern
  await page.goto('https://example.com/profile');
  
  // Now we can use partial keys and the system will prioritize
  // selectors from the profile feature mappings
  const nameSelector = await getSemanticSelector('name');  // Will find profile_text_input_name
  await page.fill(nameSelector, 'John Doe');
  
  const saveSelector = await getSemanticSelector('save');  // Will find profile_button_save
  await page.click(saveSelector);
}); 