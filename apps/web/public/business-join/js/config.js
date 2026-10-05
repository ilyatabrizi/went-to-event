/* Where a finished form goes. The page reads nothing else from here.
 *
 *   mode: 'demo'         Nothing leaves the browser. The page says so beside the button and on
 *                        the confirmation, and index.html keeps <meta name="robots" noindex>.
 *   mode: 'endpoint'     POST JSON to `endpoint`. Expects JSON back: { ok: true, reference? }.
 *                        The receiver must allow this page's origin through CORS.
 *   mode: 'google-form'  POST to a Google Form's formResponse URL, mode no-cors. `fields` maps
 *                        each key below to that form's entry.NNNN id. Responses land in the form.
 *
 * Keys sent: first_name last_name business_name niche city phone email website elapsed_ms
 * (niche is free text, exactly as the person typed it, tidied).
 */
const liveSite = ['wenttoevent.com', 'www.wenttoevent.com'].includes(location.hostname);
window.WTE_CONFIG = {
  mode: liveSite ? 'endpoint' : 'demo',
  endpoint: liveSite ? 'https://api-orcin-one-49.vercel.app/business-leads' : '',
  googleForm: { action: '', fields: {} },
  timeoutMs: 15000,
};
