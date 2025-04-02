import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Demo test showing how to use Playwright DOM Extractor's semantic selectors
 */
test('User registration demo using semantic selectors', async ({ page }) => {
  // Get the absolute path to our demo HTML file
  const testHtmlPath = path.join(__dirname, '../test-html/data-testid-demo.html');
  const fileUrl = `file://${testHtmlPath}`;
  
  // Navigate to the demo page
  await page.goto(fileUrl);
  
  // Get semantic selectors for the form elements
  // This demonstrates how data-testid attributes are prioritized
  const usernameSelector = await getSemanticSelector('demo_text_input_username');
  const emailSelector = await getSemanticSelector('demo_text_input_email');
  const passwordSelector = await getSemanticSelector('demo_password_input');
  const countrySelector = await getSemanticSelector('demo_dropdown_country');
  const termsSelector = await getSemanticSelector('demo_checkbox_terms');
  const submitSelector = await getSemanticSelector('demo_submit_button');
  
  // Fill in the form using semantic selectors
  await page.fill(usernameSelector, 'testuser');
  await page.fill(emailSelector, 'test@example.com');
  await page.fill(passwordSelector, 'securepassword123');
  await page.selectOption(countrySelector, 'us');
  await page.check(termsSelector);
  
  // Take a screenshot of the filled form
  await page.screenshot({ path: path.join(__dirname, 'form-filled.png') });
  
  // Submit the form
  await page.click(submitSelector);
  
  // For demo purposes - show what happens if we modify the HTML but keep data-testid
  // We would add this part after showing the basic test works
  
  console.log('\n--- Demonstration of selector resilience ---');
  console.log('Even if we change IDs or classes, tests using data-testid remain stable');
  
  // Comparison of different selector approaches
  console.log('\nTraditional ID-based selectors:');
  console.log(`  await page.fill('#username-input', 'testuser');`);
  console.log(`  await page.fill('#email-input', 'test@example.com');`);
  
  console.log('\nSemantic selectors with data-testid prioritization:');
  console.log(`  await page.fill('${usernameSelector}', 'testuser');`);
  console.log(`  await page.fill('${emailSelector}', 'test@example.com');`);
  
  // Log all available semantic keys for reference
  console.log('\nAvailable semantic keys in mapping:');
  // This would normally load from the mapping file
  const demoKeys = [
    'demo_heading_main',
    'demo_heading_form',
    'demo_form_registration',
    'demo_text_input_username',
    'demo_text_input_email',
    'demo_password_input',
    'demo_dropdown_country',
    'demo_checkbox_terms',
    'demo_submit_button',
    'demo_reset_button'
  ];
  
  demoKeys.forEach(key => {
    console.log(`  ${key} => ${getSemanticSelectorValue(key)}`);
  });
});

// Helper function that returns the selector value for demo purposes
// In a real test, this would use the actual getSemanticSelector function
function getSemanticSelectorValue(key: string): string {
  // For demo, we'll use data-testid directly
  return `[data-testid="${key}"]`;
} 