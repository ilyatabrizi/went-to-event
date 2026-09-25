import { expect, test } from '@playwright/test'

test('browse events and open event detail', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'What’s happening?' })).toBeVisible()
  await expect(page.getByTestId('event-card')).toHaveCount(3)

  await page.getByRole('button', { name: /Warehouse Sessions Vol\. 9/ }).click()

  await expect(page.getByTestId('event-detail-title')).toHaveText('Warehouse Sessions Vol. 9')
  await expect(page.getByText('Pier 70')).toBeVisible()
  await expect(page.getByText('General Admission')).toBeVisible()

  await page.getByTestId('back-to-events').click()
  await expect(page.getByRole('heading', { name: 'What’s happening?' })).toBeVisible()
  await expect(page.getByTestId('event-card')).toHaveCount(3)
})

test('renders the event grid on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await expect(page.getByTestId('event-card')).toHaveCount(3)
  await expect(page.locator('.events')).toHaveCSS('grid-template-columns', /289\.5px 289\.5px 289\.5px 289\.5px/)
})
