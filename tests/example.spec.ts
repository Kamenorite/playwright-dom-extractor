import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

/**
 * Simple example test demonstrating the use of semantic selectors.
 * This test uses the example mapping files in the clean-mappings directory.
 */
test.describe('Semantic selector example', () => {
  test('Using semantic selectors for login', async ({ page }) => {
    // Go to the login page
    await page.goto('https://example.com/login');
    
    // Get semantic selectors from the mapping
    const usernameSelector = await getSemanticSelector('login_text_input_username');
    const passwordSelector = await getSemanticSelector('login_password_input');
    const loginButtonSelector = await getSemanticSelector('login_button_submit');
    
    // Fill the form and submit
    await page.fill(usernameSelector, 'testuser');
    await page.fill(passwordSelector, 'password123');
    await page.click(loginButtonSelector);
    
    // Assert that login was successful (mocked for example)
    await expect(page).toHaveURL(/dashboard/);
  });
}); 