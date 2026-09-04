import { ico } from '../icons.js';
import { esc } from '../util.js';
import { spring, SPRING } from './motion.js';

let dock;
const live = new Set();

export function initToast(node) { dock = node; }

export function toast(msg, icon = 'checkcirc') {
  if (!dock) return;
  if (live.size > 2) { const first = live.values().next().value; dismiss(first); }

  const n = document.createElement('div');
  n.className = 'toast';
  n.innerHTML = (icon ? ico(icon, 16) : '') + '<span>' + esc(msg) + '</span>';
  dock.appendChild(n);
  live.add(n);

  /* Materialize — blur + scale together, so it reads as a surface arriving,
     not a rectangle fading in. */
  n.style.opacity = '0';
  spring({
    from: 0, to: 1, ...SPRING.sheet,
    onUpdate: v => {
      n.style.opacity = String(Math.min(1, v * 1.6));
      n.style.transform = `translateY(${(1 - v) * 22}px) scale(${0.92 + v * 0.08})`;
    },
  });

  n._t = setTimeout(() => dismiss(n), 2400);
  return n;
}

function dismiss(n) {
  if (!n || !live.has(n)) return;
  live.delete(n);
  clearTimeout(n._t);
  spring({
    from: 1, to: 0, ...SPRING.ui,
    onUpdate: v => {
      n.style.opacity = String(Math.max(0, v));
      n.style.transform = `translateY(${(1 - v) * -10}px) scale(${0.94 + v * 0.06})`;
    },
    onComplete: () => n.remove(),
  });
}
