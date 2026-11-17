// "Where does your problem plug in?": a transparent keyword model over Elevate's five practices.
// The answer lights that practice's landing ring on the water and pre-fills an email with the visitor's words.
export const SERVICES = [
  { name: 'Consulting', why: 'This is a transformation question: tiers, routing, culture and the change that holds them together.', words: ['reorg', 'reorganization', 'restructure', 'transform', 'strategy', 'process', 'escalat', 'tier', 'routing', 'culture', 'satisfaction', 'csat', 'nps', 'churn', 'experience', 'slow', 'backlog', 'wait', 'complain', 'change', 'customer'] },
  { name: 'Training', why: 'The gap is in skills and leadership, and workshops close it fastest.', words: ['train', 'teach', 'coach', 'lead', 'manager', 'onboard', 'new hire', 'skill', 'struggl', 'workshop', 'learn', 'agents to', 'upskill', 'confidence'] },
  { name: 'Automation', why: 'Repetitive work is the first thing to take off your agents’ desks.', words: ['copy', 'paste', 'manual', 'repetit', 'tools', 'spreadsheet', 'data', 'accurate', 'accuracy', 'duplicate', 'tagging', 'tag ', 'all day', 'automat', 'workflow', 'integrat', 'time'] },
  { name: 'Advisory', why: 'This is a decision to get right once: strategic counsel before you commit budget.', words: ['which', 'trust', 'vendor', 'choose', 'decide', 'decision', 'invest', 'budget', 'board', 'roadmap', 'ai tool', 'risk', 'should we', 'evaluate', 'plan'] },
  { name: 'Courses', why: 'Self-paced learning reaches a whole team at once, at its own speed.', words: ['course', 'self-paced', 'e-book', 'ebook', 'content', 'module', 'scale', 'hundreds', '200', '100', 'everyone', 'whole team', 'remote', 'library', 'material'] },
];

export function classify(text) {
  const t = ` ${text.toLowerCase()} `;
  const scores = SERVICES.map((s) => s.words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0));
  const total = scores.reduce((a, b) => a + b, 0);
  const best = total === 0 ? 0 : scores.indexOf(Math.max(...scores));
  return { best, unsure: total === 0 };
}

export function initRoute({ onRoute, reduced }) {
  const input = document.querySelector('[data-route-input]');
  if (!input) return { current: () => 2 };
  const nameEl = document.querySelector('[data-route-name]');
  const whyEl = document.querySelector('[data-route-why]');
  const send = document.querySelector('[data-route-send]');
  const result = document.querySelector('[data-route-result]');
  const form = document.querySelector('[data-route-form]');
  const examples = [...document.querySelectorAll('[data-example]')];
  let current = 2;

  function route(text) {
    const { best, unsure } = classify(text);
    current = best;
    const s = SERVICES[best];
    nameEl.textContent = s.name;
    whyEl.textContent = unsure ? 'Not enough to go on yet. Consulting is where we start when a problem has many parts.' : s.why;
    const body = `Hi Elevate,\n\nOur support problem: ${text.trim() || '(not written yet)'}\n\nYour site pointed it to ${s.name}. Can we talk?\n`;
    send.href = `mailto:info@elevate-support.com?subject=${encodeURIComponent(`${s.name}: a support problem`)}&body=${encodeURIComponent(body)}`;
    onRoute(best);
  }

  let timer = 0;
  input.addEventListener('input', () => {
    examples.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    clearTimeout(timer);
    timer = setTimeout(() => route(input.value), 260);
  });
  examples.forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      examples.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      input.value = b.dataset.example;
      route(input.value);
    });
  });

  // an idle tour through the examples until the visitor touches the form
  let touring = !reduced, step = 0, tourTimer = 0;
  const stopTour = () => { touring = false; clearInterval(tourTimer); result.setAttribute('aria-live', 'polite'); };
  ['pointerdown', 'keydown', 'focusin', 'click'].forEach((t) => form.addEventListener(t, stopTour, true));
  new IntersectionObserver((entries) => {
    const on = entries[entries.length - 1].isIntersecting;
    clearInterval(tourTimer);
    if (on && touring) {
      tourTimer = setInterval(() => {
        if (!touring) return;
        const b = examples[step++ % examples.length];
        examples.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        route(b.dataset.example);
      }, 2800);
    }
  }, { threshold: 0.4 }).observe(form);

  route(examples[0].dataset.example);
  examples[0].setAttribute('aria-pressed', 'true');
  return { current: () => current };
}
