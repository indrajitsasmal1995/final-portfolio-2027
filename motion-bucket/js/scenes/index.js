import A from './components.js';
import B from './gestures.js';
import C from './feedback.js';
import D from './depth.js';
import E from './confetti.js';

export default {
  ...A, ...B, ...C, ...D, ...E,
  _missing: {
    build(c) {
      c.html('<div class="k-page" style="display:grid;place-items:center;color:var(--s-ink-2)">Preview missing</div>');
      return {};
    },
  },
};
