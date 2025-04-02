import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

/**
 * This file demonstrates the core functionality of the Playwright DOM Extractor
 * and its semantic selector capabilities with a simple login flow example.
 */

test.describe('Semantic Selector Demonstration', () => {
  
  test('Login and profile update with semantic selectors', async ({ page }) => {
    // 1. Navigate to the example login page
    await page.goto('https://example.com/login');
    console.log('✅ Navigate to login page');
    
    // DEMO 1: Using exact semantic keys (traditional approach)
    console.log('\n🔍 DEMO 1: Using exact semantic keys');
    const usernameSelector = await getSemanticSelector('login_text_input_username');
    const passwordSelector = await getSemanticSelector('login_password_input');
    const loginButtonSelector = await getSemanticSelector('login_button_submit');
    
    await page.fill(usernameSelector, 'demo_user');
    await page.fill(passwordSelector, 'demo_password');
    await page.click(loginButtonSelector);
    
    console.log('✅ Successfully logged in using exact semantic keys');
    
    // 2. Navigate to profile page to demonstrate context-aware selectors
    await page.goto('https://example.com/profile');
    console.log('\n✅ Navigate to profile page');
    
    // DEMO 2: Smart matching with partial keys
    console.log('\n🔍 DEMO 2: Using partial keys with smart matching');
    const firstNameSelector = await getSemanticSelector('first_name');
    const lastNameSelector = await getSemanticSelector('last_name');
    
    await page.fill(firstNameSelector, 'John');
    await page.fill(lastNameSelector, 'Doe');
    
    console.log('✅ Filled name fields using partial key matching');
    
    // DEMO 3: Using natural language descriptions
    console.log('\n🔍 DEMO 3: Using natural language descriptions');
    const bioSelector = await getSemanticSelector('biography text area');
    const saveButtonSelector = await getSemanticSelector('save button');
    
    await page.fill(bioSelector, 'This is a demo of the smart semantic selector system.');
    await page.click(saveButtonSelector);
    
    console.log('✅ Updated profile using natural language selectors');
    
    // DEMO 4: Context awareness and automatic feature detection
    console.log('\n🔍 DEMO 4: Context awareness and automatic feature detection');
    // Since we're on the profile page, the system automatically knows the context
    const notificationCheckbox = await getSemanticSelector('notifications');
    await page.check(notificationCheckbox);
    
    console.log('✅ Toggled notification settings using context awareness');
    
    // DEMO 5: Pattern matching with wildcards
    console.log('\n🔍 DEMO 5: Pattern matching with wildcards');
    const socialMediaLinks = await getSemanticSelector('profile_link_*');
    await page.click(socialMediaLinks);
    
    console.log('✅ Clicked social media link using wildcard pattern');
    
    // Verification
    const successMessage = await getSemanticSelector('profile_success_message');
    await expect(page.locator(successMessage)).toBeVisible();
    
    console.log('\n✅ DEMO COMPLETE: All semantic selector features demonstrated');
  });
  
  test('Smart semantic selector error handling', async ({ page }) => {
    // Demonstrate how the system handles cases when a selector isn't found
    await page.goto('https://example.com');
    
    try {
      // This should fail because this key doesn't exist
      await getSemanticSelector('non_existent_element');
    } catch (error) {
      console.log('✅ Properly handled non-existent selector');
      // In a real test, you might use expect().toThrow() instead
    }
    
    // Demonstration of fallback behavior
    try {
      // The system will try to find the closest match
      const closeMatchSelector = await getSemanticSelector('submit login');
      console.log(`✅ Found closest match for "submit login": ${closeMatchSelector}`);
    } catch (error) {
      console.log('⚠️ Could not find a close match (expected in some environments)');
    }
  });
}); 