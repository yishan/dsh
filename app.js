const isZh = document.documentElement.lang.toLowerCase().startsWith('zh');
const langSwitch = document.querySelector('.lang-switch');
if (langSwitch) {
  langSwitch.addEventListener('click', () => {
    try { localStorage.setItem('dsh-lang', isZh ? 'en' : 'zh'); } catch {}
  });
}
const i18n = isZh
  ? { toLight: '切换至浅色模式', toDark: '切换至深色模式', copied: '已复制', failed: '复制失败' }
  : { toLight: 'Switch to light color scheme', toDark: 'Switch to dark color scheme', copied: 'Copied', failed: 'Copy failed' };

// Theme toggle: two-state (system default vs opposite override) synced with <meta name="color-scheme">.
const meta = document.querySelector('meta[name="color-scheme"]');
const toggle = document.getElementById('theme-toggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function currentRenderedDark() {
  if (meta.content === 'dark') return true;
  if (meta.content === 'light') return false;
  return systemDark.matches;
}

function updateToggleLabel() {
  if (!toggle) return;
  toggle.setAttribute(
    'aria-label',
    currentRenderedDark() ? i18n.toLight : i18n.toDark
  );
}

if (toggle && meta) {
  toggle.hidden = false;
  updateToggleLabel();

  toggle.addEventListener('click', () => {
    const target = currentRenderedDark() ? 'light' : 'dark';
    const systemPref = systemDark.matches ? 'dark' : 'light';

    if (target === systemPref) {
      try { localStorage.removeItem('dsh-color-scheme'); } catch {}
      meta.content = 'light dark';
    } else {
      try { localStorage.setItem('dsh-color-scheme', target); } catch {}
      meta.content = target;
    }
    updateToggleLabel();
  });

  systemDark.addEventListener('change', updateToggleLabel);

  window.addEventListener('storage', (event) => {
    if (event.key !== 'dsh-color-scheme') return;
    meta.content = (event.newValue === 'light' || event.newValue === 'dark')
      ? event.newValue
      : 'light dark';
    updateToggleLabel();
  });
}

// Copy buttons: Invoker Commands with click fallback + VoiceOver dedup live region.
const timers = new WeakMap();
let lastMessage = '';

function report(button, ok) {
  const tip = button.nextElementSibling;
  if (!tip) return;
  clearTimeout(timers.get(button));
  button.removeAttribute('data-copied');
  button.removeAttribute('data-failed');

  let message = ok ? i18n.copied : i18n.failed;
  if (message === lastMessage) message += '\u00A0';
  lastMessage = message;

  tip.textContent = '';
  void button.offsetWidth;
  button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
  requestAnimationFrame(() => {
    tip.textContent = message;
  });

  timers.set(button, setTimeout(() => {
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');
    tip.textContent = '';
  }, 1800));
}

async function copyTarget(button, target) {
  const text = target.innerText.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    report(button, true);
  } catch {
    report(button, false);
  }
}

document.addEventListener('command', (event) => {
  if (event.command === '--copy' && event.source && event.target) {
    copyTarget(event.source, event.target);
  }
}, true);

if (!('CommandEvent' in window)) {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[command="--copy"]');
    if (!button) return;
    const target = document.getElementById(button.getAttribute('commandfor'));
    if (target) copyTarget(button, target);
  });
}
