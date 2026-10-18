import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { performance } from 'node:perf_hooks'

const baseUrl = (process.env.BENCHMARK_BASE_URL ?? 'https://wenttoevent.com').replace(/\/$/, '')
const apiUrl = (process.env.BENCHMARK_API_URL ?? 'https://api-orcin-one-49.vercel.app').replace(/\/$/, '')
const timeoutMs = Number(process.env.BENCHMARK_TIMEOUT_MS ?? 20_000)
const userCounts = [100, 1000]
const targets = [
  { key: 'Landing page', url: `${baseUrl}/`, kind: 'html' },
  { key: 'Product app shell', url: `${baseUrl}/demo`, kind: 'app' },
  { key: 'Events API', url: `${apiUrl}/events`, kind: 'events' },
]

function quantile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)] ?? 0
}

function summarize(samples) {
  const latencies = samples.filter((sample) => sample.latencyMs !== null).map((sample) => sample.latencyMs)
  const statusCounts = {}
  let errors = 0
  let bytes = 0
  const cacheControlCounts = {}
  const cacheStatusCounts = {}
  for (const sample of samples) {
    if (sample.status !== null) statusCounts[sample.status] = (statusCounts[sample.status] ?? 0) + 1
    if (sample.error) errors += 1
    bytes += sample.bytes ?? 0
    if (sample.cacheControl) cacheControlCounts[sample.cacheControl] = (cacheControlCounts[sample.cacheControl] ?? 0) + 1
    if (sample.cacheStatus) cacheStatusCounts[sample.cacheStatus] = (cacheStatusCounts[sample.cacheStatus] ?? 0) + 1
  }
  return {
    requests: samples.length,
    errors,
    statusCounts,
    cacheControlCounts,
    cacheStatusCounts,
    averageMs: latencies.length ? Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2)) : null,
    p50Ms: latencies.length ? Number(quantile(latencies, 0.5).toFixed(2)) : null,
    p95Ms: latencies.length ? Number(quantile(latencies, 0.95).toFixed(2)) : null,
    p99Ms: latencies.length ? Number(quantile(latencies, 0.99).toFixed(2)) : null,
    maxMs: latencies.length ? Number(Math.max(...latencies).toFixed(2)) : null,
    averageBytes: samples.length ? Math.round(bytes / samples.length) : 0,
    eventRecordCounts: Object.fromEntries([...new Set(samples.filter((sample) => Number.isInteger(sample.eventRecordCount)).map((sample) => sample.eventRecordCount))].map((count) => [count, samples.filter((sample) => sample.eventRecordCount === count).length])),
  }
}

async function get(target, round, user) {
  const started = performance.now()
  const sample = { round, user, target: target.key, status: null, latencyMs: null, bytes: 0, cacheControl: null, cacheStatus: null, error: null }
  try {
    const response = await fetch(target.url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'WentToEvent-read-only-benchmark/1.0' },
    })
    const body = await response.arrayBuffer()
    sample.status = response.status
    sample.cacheControl = response.headers.get('cache-control')
    sample.cacheStatus = response.headers.get('x-vercel-cache') ?? response.headers.get('cf-cache-status')
    sample.bytes = body.byteLength
    sample.latencyMs = performance.now() - started
    if (!response.ok) sample.error = `HTTP ${response.status}`

    if (target.kind === 'html') {
      const html = new TextDecoder().decode(body)
      if (!html.includes('<html lang="fa"') || !html.includes('canonical')) {
        sample.error = 'Landing HTML missing expected Persian language/canonical metadata'
      }
    } else if (target.kind === 'app') {
      const html = new TextDecoder().decode(body)
      if (!html.includes('<html lang="fa" dir="rtl">')) {
        sample.error = 'App HTML missing expected Persian language/direction'
      }
    } else if (target.kind === 'events') {
      const json = JSON.parse(new TextDecoder().decode(body))
      if (!Array.isArray(json.data)) sample.error = 'Events response did not contain a data array'
      else sample.eventRecordCount = json.data.length
    }
  } catch (error) {
    sample.latencyMs = performance.now() - started
    sample.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  }
  return sample
}

async function runRound(users) {
  const roundName = `${users} concurrent users`
  const startedAt = new Date().toISOString()
  const started = performance.now()
  const samples = []
  // Load one route with the requested user count at a time. This avoids
  // multiplying each simulated user's page load into three simultaneous
  // document/API requests, which isn't how real visitors use the site.
  for (const target of targets) {
    const targetSamples = await Promise.all(Array.from({ length: users }, (_, index) => get(target, roundName, index + 1)))
    samples.push(...targetSamples)
  }
  const durationMs = performance.now() - started
  const results = Object.fromEntries(targets.map((target) => [target.key, summarize(samples.filter((sample) => sample.target === target.key))]))
  return {
    users,
    startedAt,
    durationMs: Number(durationMs.toFixed(2)),
    totalRequests: samples.length,
    totalErrors: samples.filter((sample) => sample.error).length,
    results,
    samples,
  }
}

const startedAt = new Date().toISOString()
const rounds = []
for (const count of userCounts) {
  rounds.push(await runRound(count))
  // Wait longer than the old and new events cache TTLs before the next round.
  if (count !== userCounts.at(-1)) await delay(75_000)
}

const report = {
  generatedAt: new Date().toISOString(),
  startedAt,
  baseUrl,
  apiUrl,
  method: 'Anonymous read-only GETs; each route is tested separately with 100 or 1,000 concurrent requests. Response times include the complete body download.',
  timeoutMs,
  rounds,
}

const markdown = [
  '# Went To Event load benchmark',
  '',
  `- Run date: ${new Date(startedAt).toUTCString()}`,
  `- Target: ${baseUrl}`,
  `- API: ${apiUrl}/events`,
  '- Method: anonymous virtual users load each route separately; each route receives 100 or 1,000 concurrent read-only GETs. This avoids counting each user as three simultaneous page loads. The 100-user and 1,000-user rounds are separated by 75 seconds so the public events cache expires.',
  '- Page scope: `/` is the Persian landing page and `/demo` is the React app shell. Explore, event detail, profile, bookings, and chat are client-rendered views inside `/demo`, so they have no separate document request. Authenticated actions and form submissions were not exercised.',
  '- HTTP latency measures the complete response body time from this runner. It is not a browser paint metric (LCP/CLS/INP); see `browser-report.md` for browser navigation measurements.',
  '',
  '## Results',
  '',
  '| Simulated users | Page / endpoint | Requests | Errors | HTTP statuses | CDN cache | Avg ms | p50 ms | p95 ms | p99 ms | Max ms | Avg bytes / records |',
  '|---:|---|---:|---:|---|---|---:|---:|---:|---:|---:|---:|',
]
for (const round of rounds) {
  for (const target of targets) {
    const result = round.results[target.key]
    const bodyNote = target.kind === 'events' ? `; records: ${JSON.stringify(result.eventRecordCounts)}` : ''
    markdown.push(`| ${round.users} | ${target.key} | ${result.requests} | ${result.errors} | ${JSON.stringify(result.statusCounts)} | ${JSON.stringify(result.cacheStatusCounts)} | ${result.averageMs ?? 'n/a'} | ${result.p50Ms ?? 'n/a'} | ${result.p95Ms ?? 'n/a'} | ${result.p99Ms ?? 'n/a'} | ${result.maxMs ?? 'n/a'} | ${result.averageBytes}${bodyNote} |`)
  }
  markdown.push('')
  markdown.push(`Round ${round.users}: ${round.totalRequests} requests, ${round.totalErrors} errors, ${round.durationMs} ms elapsed.`)
  markdown.push('')
}
markdown.push('## Error details', '')
const failures = rounds.flatMap((round) => round.samples.filter((sample) => sample.error).map((sample) => ({ ...sample, users: round.users })))
if (failures.length) {
  for (const failure of failures.slice(0, 200)) markdown.push(`- ${failure.users} users, ${failure.target}, user ${failure.user}: ${failure.error}${failure.status ? ` (HTTP ${failure.status})` : ''}`)
  if (failures.length > 200) markdown.push(`- ${failures.length - 200} additional errors are listed in results.json.`)
} else {
  markdown.push('- No HTTP or response-validation errors.')
}
markdown.push('')

await mkdir(new URL('.', import.meta.url), { recursive: true })
await writeFile(new URL('./results.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
await writeFile(new URL('./report.md', import.meta.url), `${markdown.join('\n')}\n`)
console.log(JSON.stringify({
  generatedAt: report.generatedAt,
  rounds: rounds.map(({ users, totalRequests, totalErrors, durationMs, results }) => ({ users, totalRequests, totalErrors, durationMs, results })),
  report: 'benchmarks/report.md',
  rawResults: 'benchmarks/results.json',
}, null, 2))
