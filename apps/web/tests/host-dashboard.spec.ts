import { expect, test, type Page } from '@playwright/test'

const now = new Date().toISOString()
const events = [
  { id: 'e1', title: 'Warehouse Sessions', startsAt: now, endsAt: '2099-01-01T00:00:00Z' },
  { id: 'e2', title: 'Supper Club', startsAt: now, endsAt: '2099-01-01T00:00:00Z' },
]
const registrations = [
  { id: 'old', eventId: 'e2', attendeeId: 'a4', displayName: 'Earlier Guest', username: null, status: 'confirmed', totalCents: 7000, quantity: 4, createdAt: '2020-01-01T12:00:00Z', checkedIn: 0, ticketNames: ['Dinner'] },
  { id: 'b1', eventId: 'e1', attendeeId: 'a1', displayName: 'Alex Rivera', username: 'alex', status: 'confirmed', totalCents: 5000, quantity: 2, createdAt: now, checkedIn: 1, ticketNames: ['General'] },
  { id: 'b2', eventId: 'e2', attendeeId: 'a1', displayName: 'Alex Rivera', username: 'alex', status: 'confirmed', totalCents: 3000, quantity: 1, createdAt: now, checkedIn: 0, ticketNames: ['Dinner'] },
  { id: 'b3', eventId: 'e1', attendeeId: 'a2', displayName: 'Cancelled Guest', username: null, status: 'cancelled', totalCents: 9000, quantity: 3, createdAt: now, checkedIn: 0, ticketNames: ['General'] },
  { id: 'b4', eventId: 'e1', attendeeId: 'a3', displayName: 'Pending Guest', username: null, status: 'pending', totalCents: 4000, quantity: 1, createdAt: now, checkedIn: 0, ticketNames: ['General'] },
]
async function signIn(page: Page, options: { verified?: boolean; empty?: boolean; fail?: boolean; language?: string } = {}) {
  await page.addInitScript((language) => {
    localStorage.setItem('wte.language.v2', language)
    localStorage.setItem('wte.install-guide-dismissed.v1', '1')
    localStorage.setItem('wte.cookie-consent.v1', 'essential')
  }, options.language ?? 'en')
  await page.route('**/auth/v1/token?grant_type=password', (route) => route.fulfill({ json: {
    access_token: 'simulated-access-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh',
    user: { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'host@example.test', app_metadata: {}, user_metadata: { username: 'host_one' }, created_at: now },
  } }))
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/events') return route.fulfill({ json: { data: [], total: 0 } })
    if (path === '/api/me/profile') return route.fulfill({ json: { profile: { id: '11111111-1111-4111-8111-111111111111', username: 'host_one', displayName: 'Host One', avatarUrl: null } } })
    if (path === '/api/verification') return route.fulfill({ json: { status: options.verified === false ? 'pending' : 'verified', request: null } })
    if (path === '/api/bookings') return route.fulfill({ json: { data: [] } })
    if (path === '/api/host-dashboard') {
      expect(route.request().headers().authorization).toBe('Bearer simulated-access-token')
      return options.fail ? route.fulfill({ status: 500, json: { error: 'Analytics unavailable' } })
        : route.fulfill({ json: { data: options.empty ? { events: [], registrations: [] } : { events, registrations } } })
    }
    if (path === '/api/admin-verification') return route.fulfill({ status: 403, json: { error: 'Admin access required' } })
    return route.fulfill({ json: { conversations: [] } })
  })
  await page.goto('/demo')
  const isFa = options.language === 'fa'
  await page.getByRole('button', { name: isFa ? 'پروفایل' : 'Profile', exact: true }).click()
  await page.getByTestId('profile-sign-in').click()
  await page.locator('input[type="email"]').fill('host@example.test')
  await page.locator('input[type="password"]').fill('password-test')
  await page.locator('.profile-form button.primary-button').click()
  await expect(page.getByTestId('profile-card')).toContainText('@host_one')
}

test('verified hosts see correct totals and can filter registrations', async ({ page }) => {
  await signIn(page)
  await page.getByTestId('host-dashboard-entry').click()
  await expect(page.getByRole('heading', { name: 'Hosting dashboard' })).toBeVisible()
  const metrics = page.locator('.host-metric')
  await expect(metrics.nth(0)).toContainText('$80.00')
  await expect(metrics.nth(1).locator('strong')).toHaveText('3')
  await expect(metrics.nth(2).locator('strong')).toHaveText('1')
  await expect(metrics.nth(3).locator('strong')).toHaveText('1')
  await page.getByLabel('Booking period').selectOption('all')
  await expect(metrics.nth(0)).toContainText('$150.00')
  await page.getByLabel('Booking period').selectOption('30')
  await page.screenshot({ path: '/tmp/wte-host-desktop.png', fullPage: true })
  await page.getByLabel('Event', { exact: true }).selectOption('e1')
  await expect(metrics.nth(0)).toContainText('$50.00')
  await page.getByLabel('Search guests', { exact: true }).fill('pending')
  await expect(page.locator('.host-table').last().locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('.host-table').last()).toContainText('Pending Guest')
  await page.getByLabel('Booking status').selectOption('confirmed')
  await expect(page.getByText('No registrations match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Back to profile' }).click()
  await expect(page.getByTestId('profile-card')).toBeVisible()
})

test('unverified profiles do not show the dashboard entry', async ({ page }) => {
  await signIn(page, { verified: false })
  await expect(page.locator('.verification-badge')).toContainText('Verification pending')
  await expect(page.getByTestId('host-dashboard-entry')).toHaveCount(0)
})

test('new hosts get a create-event empty state', async ({ page }) => {
  await signIn(page, { empty: true })
  await page.getByTestId('host-dashboard-entry').click()
  await expect(page.getByRole('heading', { name: 'Your hosting story starts here.' })).toBeVisible()
  await page.locator('.host-empty').getByRole('button', { name: 'Create an event' }).click()
  await expect(page.getByRole('heading', { name: 'Create an event' })).toBeVisible()
})

test('failed analytics can be retried', async ({ page }) => {
  await signIn(page, { fail: true })
  await page.getByTestId('host-dashboard-entry').click()
  await expect(page.getByRole('alert')).toContainText('Analytics unavailable')
  await page.route('**/api/host-dashboard', (route) => route.fulfill({ json: { data: { events, registrations } } }))
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.host-metric').first()).toContainText('$80.00')
})

test('Persian mobile dashboard fits the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, { language: 'fa' })
  await page.getByTestId('host-dashboard-entry').click()
  await expect(page.getByRole('heading', { name: 'داشبورد میزبانی' })).toBeVisible()
  await expect(page.locator('.host-metric').first()).toContainText('ارزش رزروها')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/wte-host-mobile.png', fullPage: true })
})
