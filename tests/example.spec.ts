import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

test('Example test with semantic selectors', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Use semantic selectors
  const documentationLink = await getSemanticSelector('documentationLink');
  await page.locator(documentationLink).click();
  
  await expect(page).toHaveURL(/documentation/);
});

test('Login form test with semantic selectors', async ({ page }) => {
  await page.goto('https://example.com/login');
  
  // Get semantic selectors
  const usernameField = await getSemanticSelector('usernameField');
  const passwordField = await getSemanticSelector('passwordField');
  const loginButton = await getSemanticSelector('loginButton');
  
  // Fill and submit the form
  await page.locator(usernameField).fill('testuser');
  await page.locator(passwordField).fill('password123');
  await page.locator(loginButton).click();
  
  // Verify successful login
  const welcomeMessage = await getSemanticSelector('welcomeMessage');
  await expect(page.locator(welcomeMessage)).toBeVisible();
}); 