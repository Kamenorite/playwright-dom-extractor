import { test, expect } from '@playwright/test';
import { getSemanticSelector } from '../utils/semantic-helper';

/**
 * This test demonstrates navigation through the Products dropdown menu
 * to reach the Analytics page, using semantic keys for improved reliability.
 * 
 * Key improvements:
 * - Uses semantic keys for all selectors
 * - Implements proper waiting strategies
 * - Takes screenshots at crucial steps
 * - Includes detailed logging
 */
test('Navigate to Analytics page through Products menu', async ({ page }) => {
  // Go to the hivebrite.io website
  await page.goto('https://hivebrite.io');
  await page.waitForLoadState('networkidle');
  
  // Handle cookie consent using semantic key
  const cookieDeclineSelector = await getSemanticSelector('cookie_decline_button');
  const cookieDeclineButton = page.locator(cookieDeclineSelector);
  if (await cookieDeclineButton.isVisible()) {
    await cookieDeclineButton.click();
    console.log('Declined cookies using semantic key: cookie_decline_button');
  }
  
  // Take a screenshot of the homepage
  await page.screenshot({ path: 'hivebrite-home.png' });

  // Get the Products menu button selector
  const productsMenuSelector = await getSemanticSelector('primary_navigation_product_link');
  const productsButton = page.locator(productsMenuSelector);
  
  // Ensure the Products button is visible and clickable
  await productsButton.waitFor({ state: 'visible' });
  console.log('Products menu button is visible');
  
  // Click the Products button to show the dropdown
  await productsButton.click();
  console.log('Clicked Products menu button');
  
  // Small delay to allow dropdown animation
  await page.waitForTimeout(2000);
  
  // Diagnostic: Log the current state of the dropdown menu
  console.log('Analyzing dropdown menu elements...');
  
  // Get all links in the dropdown
  const dropdownLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(link => ({
      href: link.href,
      text: link.textContent?.trim(),
      isVisible: link.offsetParent !== null,
      rect: link.getBoundingClientRect(),
      xpath: getXPath(link)
    }));

    function getXPath(element: Element): string {
      if (element.id !== '') {
        return `//*[@id="${element.id}"]`;
      }
      if (element === document.body) {
        return '/html/body';
      }
      let ix = 1;
      const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
      for (const sibling of siblings) {
        if (sibling === element) {
          const path: string = getXPath(element.parentNode as Element);
          return path + '/' + element.tagName.toLowerCase() + '[' + ix + ']';
        }
        if (sibling.tagName === element.tagName) {
          ix++;
        }
      }
      return '';
    }
  });
  
  console.log('Found dropdown links:', JSON.stringify(dropdownLinks, null, 2));
  
  // Take a screenshot of the Products dropdown
  await page.screenshot({ path: 'hivebrite-products-menu.png' });
  
  // Get the Analytics link selector from the dropdown
  const analyticsLinkSelector = await getSemanticSelector('analytics_menu_item');
  console.log('Looking for analytics link with selector:', analyticsLinkSelector);
  
  // Try to find the Analytics link with a more flexible approach
  await page.waitForSelector(analyticsLinkSelector, { state: 'visible', timeout: 5000 })
    .catch(async (error) => {
      console.log('Failed to find analytics link with semantic selector. Error:', error.message);
      
      // Additional diagnostic: Check if we can find it with a different approach
      const analyticsLinks = await page.$$eval('a', links => 
        links.filter(link => 
          link.textContent?.toLowerCase().includes('analytics') || 
          link.href.toLowerCase().includes('analytics')
        ).map(link => ({
          href: link.href,
          text: link.textContent?.trim(),
          xpath: link.getAttribute('xpath')
        }))
      );
      
      console.log('Found potential analytics links:', JSON.stringify(analyticsLinks, null, 2));
      throw error; // Re-throw the error to fail the test
    });
  
  console.log('Analytics link is visible in dropdown');
  
  // Navigate to Analytics page
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(analyticsLinkSelector)
  ]);
  
  // Verify we're on the Analytics page
  const url = page.url();
  expect(url).toContain('/analytics');
  console.log('Successfully navigated to Analytics page, URL contains /analytics');
  
  // Take a screenshot of the Analytics page
  await page.screenshot({ path: 'hivebrite-analytics-page.png' });
}); 