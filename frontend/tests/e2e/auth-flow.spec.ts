import { test, expect } from '@playwright/test';

test.describe('TaskSphere E2E Critical Path Flows', () => {
  test('should log in, select workspace, create a task, and log out', async ({ page }) => {
    page.on('console', msg => {
      console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
    });
    page.on('pageerror', err => {
      console.error('PAGE ERROR:', err.message);
    });
    page.on('requestfailed', request => {
      console.error(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.error(`API ERROR: ${response.url()} status ${response.status()}`);
      }
    });

    // 1. Visit Login page
    await page.goto('/auth/login');
    await page.waitForSelector('input[type="email"]');
    
    // Assert login headers (TaskSphere h2 and Sign in p)
    await expect(page.locator('h2')).toContainText('TaskSphere');
    await expect(page.getByText('Sign in to your account')).toBeVisible();

    // 2. Fill login details (using Super Admin for full permissions)
    await page.fill('#login-email', 'superadmin@tasksphere.local');
    await page.fill('#login-password', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load after login to ensure auth session is established
    await page.waitForURL('http://localhost:3000/');
    await page.waitForSelector('text=Dashboard');

    // 3. Select Workspace (navigate to workspace selection page)
    await page.goto('/workspace-select');
    await page.waitForURL('**/workspace-select');
    await page.waitForSelector('text=Select Workspace');
    await expect(page.locator('h1')).toContainText('Select Workspace');
    await page.locator('.max-w-4xl button:has-text("Demo Workspace")').first().click();

    // 4. Redirect to Dashboard & verify
    await page.waitForURL('http://localhost:3000/');
    await page.waitForSelector('text=Dashboard');

    // 5. Navigate to Tasks page
    await page.goto('/tasks');
    await page.waitForURL('**/tasks');
    await page.waitForSelector('text=+ Add Task');
    await expect(page.locator('h1')).toContainText('Tasks Workspace');

    // 6. Create a Task
    // Click the "+ Add Task" button
    await page.click('text=+ Add Task');
    
    // Fill task title and description
    await page.fill('#newTitle', 'Automated E2E QA Task');
    await page.fill('#newDescription', 'This is a tasksphere auto-generated E2E test task.');

    // Submit the form
    await page.click('button[type="submit"]:has-text("Save Task")');

    // Verify task is created and shown on the detail screen
    await page.waitForSelector('h2:has-text("Automated E2E QA Task")');
    await expect(page.getByRole('heading', { name: 'Automated E2E QA Task' })).toBeVisible();

    // 7. Log out
    // Click user profile dropdown trigger (the button containing the round initials avatar)
    await page.locator('button').filter({ has: page.locator('span.rounded-full') }).first().click();
    
    // Click the logout button
    await page.waitForSelector('text=Sign Out');
    await page.click('button:has-text("Sign Out")');

    // Assert redirect back to login
    await page.waitForURL('**/auth/login');
    await expect(page.locator('h2')).toContainText('TaskSphere');
  });
});
