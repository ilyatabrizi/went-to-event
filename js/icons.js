/* One stroke weight, one join style, one 24-grid. Icons that disagree with
   each other read as carelessness. */
const P = {
  home:'<path d="M3.6 10.4 12 3.8l8.4 6.6V20a1 1 0 0 1-1 1h-4.6v-6h-5.6v6H4.6a1 1 0 0 1-1-1z"/>',
  compass:'<circle cx="12" cy="12" r="8.6"/><path d="M15.4 8.6 13.7 13.7 8.6 15.4l1.7-5.1z"/>',
  chat:'<path d="M20.5 11.6c0 4-3.8 7.2-8.5 7.2a10 10 0 0 1-2.6-.34L4.2 20.2l1.5-3.7A6.9 6.9 0 0 1 3.5 11.6c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2z"/>',
  ticket:'<path d="M4 8.2a1.6 1.6 0 0 1 1.6-1.6h12.8A1.6 1.6 0 0 1 20 8.2v2a2 2 0 0 0 0 3.6v2a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 15.8v-2a2 2 0 0 0 0-3.6z"/><path d="M14 7v1.6M14 11.2v1.6M14 15.4V17"/>',
  user:'<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>',
  search:'<circle cx="11" cy="11" r="6.6"/><path d="m16 16 4 4"/>',
  bell:'<path d="M18 15.4V11a6 6 0 1 0-12 0v4.4L4.4 17.6h15.2z"/><path d="M10 20.4a2.2 2.2 0 0 0 4 0"/>',
  heart:'<path d="M12 20s-7.4-4.4-7.4-9.3A4.2 4.2 0 0 1 12 8.1a4.2 4.2 0 0 1 7.4 2.6C19.4 15.6 12 20 12 20z"/>',
  bookmark:'<path d="M6.4 4.8h11.2v15.4L12 16.4l-5.6 3.8z"/>',
  plus:'<path d="M12 5.2v13.6M5.2 12h13.6"/>',
  close:'<path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/>',
  back:'<path d="M14.6 5.4 8 12l6.6 6.6"/>',
  fwd:'<path d="m9.4 5.4 6.6 6.6-6.6 6.6"/>',
  up:'<path d="m5.4 14.6 6.6-6.6 6.6 6.6"/>',
  down:'<path d="m5.4 9.4 6.6 6.6 6.6-6.6"/>',
  pin:'<path d="M12 21s6.4-6 6.4-10.4a6.4 6.4 0 1 0-12.8 0C5.6 15 12 21 12 21z"/><circle cx="12" cy="10.6" r="2.4"/>',
  cal:'<rect x="3.8" y="5.4" width="16.4" height="14.8" rx="2.4"/><path d="M3.8 10h16.4M8.4 3.6v3.4M15.6 3.6v3.4"/>',
  clock:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.8"/>',
  users:'<circle cx="9.4" cy="8.6" r="3.3"/><path d="M3.6 19.4a5.8 5.8 0 0 1 11.6 0"/><path d="M16.2 6a3.3 3.3 0 0 1 0 6.4M17.6 14.6a5.4 5.4 0 0 1 3 4.8"/>',
  userplus:'<circle cx="10" cy="8.4" r="3.5"/><path d="M3.8 19.6a6.2 6.2 0 0 1 12.4 0"/><path d="M18.4 8.4v5M15.9 10.9h5"/>',
  send:'<path d="M20.2 3.8 3.8 10.4l6.5 2.9 2.9 6.5z"/><path d="M20.2 3.8 10.3 13.3"/>',
  check:'<path d="m5.2 12.6 4.5 4.5 9.1-9.7"/>',
  checkcirc:'<circle cx="12" cy="12" r="8.6"/><path d="m8.4 12.2 2.6 2.6 4.8-5.2"/>',
  slider:'<path d="M4 7.4h9M17.4 7.4H20M4 16.6h3.2M11.6 16.6H20"/><circle cx="15" cy="7.4" r="2.3"/><circle cx="9.4" cy="16.6" r="2.3"/>',
  sort:'<path d="M6.6 4.8v14.4M3.4 16l3.2 3.2L9.8 16"/><path d="M17.4 19.2V4.8M14.2 8 17.4 4.8 20.6 8"/>',
  share:'<circle cx="17.6" cy="6" r="2.6"/><circle cx="6.4" cy="12" r="2.6"/><circle cx="17.6" cy="18" r="2.6"/><path d="m8.7 10.8 6.6-3.6M8.7 13.2l6.6 3.6"/>',
  more:'<circle cx="5.4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.6" cy="12" r="1.5"/>',
  gear:'<circle cx="12" cy="12" r="3.1"/><path d="M19.6 14.2a1.6 1.6 0 0 0 .32 1.76l.06.06a1.94 1.94 0 1 1-2.74 2.74l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.94 1.94 0 1 1-3.88 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.94 1.94 0 1 1-2.74-2.74l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.47-.97H3.7a1.94 1.94 0 1 1 0-3.88h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.94 1.94 0 1 1 2.74-2.74l.06.06a1.6 1.6 0 0 0 1.76.32h.08a1.6 1.6 0 0 0 .97-1.47V3.7a1.94 1.94 0 1 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.94 1.94 0 1 1 2.74 2.74l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.47.97h.17a1.94 1.94 0 1 1 0 3.88h-.09a1.6 1.6 0 0 0-1.47.97z"/>',
  diamond:'<path d="M12 3.6 21 9.4 12 20.4 3 9.4z"/><path d="M3 9.4h18M8.4 9.4 12 3.6l3.6 5.8M8.4 9.4 12 20.4l3.6-11"/>',
  sparkle:'<path d="M12 3.4 13.9 9 19.6 11l-5.7 2-1.9 5.6-1.9-5.6L4.4 11 10.1 9z"/>',
  bolt:'<path d="M13.4 3 5.6 13.4h5.4L10.6 21l7.8-10.4H13z"/>',
  note:'<path d="M9.4 17.6V6.2l9-1.8v11.4"/><circle cx="7" cy="17.9" r="2.5"/><circle cx="16" cy="15.9" r="2.5"/>',
  leaf:'<path d="M20 4.6C10.4 4.6 5 8.6 5 15a5 5 0 0 0 5 5c6.4 0 10-5.4 10-15.4z"/><path d="M5.6 20.4C7.6 14.4 11.6 10.6 17 8.8"/>',
  wine:'<path d="M7.6 4h8.8l-.7 5.2a4.1 4.1 0 0 1-8.14-.14z"/><path d="M12 13.4V20M8.4 20h7.2"/>',
  palette:'<path d="M12 20.4a8.4 8.4 0 1 1 8.4-8.4c0 2-1.7 2.7-3.4 2.7h-1.4a2 2 0 0 0-1.5 3.4 1.8 1.8 0 0 1-2.1 2.3z"/><circle cx="8.2" cy="10.4" r="1.1"/><circle cx="12" cy="7.8" r="1.1"/><circle cx="15.8" cy="10.2" r="1.1"/>',
  ball:'<circle cx="12" cy="12" r="8.6"/><path d="m12 7.2 3.9 2.8-1.5 4.6H9.6L8.1 10z"/><path d="M12 3.4v3.8M4.2 9.6 8.1 10M6.9 19l2.7-4.4M17.1 19l-2.7-4.4M19.8 9.6 15.9 10"/>',
  mic:'<rect x="9.2" y="3.4" width="5.6" height="11" rx="2.8"/><path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8v2.8"/>',
  mask:'<path d="M4.4 7.4c5-1.4 10.2-1.4 15.2 0-.3 6.6-3 12.4-7.6 12.4S4.7 14 4.4 7.4z"/><path d="M8.6 11.4a1.7 1.7 0 0 0 2.6 0M12.8 11.4a1.7 1.7 0 0 0 2.6 0"/>',
  bag:'<path d="M6 8h12l-1 11.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9z"/><path d="M9.4 8V6.4a2.6 2.6 0 0 1 5.2 0V8"/>',
  clapper:'<rect x="3.4" y="9" width="17.2" height="11.4" rx="2.2"/><path d="m3.8 9 1.7-3.7 4 1 1.4-3 4 1 1.4-3 4 1L19.4 9"/>',
  star:'<path d="m12 3.6 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 10l6-.8z"/>',
  tools:'<path d="M14.7 5.6a3.4 3.4 0 0 1 3.9 3.9L9.5 18.6l-4 1 1-4z"/><path d="m4.5 19.5 3-3"/>',
  mountain:'<path d="m3 19 6-9 4 6 2.5-3.5L21 19z"/><circle cx="17" cy="6.6" r="2"/>',
  shield:'<path d="M12 3.4 19.2 6v5.6c0 4.4-3 7.6-7.2 9-4.2-1.4-7.2-4.6-7.2-9V6z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
  card:'<rect x="3.2" y="6" width="17.6" height="12" rx="2.4"/><path d="M3.2 10.4h17.6"/>',
  apple:'<path d="M16.3 12.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.15-2.8.85-3.5.85s-1.8-.83-3-.8c-1.5.02-2.9.9-3.7 2.25-1.6 2.75-.4 6.8 1.1 9 .75 1.1 1.6 2.3 2.8 2.25 1.1-.05 1.5-.72 2.9-.72s1.7.72 2.9.7c1.2-.02 2-1.1 2.7-2.2.85-1.25 1.2-2.5 1.2-2.55-.03-.02-2.3-.9-2.3-3.5z"/><path d="M14.1 5.6c.6-.75 1-1.8.9-2.85-.87.04-1.93.58-2.56 1.32-.56.65-1.05 1.7-.92 2.7.97.08 1.96-.5 2.58-1.17"/>',
  lock:'<rect x="4.8" y="10.4" width="14.4" height="9.6" rx="2.4"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  globe:'<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2z"/>',
  eye:'<path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/>',
  camera:'<path d="M3.4 8.6h3.4l1.6-2.4h7.2l1.6 2.4h3.4a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.4" r="3.4"/>',
  image:'<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4"/><circle cx="8.6" cy="9.6" r="1.7"/><path d="m4 17 4.6-4.6 3.6 3.6 3-2.8L20 18"/>',
  trash:'<path d="M4.6 6.6h14.8M9 6.6V4.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.8"/><path d="M6.4 6.6 7.3 20a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.9-13.4"/>',
  flag:'<path d="M5.4 21V3.8M5.4 4.6h11.4l-2 3.6 2 3.6H5.4"/>',
  mute:'<path d="M11 5.4 6.6 9H3.4v6h3.2L11 18.6z"/><path d="m16 9.6 4.6 4.8M20.6 9.6 16 14.4"/>',
  info:'<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.9v.1"/>',
  qr:'<rect x="3.6" y="3.6" width="6.4" height="6.4" rx="1.4"/><rect x="14" y="3.6" width="6.4" height="6.4" rx="1.4"/><rect x="3.6" y="14" width="6.4" height="6.4" rx="1.4"/><path d="M14 14h2.8v2.8H14zM17.6 17.6h2.8v2.8h-2.8zM14 20.4h.1M20.4 14h.1"/>',
  wallet:'<path d="M3.4 7.4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1.2"/><rect x="3.4" y="7.4" width="17.2" height="11.6" rx="2.4"/><circle cx="16.4" cy="13.2" r="1.3"/>',
  logout:'<path d="M14.6 7.4V5.6a1.6 1.6 0 0 0-1.6-1.6H5.6A1.6 1.6 0 0 0 4 5.6v12.8A1.6 1.6 0 0 0 5.6 20H13a1.6 1.6 0 0 0 1.6-1.6v-1.8"/><path d="M9.4 12h11M17.4 8.6l3.4 3.4-3.4 3.4"/>',
  refresh:'<path d="M20.2 11.4A8.2 8.2 0 0 0 6.3 6.7L3.8 9.2"/><path d="M3.8 4.6v4.6h4.6"/><path d="M3.8 12.6a8.2 8.2 0 0 0 13.9 4.7l2.5-2.5"/><path d="M20.2 19.4v-4.6h-4.6"/>',
  route:'<circle cx="6" cy="18.4" r="2.6"/><circle cx="18" cy="5.6" r="2.6"/><path d="M15.4 5.6H10a3.4 3.4 0 0 0 0 6.8h4a3.4 3.4 0 0 1 0 6.8H8.6"/>',
  wave:'<path d="M3.4 12c1.5-2.6 3-2.6 4.5 0s3 2.6 4.5 0 3-2.6 4.5 0 2.2 1.9 3.7.5"/><path d="M3.4 17c1.5-2.6 3-2.6 4.5 0s3 2.6 4.5 0 3-2.6 4.5 0 2.2 1.9 3.7.5"/>',
};

/* filled variants where a filled shape reads better than a stroke */
const FILL = { heart: 1, bookmark: 1, star: 1, sparkle: 1, diamond: 0 };

export function ico(name, size = 22, cls = '') {
  const d = P[name] || P.sparkle;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${d}</svg>`;
}
export function icoFill(name, size = 22, cls = '') {
  const d = P[name] || P.sparkle;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"
    aria-hidden="true">${d}</svg>`;
}
export const hasIcon = n => !!P[n];
export { FILL };

/* A verification badge needs two colours: a filled disc and a check knocked out
   of it. Running the stroke icon through icoFill floods the disc and swallows
   the check, which is why this is its own shape. */
export const badge = (size = 14, fill = 'var(--gold)', tick = '#0B0A0C') => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="flex:none">
  <circle cx="12" cy="12" r="9.4" fill="${fill}"/>
  <path d="m8.1 12.3 2.6 2.6 5.2-5.6" fill="none" stroke="${tick}"
        stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* The brand mark, inline, so it never waits on a network round trip. */
export const markSVG = (size = 34, colour = 'var(--bone)') => `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" aria-hidden="true">
  <g transform="matrix(0.79929,0,0,-0.79929,188.694,733.403)">
    <path fill="${colour}" d="M580 235H175Q180 175 217.0 141.0Q254 107 308 107Q386 107 419 174H570Q546 94 478.0 42.5Q410 -9 311 -9Q231 -9 167.5 26.5Q104 62 68.5 127.0Q33 192 33 277Q33 363 68.0 428.0Q103 493 166.0 528.0Q229 563 311 563Q390 563 452.5 529.0Q515 495 549.5 432.5Q584 370 584 289Q584 259 580 235ZM439 329Q438 383 400.0 415.5Q362 448 307 448Q255 448 219.5 416.5Q184 385 176 329Z"/>
  </g>
  <circle cx="759.43" cy="683.90" r="49.5" fill="var(--ember)"/>
</svg>`;
