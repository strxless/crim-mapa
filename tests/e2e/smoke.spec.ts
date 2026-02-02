import { test, expect } from '@playwright/test';

test('login -> stats page -> logout', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Wymagane uwierzytelnienie' })).toBeVisible();

  await page.getByLabel('Email').fill('e2e@example.com');
  await page.getByLabel('Hasło').fill('e2e-password');
  await page.getByRole('button', { name: 'Przejdź do mapy' }).click();

  // Authenticated view: map container + logout button
  await expect(page.getByRole('button', { name: 'Wyloguj' })).toBeVisible();

  // Navigate to Stats
  await page.getByRole('link', { name: /Statystyki|Stats/ }).click();
  await expect(page).toHaveURL(/\/stats/);

  // StatsClient has an "Excel" export button; use that as a stable, visible anchor.
  await expect(page.getByRole('button', { name: 'Excel' })).toBeVisible();

  // Back home and logout
  await page.getByRole('link', { name: 'CRiIM Mapa' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: 'Wyloguj' }).click();

  await expect(page.getByRole('heading', { name: 'Wymagane uwierzytelnienie' })).toBeVisible();
});
