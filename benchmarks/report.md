# Went To Event load benchmark

- Run date: Wed, 14 Oct 2026 09:37:56 GMT
- Target: https://wenttoevent.com
- API: https://api-orcin-one-49.vercel.app/events
- Method: anonymous virtual users load each route separately; each route receives 100 or 1,000 concurrent read-only GETs. This avoids counting each user as three simultaneous page loads. The 100-user and 1,000-user rounds are separated by 75 seconds so the public events cache expires.
- Page scope: `/` is the Persian landing page and `/demo` is the React app shell. Explore, event detail, profile, bookings, and chat are client-rendered views inside `/demo`, so they have no separate document request. Authenticated actions and form submissions were not exercised.
- HTTP latency measures the complete response body time from this runner. It is not a browser paint metric (LCP/CLS/INP); see `browser-report.md` for browser navigation measurements.

## Results

| Simulated users | Page / endpoint | Requests | Errors | HTTP statuses | CDN cache | Avg ms | p50 ms | p95 ms | p99 ms | Max ms | Avg bytes / records |
|---:|---|---:|---:|---|---|---:|---:|---:|---:|---:|---:|
| 100 | Landing page | 100 | 0 | {"200":100} | {"HIT":100} | 421.12 | 423.41 | 438.49 | 496.61 | 504.06 | 11560 |
| 100 | Product app shell | 100 | 0 | {"200":100} | {"HIT":100} | 191.57 | 190.74 | 205.54 | 208.93 | 272.18 | 1600 |
| 100 | Events API | 100 | 0 | {"200":100} | {"MISS":100} | 1155.98 | 1196.64 | 1303.02 | 1327.6 | 1356.24 | 21; records: {"0":100} |

Round 100: 300 requests, 0 errors, 2204.05 ms elapsed.

| 1000 | Landing page | 1000 | 0 | {"200":1000} | {"HIT":1000} | 1562.76 | 1863.02 | 2054.25 | 2083.54 | 2261.82 | 11560 |
| 1000 | Product app shell | 1000 | 0 | {"200":1000} | {"HIT":1000} | 210.64 | 209.87 | 261.95 | 270.07 | 447.54 | 1600 |
| 1000 | Events API | 1000 | 0 | {"200":1000} | {"MISS":402,"HIT":598} | 1761.37 | 1783.78 | 2353.49 | 2416.01 | 2913.05 | 21; records: {"0":1000} |

Round 1000: 3000 requests, 0 errors, 6012.27 ms elapsed.

## Error details

- No HTTP or response-validation errors.

