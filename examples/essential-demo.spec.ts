import { test, expect } from '@playwright/test';
import { getByDescription, getElementByDescription } from '../utils/semantic-helper';

/**
 * This file demonstrates the core functionality of the Playwright DOM Extractor
 * and its semantic selector capabilities with a simple login flow example.
 */

test.describe('Essential Demo', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test HTML
    await page.goto('file://' + __dirname + '/test-html/semantic-demo.html');
  });

  test('Login scenario using natural language descriptions', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Demonstrates using natural language descriptions for locators'
    });

    // Use natural language descriptions to find elements
    const usernameField = await getByDescription(page, 'username input');
    const passwordField = await getByDescription(page, 'password input');
    const loginButton = await getByDescription(page, 'login button');

    // Interact with elements
    await usernameField.fill('testuser');
    await passwordField.fill('password123');
    await loginButton.click();

    // Verify success message is displayed
    const successMessage = await getByDescription(page, 'success message');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Login successful');
  });

  test('Profile form using flexible descriptions', async ({ page }) => {
    // Go to profile page first
    await page.click('text=Go to Profile');

    // Use flexible descriptions - different wording but similar meaning
    const firstNameField = await getByDescription(page, 'first name field');
    const lastNameField = await getByDescription(page, 'last name field');

    // Fill out fields
    await firstNameField.fill('John');
    await lastNameField.fill('Doe');

    // Use very natural language
    const bioField = await getByDescription(page, 'biography text area');
    const saveButton = await getByDescription(page, 'save button');

    await bioField.fill('This is a test biography with some information.');
    
    // Toggle some preference settings
    const notificationsCheckbox = await getByDescription(page, 'notifications');
    await notificationsCheckbox.check();

    // Get multiple matching elements
    const selector = await getElementByDescription('social media link');
    const socialMediaLinks = page.locator(selector);
    
    // Verify we found the right number of links
    await expect(socialMediaLinks).toHaveCount(3);

    // Save the form
    await saveButton.click();
    
    // Verify success message
    const successMessage = await getByDescription(page, 'success message');
    await expect(successMessage).toBeVisible();
  });

  test('Demonstrating flexibility of matching', async ({ page }) => {
    // These should all match the login button
    const button1 = await getByDescription(page, 'login button');
    const button2 = await getByDescription(page, 'submit login');
    const button3 = await getByDescription(page, 'sign in');
    
    // Verify they're all the same element
    await expect(button1).toHaveText('Login');
    await expect(button2).toHaveText('Login');
    await expect(button3).toHaveText('Login');
  });
}); 