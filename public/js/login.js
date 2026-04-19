const $ = (s) => document.querySelector(s);
const toastWrap = $('#toasts');

let csrfToken = null;

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-bar"></div><span></span>`;
  el.querySelector('span').textContent = message;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

async function fetchCsrf() {
  try {
    const r = await fetch('/api/auth/csrf', { credentials: 'include' });
    const d = await r.json();
    if (d && d.csrfToken) csrfToken = d.csrfToken;
  } catch (_) {}
}

(async () => {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (r.ok) {
      location.href = '/dashboard';
      return;
    }
  } catch (_) {}
  fetchCsrf();
})();

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#username').value.trim();
  const password = $('#password').value;
  const btn = $('#submitBtn');
  const label = $('#btnLabel');
  const sp = $('#btnSpinner');

  btn.disabled = true;
  label.textContent = 'Verifying';
  sp.classList.remove('hidden');

  try {
    if (!csrfToken) await fetchCsrf();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      toast(data.message || 'Login failed', 'error');
      return;
    }

    toast('Welcome back · Redirecting…', 'success');
    setTimeout(() => (location.href = '/dashboard'), 600);
  } catch (err) {
    toast('Network error', 'error');
  } finally {
    btn.disabled = false;
    label.textContent = 'Sign in';
    sp.classList.add('hidden');
  }
});
