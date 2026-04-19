const $ = (s) => document.querySelector(s);
const toastWrap = $('#toasts');

let hosts = [];
let editingId = null;
let pendingDeleteId = null;
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

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.method && opts.method !== 'GET') headers['X-CSRF-Token'] = csrfToken || '';
  const res = await fetch(path, { credentials: 'include', ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    location.href = '/';
    throw new Error('unauth');
  }
  if (!res.ok || !data.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function renderHosts() {
  const q = $('#search').value.trim().toLowerCase();
  const filtered = hosts.filter(
    (h) =>
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.url.toLowerCase().includes(q) ||
      (h.notes || '').toLowerCase().includes(q)
  );

  $('#statTotal').textContent = hosts.length;
  $('#statActive').textContent = hosts.filter((h) => h.enabled).length;
  $('#statDisabled').textContent = hosts.filter((h) => !h.enabled).length;

  const list = $('#hostList');
  const empty = $('#emptyState');
  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = filtered
    .map(
      (h, i) => `
      <div class="host-card" style="animation-delay:${i * 40}ms">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <div class="status-dot ${h.enabled ? '' : 'off'} mt-2"></div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-white truncate">${escapeHtml(h.name)}</h3>
                <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Priority ${h.priority}
                </span>
              </div>
              <div class="text-sm text-cyan-200/80 font-mono truncate mt-1">${escapeHtml(h.url)}</div>
              ${h.notes ? `<div class="text-xs text-purple-200/50 mt-2">${escapeHtml(h.notes)}</div>` : ''}
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button data-id="${h._id}" class="btn-ghost edit-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Edit
            </button>
            <button data-id="${h._id}" data-name="${escapeHtml(h.name)}" class="btn-ghost btn-danger del-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              Delete
            </button>
          </div>
        </div>
      </div>`
    )
    .join('');

  list.querySelectorAll('.edit-btn').forEach((b) =>
    b.addEventListener('click', () => openModal(b.dataset.id))
  );
  list.querySelectorAll('.del-btn').forEach((b) =>
    b.addEventListener('click', () => confirmDelete(b.dataset.id, b.dataset.name))
  );
}

function openModal(id = null) {
  editingId = id;
  $('#hostId').value = id || '';
  if (id) {
    const h = hosts.find((x) => x._id === id);
    $('#modalTitle').textContent = 'Edit host';
    $('#hostName').value = h.name;
    $('#hostUrl').value = h.url;
    $('#hostNotes').value = h.notes || '';
    $('#hostEnabled').checked = h.enabled;
    $('#hostPriority').value = h.priority;
  } else {
    $('#modalTitle').textContent = 'Add new host';
    $('#hostForm').reset();
    $('#hostEnabled').checked = true;
    $('#hostPriority').value = 100;
  }
  $('#modal').classList.remove('hidden');
  setTimeout(() => $('#hostName').focus(), 50);
}

function closeModal() {
  $('#modal').classList.add('hidden');
  editingId = null;
}

function confirmDelete(id, name) {
  pendingDeleteId = id;
  $('#confirmText').textContent = `"${name}" will be removed permanently. This cannot be undone.`;
  $('#confirmModal').classList.remove('hidden');
}

async function loadHosts() {
  try {
    const data = await api('/api/hosts');
    hosts = data.hosts;
    renderHosts();
  } catch (err) {
    if (err.message !== 'unauth') toast(err.message, 'error');
  }
}

async function loadMe() {
  try {
    const data = await api('/api/auth/me');
    if (data.csrfToken) csrfToken = data.csrfToken;
    $('#userTag').textContent = data.user.username + ' · ' + data.user.role;
  } catch (_) {}
}

$('#newHostBtn').addEventListener('click', () => openModal());
$('#cancelBtn').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

$('#confirmCancel').addEventListener('click', () => $('#confirmModal').classList.add('hidden'));
$('#confirmModal').addEventListener('click', (e) => {
  if (e.target.id === 'confirmModal') $('#confirmModal').classList.add('hidden');
});
$('#confirmOk').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    await api('/api/hosts/' + pendingDeleteId, { method: 'DELETE' });
    toast('Host deleted', 'success');
    pendingDeleteId = null;
    $('#confirmModal').classList.add('hidden');
    loadHosts();
  } catch (err) {
    toast(err.message, 'error');
  }
});

$('#hostForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: $('#hostName').value.trim(),
    url: $('#hostUrl').value.trim(),
    notes: $('#hostNotes').value.trim(),
    enabled: $('#hostEnabled').checked,
    priority: Number($('#hostPriority').value) || 100,
  };
  const btn = $('#saveBtn');
  btn.disabled = true;
  $('#saveLabel').textContent = 'Saving';
  $('#saveSpinner').classList.remove('hidden');

  try {
    if (editingId) {
      await api('/api/hosts/' + editingId, { method: 'PUT', body: JSON.stringify(body) });
      toast('Host updated', 'success');
    } else {
      await api('/api/hosts', { method: 'POST', body: JSON.stringify(body) });
      toast('Host added', 'success');
    }
    closeModal();
    loadHosts();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    $('#saveLabel').textContent = 'Save';
    $('#saveSpinner').classList.add('hidden');
  }
});

$('#search').addEventListener('input', renderHosts);

$('#logoutBtn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {}
  location.href = '/';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#modal').classList.contains('hidden')) closeModal();
    if (!$('#confirmModal').classList.contains('hidden')) $('#confirmModal').classList.add('hidden');
  }
});

loadMe().then(loadHosts);
