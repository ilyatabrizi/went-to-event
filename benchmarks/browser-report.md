# Went To Event browser benchmark

- Run date: Wed, 14 Oct 2026 09:41:04 GMT
- Target: https://wenttoevent.com
- Method: Headless Chromium desktop navigation; 5 fresh-context samples per page. Waits for load, fonts, and one second for paint metrics to settle. This is a single-user browser check, not concurrent browser load.
- These are browser navigation metrics from one headless Chromium instance. They capture document resources and paint timing, not 100 or 1,000 concurrent browser sessions.

| Page | Samples | Statuses | p50 FCP ms | p95 FCP ms | p50 LCP ms | p95 LCP ms | p50 font-ready ms | p50 CLS | Resources | Transferred bytes | Errors |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Landing page | 5 | {"200":5} | 644 | 688 | 708 | 1456 | 789 | 0 | 6 | 156213 | 0 |
| Product app shell | 5 | {"200":5} | 668 | 824 | 668 | 824 | 663 | 0 | 4 | 264190 | 0 |

Per-navigation resource counts, transferred bytes, cache headers, and request errors are in `browser-results.json`.

