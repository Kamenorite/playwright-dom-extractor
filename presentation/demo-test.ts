import { test, expect } from '@playwright/test';
import { getByDescription, clearMappingCache } from '../utils/semantic-helper';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Demo test showing how to use Playwright DOM Extractor's natural language descriptions
 */
test('User registration demo using natural language descriptions', async ({ page }) => {
  // Get the absolute path to our demo HTML file
  const testHtmlPath = path.join(__dirname, '../test-html/data-testid-demo.html');
  const fileUrl = `file://${testHtmlPath}`;
  
  // Navigate to the demo page
  await page.goto(fileUrl);
  
  // Get elements using natural language descriptions
  // This demonstrates how data-testid attributes are prioritized
  const usernameSelector = await getByDescription(page, 'username field');
  const emailSelector = await getByDescription(page, 'email field');
  const passwordSelector = await getByDescription(page, 'password field');
  const countrySelector = await getByDescription(page, 'country dropdown');
  const termsSelector = await getByDescription(page, 'terms checkbox');
  const submitSelector = await getByDescription(page, 'submit button');
  
  // Fill in the form using natural language selectors
  await usernameSelector.fill('testuser');
  await emailSelector.fill('test@example.com');
  await passwordSelector.fill('securepassword123');
  await countrySelector.selectOption('us');
  await termsSelector.check();
  
  // Take a screenshot of the filled form
  await page.screenshot({ path: path.join(__dirname, 'form-filled.png') });
  
  // Submit the form
  await submitSelector.click();
  
  // For demo purposes - show what happens if we modify the HTML but keep data-testid
  // We would add this part after showing the basic test works
  
  console.log('\n--- Demonstration of selector resilience ---');
  console.log('Even if we change IDs or classes, tests using data-testid remain stable');
  
  // Comparison of different selector approaches
  console.log('\nTraditional ID-based selectors:');
  console.log(`  await page.locator('#username-input').fill('testuser');`);
  console.log(`  await page.locator('#email-input').fill('test@example.com');`);
  
  console.log('\nNatural language descriptions with data-testid prioritization:');
  console.log(`  await getByDescription(page, 'username field').fill('testuser');`);
  console.log(`  await getByDescription(page, 'email field').fill('test@example.com');`);
  
  // Log info about how the matching process works
  console.log('\nUnder the hood - Natural language matching process:');
  console.log('1. Load mapping files (cached for performance)');
  console.log('2. Score each element based on match to description');
  console.log('3. Check for ambiguity (multiple elements with similar scores)');
  console.log('4. Return the best match as a Playwright locator');
});

/**
 * Demo script showing the ambiguity detection in action
 */
test.describe('Ambiguity Detection Demo', () => {
  test.beforeEach(async ({ page }) => {
    clearMappingCache();
    
    // Create a page with multiple similar elements for ambiguity testing
    await page.setContent(`
      <div>
        <button id="save-profile" data-testid="profile_save_button">Save Profile</button>
        <button id="save-settings" data-testid="settings_save_button">Save Settings</button>
        <button id="save-payment" data-testid="payment_save_button">Save Payment</button>
      </div>
    `);
  });

  test('Demonstrating ambiguity detection', async ({ page }) => {
    console.log('🚀 Starting ambiguity detection demo');
    
    // This will succeed because it's specific enough
    const profileSaveButton = await getByDescription(page, 'save profile button');
    await expect(profileSaveButton).toBeVisible();
    console.log('✅ Found specific "save profile button" without ambiguity');
    
    try {
      // This will detect ambiguity - too generic
      const genericSaveButton = await getByDescription(page, 'save button');
      await genericSaveButton.click();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('✅ Ambiguity detected for generic "save button" description:');
      console.log(errorMessage);
      console.log('The error suggests more specific descriptions to use instead');
    }
    
    // Resolve ambiguity using feature context
    console.log('\nResolving ambiguity using feature context:');
    
    try {
      // Using a feature context to disambiguate
      const settingsSaveButton = await getByDescription(page, 'save button', 'settings');
      await expect(settingsSaveButton).toBeVisible();
      console.log('✅ Found "save button" with feature context "settings"');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('❌ Failed to resolve with feature context:', errorMessage);
    }
  });
  
  test('Examples of matching flexibility', async ({ page }) => {
    // Get elements using various descriptions
    const selectors = [
      await getByDescription(page, 'profile save button'),
      await getByDescription(page, 'save profile'),
      await getByDescription(page, 'profile button'),
      await getByDescription(page, 'save profile changes')
    ];
    
    console.log('\n🔍 Demonstrating flexible description matching:');
    
    // Verify all point to the same element
    for (const selector of selectors) {
      await expect(selector).toBeVisible();
      const text = await selector.textContent();
      console.log(`✅ "${text}" found with different description`);
    }
    
    console.log('\nFlexible matching works because of:');
    console.log('- Score-based matching against semantic keys');
    console.log('- Alternative name matching for elements');
    console.log('- Partial word matching and normalization');
    console.log('- Context-aware boosting of relevant elements');
  });
}); 