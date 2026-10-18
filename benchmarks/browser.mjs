import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = require('@playwright/test')

const baseUrl = (process.env.BENCHMARK_BASE_URL ?? 'https://wenttoevent.com').replace(/\/$/, '')
const repeats = Number(process.env.BROWSER_BENCHMARK_REPEATS ?? 5)
const pages = [
  { name: 'Landing page', path: '/' },
  { name: 'Product app shell', path: '/demo' },
]

const browser = await chromium.launch({ headless: true })
const runs = []

try {
  for (const pageTarget of pages) {
    for (let iteration = 1; iteration <= repeats; iteration += 1) {
      const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
      const page = await context.newPage()
      const failures = []
      const httpErrors = []
      await page.addInitScript(() => {
        window.__browserVitals = { lcp: null, cls: 0 }
        new PerformanceObserver((entries) => {
          const last = entries.getEntries().at(-1)
          if (last) window.__browserVitals.lcp = last.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            if (!entry.hadRecentInput) window.__browserVitals.cls += entry.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      page.on('requestfailed', (request) => failures.push({ url: request.url(), reason: request.failure()?.errorText ?? 'request failed' }))
      page.on('response', (response) => {
        if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() })
      })

      const startedAt = Date.now()
      const response = await page.goto(`${baseUrl}${pageTarget.path}`, { waitUntil: 'load', timeout: 60_000 })
      await page.evaluate(() => document.fonts.ready)
      const fontsReadyMs = Date.now() - startedAt
      await page.waitForTimeout(1_000)
      const measurements = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0]
        const paints = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]))
        const resources = performance.getEntriesByType('resource')
        return {
          domContentLoadedMs: nav?.domContentLoadedEventEnd ?? null,
          loadEventMs: nav?.loadEventEnd ?? null,
          fcpMs: paints['first-contentful-paint'] ?? null,
          lcpMs: window.__browserVitals.lcp,
          cls: window.__browserVitals.cls,
          resourceCount: resources.length,
          resourceBytes: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
          fontResourceCount: resources.filter((item) => /font|woff/i.test(item.name)).length,
        }
      })
      runs.push({
        page: pageTarget.name,
        path: pageTarget.path,
        iteration,
        status: response?.status() ?? null,
        fontsReadyMs,
        cacheControl: response?.headers()['cache-control'] ?? null,
        cacheStatus: response?.headers()['x-vercel-cache'] ?? response?.headers()['cf-cache-status'] ?? null,
        ...measurements,
        httpErrors,
        requestFailures: failures,
      })
      await context.close()
    }
  }
} finally {
  await browser.close()
}

function percentile(values, fraction) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? null
}

const summaries = pages.map(({ name }) => {
  const samples = runs.filter((run) => run.page === name)
  return {
    page: name,
    samples: samples.length,
    statuses: Object.fromEntries([...new Set(samples.map((item) => item.status))].map((status) => [status, samples.filter((item) => item.status === status).length])),
    p50FcpMs: percentile(samples.map((item) => item.fcpMs), 0.5),
    p95FcpMs: percentile(samples.map((item) => item.fcpMs), 0.95),
    p50LcpMs: percentile(samples.map((item) => item.lcpMs), 0.5),
    p95LcpMs: percentile(samples.map((item) => item.lcpMs), 0.95),
    p50FontsReadyMs: percentile(samples.map((item) => item.fontsReadyMs), 0.5),
    p50Cls: percentile(samples.map((item) => item.cls), 0.5),
    p50Resources: percentile(samples.map((item) => item.resourceCount), 0.5),
    p50TransferredBytes: percentile(samples.map((item) => item.resourceBytes), 0.5),
    errors: samples.reduce((sum, item) => sum + item.httpErrors.length + item.requestFailures.length, 0),
  }
})

const result = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  method: `Headless Chromium desktop navigation; ${repeats} fresh-context samples per page. Waits for load, fonts, and one second for paint metrics to settle. This is a single-user browser check, not concurrent browser load.`,
  summaries,
  runs,
}
const markdown = [
  '# Went To Event browser benchmark',
  '',
  `- Run date: ${new Date(result.generatedAt).toUTCString()}`,
  `- Target: ${baseUrl}`,
  `- Method: ${result.method}`,
  '- These are browser navigation metrics from one headless Chromium instance. They capture document resources and paint timing, not 100 or 1,000 concurrent browser sessions.',
  '',
  '| Page | Samples | Statuses | p50 FCP ms | p95 FCP ms | p50 LCP ms | p95 LCP ms | p50 font-ready ms | p50 CLS | Resources | Transferred bytes | Errors |',
  '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
]
for (const item of summaries) markdown.push(`| ${item.page} | ${item.samples} | ${JSON.stringify(item.statuses)} | ${item.p50FcpMs ?? 'n/a'} | ${item.p95FcpMs ?? 'n/a'} | ${item.p50LcpMs ?? 'n/a'} | ${item.p95LcpMs ?? 'n/a'} | ${item.p50FontsReadyMs ?? 'n/a'} | ${item.p50Cls ?? 'n/a'} | ${item.p50Resources ?? 'n/a'} | ${item.p50TransferredBytes ?? 'n/a'} | ${item.errors} |`)
markdown.push('', 'Per-navigation resource counts, transferred bytes, cache headers, and request errors are in `browser-results.json`.', '')

await mkdir(new URL('.', import.meta.url), { recursive: true })
await writeFile(new URL('./browser-results.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`)
await writeFile(new URL('./browser-report.md', import.meta.url), `${markdown.join('\n')}\n`)
console.log(JSON.stringify({ summaries, report: 'benchmarks/browser-report.md', rawResults: 'benchmarks/browser-results.json' }, null, 2))
