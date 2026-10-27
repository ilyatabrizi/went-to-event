import { expect, test, type Page } from '@playwright/test'

const future = '2099-01-01T18:00:00.000Z'
const sample = { id: 'pending-event', title: 'Concert under review', description: 'Live music at the community hall.', category: 'Music', startsAt: future, endsAt: '2099-01-01T20:00:00.000Z', hostName: 'Host One', hostUserId: 'host-id', publicationStatus: 'pending', reviewNote: null, reviewedAt: null, venue: { name: 'Community Hall', address: '12 Main Street' }, ticketTiers: [{ name: 'General', priceCents: 1000 }] }

async function setup(page: Page, admin = true, language = 'en') {
  await page.addInitScript((lang) => {
    localStorage.setItem('wte.language.v2', lang)
    localStorage.setItem('wte.install-guide-dismissed.v1', '1')
    localStorage.setItem('wte.cookie-consent.v1', 'essential')
  }, language)
  await page.route('**/auth/v1/token?grant_type=password', (route) => {
    expect(route.request().postDataJSON().email).toBe(admin ? 'admin@wenttoevent.com' : 'host@example.test')
    return route.fulfill({ json: { access_token: 'test-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'refresh', user: { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: admin ? 'admin@wenttoevent.com' : 'host@example.test', app_metadata: {}, user_metadata: { username: admin ? 'admin' : 'host' }, created_at: new Date().toISOString() } } })
  })
  let eventStatus = 'pending'
  let publicReads = 0
  let created = false
  let verified = false
  let promoted = false
  let failReview = false
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url()); const path = url.pathname; const method = route.request().method()
    if (path !== '/api/events') expect(route.request().headers().authorization).toBe('Bearer test-token')
    if (path === '/api/events' && method === 'POST') {
      const body = route.request().postDataJSON()
      expect(body).not.toHaveProperty('publicationStatus')
      created = true
      return route.fulfill({ json: { data: { ...sample, publicationStatus: 'pending', host: { name: 'Host One' }, goingCount: 0 } } })
    }
    if (path === '/api/events') { publicReads += 1; const data = eventStatus === 'approved' ? [{ ...sample, publicationStatus: 'approved', host: { name: 'Host One' }, goingCount: 0, ticketTiers: [{ id: 'tier', name: 'General', priceCents: 1000, description: 'Entry' }] }] : []; return route.fulfill({ json: { data, total: data.length } }) }
    if (path === '/api/me/profile') return route.fulfill({ json: { profile: { id: '11111111-1111-4111-8111-111111111111', username: admin ? 'admin' : 'host', displayName: 'Test User', avatarUrl: null } } })
    if (path === '/api/verification') return route.fulfill({ json: { status: 'verified', request: null } })
    if (path === '/api/bookings') return route.fulfill({ json: { data: [] } })
    if (path === '/api/admin-verification') return admin ? route.fulfill({ json: { requests: [], canManageAdmins: true } }) : route.fulfill({ status: 403, json: { error: 'Admin access required' } })
    if (path === '/api/admin-events') {
      if (method === 'PATCH') {
        if (failReview) return route.fulfill({ status: 500, json: { error: 'Review could not be saved' } })
        eventStatus = route.request().postDataJSON().decision === 'approve' ? 'approved' : 'rejected'
        return route.fulfill({ json: { reviewed: true } })
      }
      const include = url.searchParams.get('status') === 'all' || url.searchParams.get('status') === eventStatus
      return route.fulfill({ json: { events: include ? [{ ...sample, publicationStatus: eventStatus }] : [], total: include ? 1 : 0 } })
    }
    if (path === '/api/admin-members') {
      if (method === 'PATCH') { verified = true; return route.fulfill({ json: { verified: true } }) }
      return route.fulfill({ json: { users: [{ userId: 'member-id', username: 'alex', displayName: 'Alex Rivera', verificationStatus: verified ? 'verified' : 'unverified', isAdmin: promoted, isPrimaryAdmin: false }], total: 1 } })
    }
    if (path === '/api/admin-users' && method === 'POST') { promoted = true; return route.fulfill({ json: { added: true } }) }
    if (path === '/api/host-dashboard') return route.fulfill({ json: { data: { events: created ? [{ ...sample, publicationStatus: 'pending' }] : [], registrations: [] } } })
    return route.fulfill({ json: { conversations: [] } })
  })
  await page.goto('/demo')
  await page.getByRole('button', { name: language === 'fa' ? 'پروفایل' : 'Profile', exact: true }).click()
  await page.getByTestId('profile-sign-in').click()
  await page.locator('input[autocomplete="username"]').fill(admin ? 'admin' : 'host@example.test')
  await page.locator('input[type="password"]').fill('temporary-password')
  await page.locator('.profile-form button.primary-button').click()
  await expect(page.getByTestId('profile-card')).toContainText(admin ? '@admin' : '@host')
  return { failReview: () => { failReview = true }, approveElsewhere: () => { eventStatus = 'approved' }, publicReads: () => publicReads }
}

test('admin username signs in and admins approve events, verify users and delegate access', async ({ page }) => {
  await setup(page)
  await page.getByRole('tab', { name: 'Account', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Admin panel', exact: true })
  await expect(panel.getByText(sample.title)).toBeVisible()
  await panel.getByLabel('Review note (optional)').fill('Ready to publish')
  await panel.getByRole('button', { name: 'Approve and publish' }).click()
  await expect(panel.getByText('Event approved and published.')).toBeVisible()
  await expect(panel.getByText('No events in this queue.')).toBeVisible()
  await panel.getByLabel('Publication status').selectOption('approved')
  await expect(panel.getByText(sample.title)).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Approve and publish' })).toHaveCount(0)
  await panel.getByRole('tab', { name: 'Users', exact: true }).click()
  await panel.getByLabel('Search users').fill('alex')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await panel.getByRole('button', { name: 'Verify user' }).click()
  await expect(panel.getByText('User verified.')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Verify user' })).toHaveCount(0)
  page.once('dialog', (dialog) => dialog.accept())
  await panel.getByRole('button', { name: 'Make admin' }).click()
  await expect(panel.getByText('Admin access granted.')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Remove admin' })).toBeVisible()
  await page.screenshot({ path: '/tmp/wte-admin-users.png', fullPage: true })
})

test('admin can reject an event and review it in the rejected filter', async ({ page }) => {
  await setup(page)
  await page.getByRole('tab', { name: 'Account', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Admin panel', exact: true })
  await panel.getByRole('button', { name: 'Reject', exact: true }).click()
  await expect(panel.getByText('Event rejected.')).toBeVisible()
  await panel.getByLabel('Publication status').selectOption('rejected')
  await expect(panel.getByText(sample.title)).toBeVisible()
})

test('failed reviews remain visible and show an error', async ({ page }) => {
  const state = await setup(page); state.failReview()
  await page.getByRole('tab', { name: 'Account', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Admin panel', exact: true })
  await panel.getByRole('button', { name: 'Approve and publish' }).click()
  await expect(panel.getByRole('alert')).toContainText('Review could not be saved')
  await expect(panel.getByText(sample.title)).toBeVisible()
})

test('Persian mobile event review panel fits the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page, true, 'fa')
  await page.getByRole('tab', { name: 'حساب', exact: true }).click()
  await expect(page.getByRole('button', { name: 'تأیید و انتشار' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/wte-admin-events-fa.png', fullPage: true })
})

test('a host submission stays pending and never opens a public booking page', async ({ page }) => {
  await setup(page, false)
  await page.route('**/nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: { display_name: '12 Main Street' } }))
  await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort())
  await page.getByRole('button', { name: 'Publish an event', exact: true }).click()
  await page.getByLabel('What is it called?').fill('Concert under review')
  await page.getByLabel('Tell people what to expect').fill('Live music at the community hall.')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByLabel('Venue name').fill('Community Hall')
  await page.getByRole('application', { name: 'Choose event location' }).click({ position: { x: 150, y: 150 } })
  await expect(page.getByLabel('Address', { exact: true })).toHaveValue('12 Main Street')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Submit for approval' }).click()
  await expect(page.getByRole('heading', { name: 'Hosting dashboard' })).toBeVisible()
  await expect(page.getByText('Pending approval')).toBeVisible()
  await expect(page.getByRole('button', { name: /Confirm booking/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to profile' }).click()
  await page.getByRole('tab', { name: 'Account', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Admin panel', exact: true })).toHaveCount(0)
})


test('approval refreshes the already-open catalogue before returning to Home', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('tab', { name: 'Account', exact: true }).click()
  const before = state.publicReads()
  const panel = page.getByRole('region', { name: 'Admin panel', exact: true })
  await panel.getByRole('button', { name: 'Approve and publish' }).click()
  await expect.poll(state.publicReads).toBeGreaterThan(before)
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page.getByRole('button', { name: /Concert under review/ }).first()).toBeVisible()
})

test('returning to Explore picks up events approved in another session', async ({ page }) => {
  const state = await setup(page, false)
  await page.getByRole('button', { name: 'Explore', exact: true }).click()
  await expect(page.getByText(sample.title)).toHaveCount(0)
  state.approveElsewhere()
  await page.getByRole('button', { name: 'Explore', exact: true }).click()
  await expect(page.getByText(sample.title).first()).toBeVisible()
})

test('refocusing an open app refreshes newly approved events', async ({ page }) => {
  const state = await setup(page, false)
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page.getByText(sample.title)).toHaveCount(0)
  state.approveElsewhere()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText(sample.title).first()).toBeVisible()
})
