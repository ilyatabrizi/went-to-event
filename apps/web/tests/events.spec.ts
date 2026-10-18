import { expect, test, type Page } from '@playwright/test'
import type { Event } from '../src/contracts/events'

const testEvents: Event[] = [
  {
    id: 'test-warehouse', category: 'Nightlife', title: 'Warehouse Sessions Vol. 9',
    description: 'House and techno in a waterfront warehouse.', startsAt: '2099-10-03T20:30:00Z', endsAt: '2099-10-04T01:30:00Z',
    venue: { name: 'Pier 70', address: 'San Francisco, CA' }, host: { name: 'Substrata Collective' }, goingCount: 86,
    ticketTiers: [{ id: 'test-tier-1', name: 'General Admission', description: 'Entry after 8:30 PM', priceCents: 2500 }],
  },
  {
    id: 'test-yoga', category: 'Wellness', title: 'Sunrise Rooftop Yoga',
    description: 'A slow vinyasa flow above the city.', startsAt: '2099-10-07T07:30:00Z', endsAt: '2099-10-07T08:45:00Z',
    venue: { name: 'The Assembly Rooftop', address: 'San Francisco, CA' }, host: { name: 'The Assembly' }, goingCount: 31,
    ticketTiers: [{ id: 'test-tier-2', name: 'RSVP', description: 'Free entry; mats provided', priceCents: 0 }],
  },
  {
    id: 'test-supper', category: 'Food', title: 'Third Culture Supper Club',
    description: 'A five-course communal dinner.', startsAt: '2099-10-12T19:30:00Z', endsAt: '2099-10-12T22:30:00Z',
    venue: { name: 'Meydan Kitchen', address: 'San Francisco, CA' }, host: { name: 'Mira Okafor' }, goingCount: 24,
    ticketTiers: [{ id: 'test-tier-3', name: 'Communal Seat', description: 'Five courses', priceCents: 6500 }],
  },
]

async function mockEvents(page: Page) {
  await page.route('**/api/events**', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1)
    const event = testEvents.find((item) => item.id === id)
    if (event) return route.fulfill({ json: { data: event } })
    return route.fulfill({ json: { data: testEvents, total: testEvents.length } })
  })
}

async function useEnglish(page: Page) {
  await mockEvents(page)
  await page.addInitScript(() => {
    localStorage.setItem('wte.language.v2', 'en')
    localStorage.setItem('wte.install-guide-dismissed.v1', '1')
  })
}

async function waitForAuthForm(page: Page) {
  await expect(page.locator('.auth-shell')).toBeVisible()
}

test('main site explains home-screen install and opens the app', async ({ page }) => {
  await mockEvents(page)
  await page.addInitScript(() => localStorage.setItem('wte.language.v2', 'en'))
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Keep the app one tap away.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Add it to your home screen' })).toBeVisible()
  const manifestResponse = await page.request.get('/manifest.webmanifest')
  expect((await manifestResponse.json()).start_url).toBe('/demo')
  await page.getByRole('button', { name: 'Open the app' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByRole('heading', { name: 'What’s happening?' })).toBeVisible()
})

test('an installed launch opens the app directly instead of the install guide', async ({ page }) => {
  await mockEvents(page)
  await page.addInitScript(() => {
    localStorage.setItem('wte.language.v2', 'en')
    localStorage.removeItem('wte.install-guide-dismissed.v1')
    const nativeMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = ((query: string) => query === '(display-mode: standalone)'
      ? ({ matches: true } as MediaQueryList)
      : nativeMatchMedia(query)) as typeof window.matchMedia
  })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'What’s happening?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Keep the app one tap away.' })).toHaveCount(0)
})

test('demo page shows Farsi install guidance once, then opens the app', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('test.install-guide-initialized')) {
      localStorage.removeItem('wte.language.v2')
      localStorage.removeItem('wte.install-guide-dismissed.v1')
      sessionStorage.setItem('test.install-guide-initialized', '1')
    }
  })
  await page.goto('/demo')

  await expect(page.getByRole('heading', { name: 'برنامه را همیشه در دسترس داشته باشید.' })).toBeVisible()
  await page.getByRole('button', { name: 'باز کردن برنامه' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'چه خبره؟' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'چه خبره؟' })).toBeVisible()
})

test('defaults to Farsi and right-to-left layout', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('wte.language.v2')
    localStorage.setItem('wte.language', 'en')
    localStorage.setItem('wte.install-guide-dismissed.v1', '1')
  })
  await page.goto('/demo')

  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('navigation', { name: 'پیمایش اصلی' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'چه خبره؟' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'چه خبره؟' })).toBeVisible()
})

test('browse events and open event detail', async ({ page }) => {
  await useEnglish(page)
  await page.goto('/demo')

  await expect(page.getByRole('heading', { name: 'What’s happening?' })).toBeVisible()
  await expect(page.getByTestId('event-card')).toHaveCount(3)

  await page.getByRole('button', { name: /Warehouse Sessions Vol\. 9/ }).click()

  await expect(page.getByTestId('event-detail-title')).toHaveText('Warehouse Sessions Vol. 9')
  await expect(page.getByText('Pier 70')).toBeVisible()
  await expect(page.getByText('General Admission')).toBeVisible()

  await page.getByRole('button', { name: 'Home' }).click()
  await expect(page.getByRole('heading', { name: 'What’s happening?' })).toBeVisible()
  await expect(page.getByTestId('event-card')).toHaveCount(3)
})

test('renders the event grid on desktop', async ({ page }) => {
  await useEnglish(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/demo')

  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await expect(page.getByTestId('event-card')).toHaveCount(3)
  await expect(page.locator('.events')).toHaveCSS('grid-template-columns', /289\.5px 289\.5px 289\.5px 289\.5px/)
})

test('keeps auth inputs at a mobile-safe font size', async ({ page }) => {
  await useEnglish(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo')

  await page.getByRole('button', { name: /Warehouse Sessions Vol\. 9/ }).click()
  await page.getByTestId('sign-in-to-book').click()
  await waitForAuthForm(page)
  await expect(page.getByLabel(/Email address/i)).toHaveCSS('font-size', '16px')
  await expect(page.getByLabel('Password')).toHaveCSS('font-size', '16px')
})

test('asks signed-out visitors to sign in when booking', async ({ page }) => {
  await useEnglish(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo')
  await page.getByRole('button', { name: /Warehouse Sessions Vol\. 9/ }).click()

  await page.getByTestId('sign-in-to-book').click()
  await waitForAuthForm(page)
  await expect(page.getByRole('heading', { name: 'Sign in to book.' })).toBeVisible()
  await expect(page.getByLabel(/Email address/i)).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})

test('shows a signed-out profile entry point', async ({ page }) => {
  await useEnglish(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo')

  await page.getByRole('button', { name: 'Profile' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to see your profile.' })).toBeVisible()
  await expect(page.getByTestId('profile-sign-in')).toBeVisible()
})

test('signs in a simulated account and keeps auth, username, avatar, bookings, and chat working across pages', async ({ page }) => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const accessToken = 'simulated-access-token'
  const avatarUrl = 'https://legyknewpiwcxwdccbjd.supabase.co/storage/v1/object/public/profile-pictures/simulated/avatar.png'
  const unauthenticatedApiRequests: string[] = []
  const protectedApiRequests: string[] = []
  let deleteBookingContentType: string | undefined

  await page.addInitScript(() => {
    localStorage.setItem('wte.language.v2', 'en')
    localStorage.setItem('wte.install-guide-dismissed.v1', '1')
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => {
        localStorage.setItem('test.camera-requested', 'yes')
        throw new DOMException('Camera permission denied for test', 'NotAllowedError')
      } },
    })
  })
  await page.route('**/auth/v1/token?grant_type=password', async (route) => route.fulfill({ json: {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'simulated-refresh-token',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'simulated@example.test',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { username: 'simulated_member', full_name: 'Simulated Member' },
      created_at: new Date().toISOString(),
    },
  } }))
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const path = requestUrl.pathname
    if (path === '/api/events' || path.startsWith('/api/events/')) {
      const eventId = path.split('/').at(-1)
      const event = testEvents.find((item) => item.id === eventId)
      return route.fulfill({ json: event ? { data: event } : { data: testEvents, total: testEvents.length } })
    }

    protectedApiRequests.push(path)
    if (route.request().headers().authorization !== `Bearer ${accessToken}`) {
      unauthenticatedApiRequests.push(path)
      return route.fulfill({ status: 401, json: { error: 'Authentication required' } })
    }
    if (path === '/api/me/profile') return route.fulfill({ json: { profile: { id: userId, username: 'simulated_member', displayName: 'Simulated Member', avatarUrl } } })
    if (path === '/api/bookings' && route.request().method() === 'GET') return route.fulfill({ json: { data: [{ id: 'simulated-booking-1', eventId: 'test-warehouse', ticketTierId: 'test-tier-1', quantity: 1, status: 'confirmed', totalCents: 2500, createdAt: new Date().toISOString(), tickets: [] }] } })
    if (path === '/api/bookings/simulated-booking-1' && route.request().method() === 'DELETE') {
      deleteBookingContentType = route.request().headers()['content-type']
      return route.fulfill({ json: { removed: true } })
    }
    if (path === '/api/social/conversations') return route.fulfill({ json: { conversations: [] } })
    if (path === '/api/social') return route.fulfill({ json: { friends: [], incomingRequests: [], outgoingRequests: [], conversations: [] } })
    if (path === '/api/verification') return route.fulfill({ json: { status: 'verified', request: null } })
    if (path === '/api/admin-verification') return route.fulfill({ status: 403, json: { error: 'Admin access required' } })
    return route.fulfill({ json: {} })
  })
  await page.route('**/storage/v1/object/public/profile-pictures/**', async (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGucAAAAASUVORK5CYII=', 'base64'),
  }))

  await page.goto('/demo')
  await page.getByRole('button', { name: 'Profile' }).click()
  await page.getByTestId('profile-sign-in').click()
  await page.getByLabel('Email address').fill('simulated@example.test')
  await page.getByLabel('Password').fill('simulated-password')
  await page.locator('.profile-form button.primary-button').click()

  await expect(page.getByTestId('profile-card')).toContainText('@simulated_member')
  await expect(page.getByTestId('profile-card').locator('img')).toHaveAttribute('src', avatarUrl)
  await expect.poll(() => page.getByTestId('profile-card').locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Publish an event' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get verified to host' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Host with Went To Event' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Publish an event' }).click()
  await expect(page.getByRole('heading', { name: 'Create an event' })).toBeVisible()
  await expect(page.getByLabel('What is it called?')).toBeVisible()
  await page.getByRole('button', { name: 'Back to profile' }).click()

  await page.getByRole('button', { name: 'Check in guests' }).click()
  await expect(page.getByRole('button', { name: 'Open camera' })).toBeEnabled()
  await page.getByRole('button', { name: 'Open camera' }).click()
  await expect(page.getByRole('alert')).toContainText('Camera access was denied or unavailable.')
  expect(await page.evaluate(() => localStorage.getItem('test.camera-requested'))).toBe('yes')
  await page.getByRole('button', { name: 'Back to profile' }).click()

  await page.getByRole('button', { name: 'Went', exact: true }).click()
  await expect(page.getByText('Warehouse Sessions Vol. 9')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No bookings yet.' })).toBeVisible()
  expect(deleteBookingContentType).toBeUndefined()
  await page.getByRole('button', { name: 'Chat', exact: true }).click()
  await expect(page.getByText('Your chats with friends will show up here.')).toBeVisible()
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await page.getByRole('tab', { name: 'Account' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Account settings' })).toBeVisible()
  await expect(page.getByText('Authentication required')).toHaveCount(0)
  expect(protectedApiRequests).toContain('/api/me/profile')
  expect(protectedApiRequests).toContain('/api/bookings')
  expect(protectedApiRequests).toContain('/api/bookings/simulated-booking-1')
  expect(protectedApiRequests).toContain('/api/social/conversations')
  expect(protectedApiRequests).toContain('/api/verification')
  expect(unauthenticatedApiRequests).toEqual([])
})

test('searches and filters events from the explore screen', async ({ page }) => {
  await useEnglish(page)
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Explore' }).click()

  await expect(page.getByRole('heading', { name: 'Explore events.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '3 events' })).toBeVisible()

  await page.getByLabel('Search events, venues, or hosts').fill('yoga')
  await expect(page.getByRole('heading', { name: '1 event' })).toBeVisible()
  await expect(page.getByText('Sunrise Rooftop Yoga')).toBeVisible()
  await expect(page.getByText('Warehouse Sessions Vol. 9')).not.toBeVisible()

  await page.getByLabel('Search events, venues, or hosts').fill('')
  await page.getByLabel('Price').selectOption({ label: 'Free' })
  await expect(page.getByRole('heading', { name: '1 event' })).toBeVisible()
  await expect(page.getByText('Sunrise Rooftop Yoga')).toBeVisible()
})

test('saves an event and restores the saved state after reload', async ({ page }) => {
  await useEnglish(page)
  await page.goto('/demo')
  await page.getByRole('button', { name: /Warehouse Sessions Vol\. 9/ }).click()

  const saveButton = page.getByRole('button', { name: /Save event/ })
  await expect(saveButton).toHaveAttribute('aria-pressed', 'false')
  await saveButton.click()
  await expect(page.getByRole('button', { name: /Saved event/ })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await page.getByRole('button', { name: /Warehouse Sessions Vol\. 9/ }).click()
  await expect(page.getByRole('button', { name: /Saved event/ })).toHaveAttribute('aria-pressed', 'true')
})
