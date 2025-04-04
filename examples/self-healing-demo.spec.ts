import { test, expect } from '@playwright/test';
import { getByDescription, clearMappingCache, updateSelectorIndex } from '../utils/semantic-helper';

/**
 * This test demonstrates the self-healing capabilities of the semantic selector system.
 * It shows how tests can continue to work even when selectors change.
 */
test('Self-healing selector demo', async ({ page }) => {
  // Clear cache to ensure we're starting fresh
  clearMappingCache();
  
  // Navigate to the demo page
  await page.goto('https://demo.playwright.dev/todomvc/');
  
  // Use the self-healing locator to find elements
  // Even if these selectors don't initially exist in mappings, they'll be created
  const newTodoInput = await getByDescription(page, 'todo_text_input_new');
  const todoList = await getByDescription(page, 'todo_list');
  
  // Interact with the page using the self-healing locators
  await newTodoInput.fill('Buy groceries');
  await page.keyboard.press('Enter');
  
  await newTodoInput.fill('Clean house');
  await page.keyboard.press('Enter');
  
  // Verify the todos were added
  const todoItems = await getByDescription(page, 'todo_list_items');
  expect(await todoItems.count()).toBe(2);
  
  // Demonstrate healing - simulate a selector change by forcing an update with a bad selector
  console.log('Simulating a broken selector by updating it to an invalid one');
  await updateSelectorIndex('https://demo.playwright.dev/todomvc/');
  
  // Clear cache to force reload from the updated mapping file
  clearMappingCache();
  
  // Try to use the now-broken selector - it should heal automatically
  console.log('Attempting to use the broken selector (should trigger healing)');
  const healedInput = await getByDescription(page, 'todo_text_input_new');
  
  // Verify the healed selector works by using it
  await healedInput.fill('Walk the dog');
  await page.keyboard.press('Enter');
  
  // Check that our interaction with the healed selector worked
  expect(await todoItems.count()).toBe(3);
  
  console.log('Self-healing successful! The test continued to work despite the broken selector.');
});

/**
 * This test shows how natural language and alternative names work with self-healing
 */
test('Natural language selector demo', async ({ page }) => {
  // Navigate to the demo page
  await page.goto('https://demo.playwright.dev/todomvc/');
  
  // Use natural language descriptions instead of semantic keys
  const newTodoInput = await getByDescription(page, 'new todo input');
  const completeButton = await getByDescription(page, 'complete todo');
  
  // Add a new todo
  await newTodoInput.fill('Test natural language selectors');
  await page.keyboard.press('Enter');
  
  // Complete the todo using the natural language selector
  await completeButton.first().click();
  
  // Verify the todo was marked as completed
  const completedTodos = await page.locator('.completed');
  expect(await completedTodos.count()).toBe(1);
  
  console.log('Natural language selectors working with self-healing capabilities!');
});

test.describe('Natural Language Todo App Demo', () => {
  test.beforeEach(async ({ page }) => {
    // Clear the cache before each test to ensure a fresh start
    clearMappingCache();
    // Navigate to the todo app
    await page.goto('file://' + __dirname + '/test-html/todo-app.html');
  });

  test('Create and complete todo items using natural language', async ({ page }) => {
    test.info().annotations.push({
      type: 'description',
      description: 'Demonstrates using natural language descriptions for locators'
    });

    // Get locators using natural language
    const newTodoInput = await getByDescription(page, 'new todo input');
    const todoList = await getByDescription(page, 'todo list');

    // Add todos
    await newTodoInput.fill('Buy groceries');
    await page.keyboard.press('Enter');
    
    await newTodoInput.fill('Walk the dog');
    await page.keyboard.press('Enter');
    
    // Verify todos were added
    const todoItems = await getByDescription(page, 'todo items');
    await expect(todoItems).toHaveCount(2);
    
    // Complete a todo
    const firstTodoCheckbox = page.locator('[data-testid="todo-checkbox"]').first();
    await firstTodoCheckbox.check();
    
    // Verify one todo is completed
    await expect(page.locator('.completed')).toHaveCount(1);
    
    // Still works even if the app changes selectors
    await page.evaluate(() => {
      // Simulate changing data-testid to data-qa
      const elements = document.querySelectorAll('[data-testid="new-todo"]');
      elements.forEach(el => {
        el.removeAttribute('data-testid');
        el.setAttribute('data-qa', 'new-todo-input');
      });
    });
    
    // Still able to interact with the element using natural language
    const updatedInput = await getByDescription(page, 'new todo input');
    await updatedInput.fill('Clean the house');
    await page.keyboard.press('Enter');
    
    // Verify we now have 3 todos
    await expect(todoItems).toHaveCount(3);
  });
  
  test('Shows flexibility of natural language matching', async ({ page }) => {
    // These different phrases all find the same element
    const input1 = await getByDescription(page, 'new todo input');
    const input2 = await getByDescription(page, 'todo text field');
    const input3 = await getByDescription(page, 'add task input');
    
    // They're all the same element
    await input1.fill('Task 1');
    await page.keyboard.press('Enter');
    
    await input2.fill('Task 2');
    await page.keyboard.press('Enter');
    
    await input3.fill('Task 3');
    await page.keyboard.press('Enter');
    
    // Verify all tasks were added
    const todoItems = await getByDescription(page, 'todo items');
    await expect(todoItems).toHaveCount(3);
  });
}); 