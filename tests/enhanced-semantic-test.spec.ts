import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

/**
 * This test demonstrates the improved semantic key generation with context-aware keys.
 * It uses the enhanced semantic keys for page elements following the pattern:
 * [context]_[action/type]_[description]
 */
test('Navigate hivebrite.io site using enhanced semantic keys', async ({ page }) => {
  // Go to the hivebrite.io website
  await page.goto('https://hivebrite.io');
  await page.waitForLoadState('networkidle');
  
  // Handle cookie consent using semantic key
  try {
    // Looking for the cookie decline button with its semanticKey
    const cookieButtonId = '#CybotCookiebotDialogBodyButtonDecline';
    if (await page.locator(cookieButtonId).isVisible({ timeout: 3000 })) {
      await page.locator(cookieButtonId).click();
      console.log('Declined cookies');
    }
  } catch (error) {
    console.log('Cookie dialog not present or different structure');
  }
  
  // Take a screenshot of the homepage
  await page.screenshot({ path: 'hivebrite-enhanced-home.png' });
  
  // Improved semantic key for Products menu
  const productsMenuSelector = await getSemanticSelector('ui_nav_link_product');
  const productsButton = page.locator(productsMenuSelector);
  
  await productsButton.waitFor({ state: 'visible' });
  console.log('Products menu button is visible');
  
  // Click the Products button to show the dropdown
  await productsButton.click();
  console.log('Clicked Products menu button');
  
  // Wait for dropdown menu animation
  await page.waitForTimeout(2000);
  
  // Take a screenshot of the Products dropdown
  await page.screenshot({ path: 'hivebrite-enhanced-products-menu.png' });
  
  // Using context-aware semantic key for Analytics link
  const analyticsLinkSelector = await getSemanticSelector('ui_link_analytics_track_your');
  await page.locator(analyticsLinkSelector).waitFor({ state: 'visible', timeout: 5000 });
  
  // Navigate to Analytics page
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.locator(analyticsLinkSelector).click()
  ]);
  
  // Verify we're on the Analytics page
  const url = page.url();
  expect(url).toContain('/analytics');
  console.log('Successfully navigated to Analytics page');
  
  // Take a screenshot of the Analytics page
  await page.screenshot({ path: 'hivebrite-enhanced-analytics-page.png' });
}); 