(() => {
  const API = 'https://api.github.com';
  const DATA_PATH = 'site/data/directory.json';
  const LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || new URLSearchParams(location.search).has('local');

  function readAdminToken() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const fromHash = hash.get('t') || hash.get('token') || '';
    if (fromHash) {
      sessionStorage.setItem('admin_local_token', fromHash);
      history.replaceState(null, '', location.pathname + location.search);
      return fromHash;
    }
    return sessionStorage.getItem('admin_local_token') || '';
  }

  const state = {
    token: sessionStorage.getItem('admin_token') || '',
    adminToken: readAdminToken(),
    owner: sessionStorage.getItem('admin_owner') || 'miazakii',
    repo: sessionStorage.getItem('admin_repo') || 'design-directory-surabaya',
    data: null,
    sha: null,
    selectedId: null,
    dirty: false,
  };

  const loginView = document.getElementById('login-view');
  const editorView = document.getElementById('editor-view');
  const loginForm = document.getElementById('login-form');
  const tokenInput = document.getElementById('token-input');
  const ownerInput = document.getElementById('owner-input');
  const repoInput = document.getElementById('repo-input');
  const loginError = document.getElementById('login-error');
  const localHelp = document.getElementById('local-help');
  const saveBtn = document.getElementById('save-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const saveStatus = document.getElementById('save-status');
  const adminSearch = document.getElementById('admin-search');
  const addBtn = document.getElementById('add-btn');
  const adminList = document.getElementById('admin-list');
  const adminForm = document.getElementById('admin-form');
  const groupsEditor = document.getElementById('groups-editor');
  const notesEditor = document.getElementById('notes-editor');

  const FIELDS = [
    { key: 'name', label: 'Nama Studio', type: 'text' },
    { key: 'category', label: 'Kategori (mentah)', type: 'text' },
    { key: 'group', label: 'Kategori / Legend', type: 'group' },
    { key: 'address', label: 'Alamat', type: 'text' },
    { key: 'city', label: 'Kota', type: 'text' },
    { key: 'postalCode', label: 'Kode Pos', type: 'text' },
    { key: 'phone', label: 'Telepon', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'emails', label: 'Email (satu per baris)', type: 'textarea', array: true },
    { key: 'instagram', label: 'Instagram', type: 'text' },
    { key: 'facebook', label: 'Facebook', type: 'text' },
    { key: 'linkedin', label: 'LinkedIn', type: 'text' },
    { key: 'youtube', label: 'YouTube', type: 'text' },
    { key: 'rating', label: 'Rating', type: 'number' },
    { key: 'reviews', label: 'Jumlah Review', type: 'number' },
    { key: 'openingHours', label: 'Jam Buka (satu per baris)', type: 'textarea', array: true },
    { key: 'latitude', label: 'Latitude', type: 'number' },
    { key: 'longitude', label: 'Longitude', type: 'number' },
    { key: 'mapsUrl', label: 'Google Maps URL', type: 'text' },
    { key: 'placeId', label: 'Place ID', type: 'text' },
    { key: 'ageStatusCode', label: 'Status Usia', type: 'select' },
    { key: 'confidence', label: 'Skor Keyakinan', type: 'number' },
    { key: 'foundedYear', label: 'Tahun Berdiri', type: 'number' },
    { key: 'ageYears', label: 'Usia (tahun)', type: 'number' },
    { key: 'ageSummary', label: 'Sinyal Usia', type: 'textarea' },
    { key: 'evidenceUrl', label: 'Link Bukti', type: 'text' },
    { key: 'sourceKeyword', label: 'Keyword Sumber', type: 'text' },
    { key: 'outsideSurabaya', label: 'Di luar Surabaya', type: 'checkbox' },
  ];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#8D99AE';
  }

  function minYears() {
    return Number(state.data?.minYears) || 2;
  }

  function ageStatusLabel(code) {
    switch (code) {
      case 'verified':
        return `Usia terverifikasi (>= ${minYears()} tahun)`;
      case 'young':
        return `Kemungkinan < ${minYears()} tahun`;
      case 'manual':
        return 'Perlu cek manual';
      case 'unknown':
        return 'Tidak dapat dipastikan';
      default:
        return '';
    }
  }

  function ageStatusFromLabel(label) {
    const text = String(label ?? '').trim();
    if (text.startsWith('Usia terverifikasi')) return 'verified';
    if (text.startsWith('Kemungkinan <')) return 'young';
    if (text === 'Perlu cek manual') return 'manual';
    if (text === 'Tidak dapat dipastikan') return 'unknown';
    return '';
  }

  function ageStatusOptions(selected) {
    return [
      ['', '—'],
      ['verified', `Terverifikasi (>= ${minYears()} tahun)`],
      ['manual', 'Perlu cek manual'],
      ['unknown', 'Tidak dapat dipastikan'],
      ['young', `Kemungkinan < ${minYears()} tahun`],
    ]
      .map(([value, label]) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`)
      .join('');
  }

  function utf8Base64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function base64Utf8(value) {
    const binary = atob(String(value).replace(/\s+/g, ''));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function gh(path, opts = {}) {
    const { method = 'GET', body, token = state.token } = opts;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API}${path}`, { method, headers, body });
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const json = await res.json();
        message = json.message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return res.status === 204 ? null : res.json();
  }

  function friendlyError(error) {
    const message = error.message || '';
    if (message.includes('401') || message.includes('Token admin')) {
      return LOCAL
        ? 'Token admin lokal tidak valid. Buka lagi URL lengkap dengan #t=... yang dicetak di terminal saat `npm run admin`.'
        : 'Token tidak valid atau sudah kedaluwarsa. Periksa kembali token-nya.';
    }
    if (message.includes('Failed to fetch')) {
      return 'Koneksi ke api.github.com gagal. Coba: pastikan terhubung internet, nonaktifkan ad-blocker/ekstensi privasi, atau pakai browser lain.';
    }
    if (message.includes('403')) {
      return 'Token tidak punya akses ke repo ini. Pastikan fine-grained token diberikan ke repository design-directory-surabaya dengan izin "Contents: Read and write" (atau classic token dengan scope repo).';
    }
    if (message.includes('404')) {
      return 'File data atau repo tidak ditemukan. Periksa kolom Owner dan Repo.';
    }
    return `Gagal masuk: ${message}`;
  }

  async function loadData() {
    if (LOCAL) {
      const res = await fetch('/api/directory', {
        headers: { 'X-Admin-Token': state.adminToken },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server lokal: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      state.data = json.data;
      return;
    }
    const res = await gh(`/repos/${state.owner}/${state.repo}/contents/${DATA_PATH}`);
    state.data = JSON.parse(base64Utf8(res.content));
    state.sha = res.sha;
  }

  function renderStudioList() {
    const query = adminSearch.value.trim().toLowerCase();
    const list = state.data.studios.filter((studio) =>
      !query || `${studio.name} ${studio.category} ${studio.address}`.toLowerCase().includes(query),
    );

    adminList.innerHTML = list.map((studio) => {
      const group = state.data.groups.find((entry) => entry.key === studio.group);
      const color = group?.color || '#8D99AE';
      const flags = [studio.needsReview ? '⚠' : '', studio.outsideSurabaya ? '↗' : ''].filter(Boolean).join(' ');
      const active = studio.id === state.selectedId ? ' is-active' : '';
      return `<button class="admin-studio${active}" type="button" data-id="${esc(studio.id)}">
        <span class="dot" style="background:${color}"></span>
        <span class="admin-studio__name">${esc(studio.name)}</span>
        ${flags ? `<span class="admin-studio__flags">${flags}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderStudioForm(studio) {
    if (!studio) {
      adminForm.innerHTML = '<p class="admin-empty">Pilih studio dari daftar atau tambah baru.</p>';
      return;
    }

    const groupOptions = state.data.groups.map((group) =>
      `<option value="${esc(group.key)}"${group.key === studio.group ? ' selected' : ''}>${esc(group.label)}</option>`,
    ).join('');

    const fieldsHtml = FIELDS.map((field) => {
      if (field.type === 'group') {
        return `<label for="f-group">${esc(field.label)}</label><select id="f-group" class="admin-input">${groupOptions}</select>`;
      }
      if (field.type === 'select') {
        const selected =
          field.key === 'ageStatusCode'
            ? studio.ageStatusCode || ageStatusFromLabel(studio.ageStatus)
            : studio[field.key] || '';
        return `<label for="f-${field.key}">${esc(field.label)}</label><select id="f-${field.key}" class="admin-input">${ageStatusOptions(selected)}</select>`;
      }
      if (field.type === 'checkbox') {
        return `<label class="admin-check"><input type="checkbox" id="f-${field.key}"${studio[field.key] ? ' checked' : ''}> ${esc(field.label)}</label>`;
      }
      if (field.type === 'textarea') {
        const value = field.array ? (studio[field.key] || []).join('\n') : (studio[field.key] ?? '');
        return `<label for="f-${field.key}">${esc(field.label)}</label><textarea id="f-${field.key}" class="admin-input" rows="3">${esc(value)}</textarea>`;
      }
      const value = studio[field.key] == null ? '' : studio[field.key];
      return `<label for="f-${field.key}">${esc(field.label)}</label><input id="f-${field.key}" class="admin-input" type="${field.type}" value="${esc(value)}">`;
    }).join('');

    adminForm.innerHTML = `
      <div class="admin-form-head">
        <h2>Edit Studio</h2>
        <button id="delete-btn" class="btn btn--ghost admin-danger" type="button">Hapus</button>
      </div>
      <div class="admin-form-grid">${fieldsHtml}</div>
    `;

    document.getElementById('delete-btn').addEventListener('click', () => {
      if (!window.confirm(`Hapus "${studio.name}"?`)) return;
      state.data.studios = state.data.studios.filter((entry) => entry.id !== studio.id);
      state.selectedId = null;
      markDirty();
      renderStudioList();
      renderStudioForm(null);
    });
  }

  function serializeStudioForm(studio) {
    for (const field of FIELDS) {
      const element = document.getElementById(`f-${field.key}`);
      if (!element) continue;
      if (field.type === 'checkbox') studio[field.key] = element.checked;
      else if (field.type === 'number') studio[field.key] = element.value === '' ? null : Number(element.value);
      else if (field.type === 'group' || field.type === 'select') studio[field.key] = element.value;
      else if (field.array) studio[field.key] = element.value.split('\n').map((entry) => entry.trim()).filter(Boolean);
      else studio[field.key] = element.value;
    }

    if (studio.ageStatusCode !== undefined) {
      studio.ageStatusCode = studio.ageStatusCode || '';
      studio.ageStatus = ageStatusLabel(studio.ageStatusCode);
      studio.needsReview = ['manual', 'unknown'].includes(studio.ageStatusCode);
    }

    return studio;
  }

  function renderGroupsEditor() {
    const rows = state.data.groups.map((group) => `
      <div class="group-row" data-key="${esc(group.key)}">
        <input class="group-key admin-input" value="${esc(group.key)}" title="Key">
        <input class="group-label admin-input" value="${esc(group.label)}" title="Label">
        <input class="group-color" type="color" value="${esc(group.color)}" title="Warna">
        <button class="group-delete" type="button" title="Hapus">✕</button>
      </div>`).join('');

    groupsEditor.innerHTML = `${rows}<button id="group-add" class="btn btn--ghost" type="button">+ Tambah Kategori</button>`;
  }

  function serializeGroups() {
    return [...groupsEditor.querySelectorAll('.group-row')].map((row) => ({
      key: row.querySelector('.group-key').value.trim() || 'other',
      label: row.querySelector('.group-label').value.trim() || 'Kategori',
      color: safeColor(row.querySelector('.group-color').value),
    }));
  }

  function renderNotesEditor() {
    notesEditor.value = (state.data.notes || []).join('\n');
  }

  function switchTab(tab) {
    document.querySelectorAll('.admin-tab').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tab === tab);
    });
    document.getElementById('tab-studios').hidden = tab !== 'studios';
    document.getElementById('tab-categories').hidden = tab !== 'categories';
  }

  function markDirty() {
    state.dirty = true;
    if (!saveBtn.disabled) {
      saveStatus.textContent = 'Ada perubahan belum disimpan.';
      saveStatus.className = '';
    }
  }

  function flushCurrentForm() {
    if (!state.selectedId) return;
    const studio = state.data.studios.find((entry) => entry.id === state.selectedId);
    if (studio) serializeStudioForm(studio);
  }

  function flushGroups() {
    if (!groupsEditor.querySelector('.group-row')) return;
    state.data.groups = serializeGroups();
  }

  function remapGroupKeys(oldGroups, newGroups) {
    const newKeys = new Set(newGroups.map((group) => group.key));
    const remap = new Map();
    oldGroups.forEach((oldGroup, index) => {
      const next = newGroups[index];
      if (next && oldGroup.key !== next.key && !newKeys.has(oldGroup.key)) {
        remap.set(oldGroup.key, next.key);
      }
    });
    if (remap.size === 0) return;
    state.data.studios.forEach((studio) => {
      if (remap.has(studio.group)) studio.group = remap.get(studio.group);
    });
  }

  function validateData(data) {
    const errors = [];
    const groups = Array.isArray(data.groups) ? data.groups : [];
    if (groups.length === 0) errors.push('Minimal satu kategori.');

    const groupKeys = new Set();
    groups.forEach((group, index) => {
      if (!group.key || !String(group.key).trim()) errors.push(`Kategori #${index + 1} belum punya key.`);
      else if (groupKeys.has(group.key)) errors.push(`Key kategori duplikat: ${group.key}.`);
      else groupKeys.add(group.key);
      if (!group.label || !String(group.label).trim()) errors.push(`Kategori #${index + 1} belum punya label.`);
      if (!/^#[0-9a-f]{6}$/i.test(String(group.color || ''))) {
        errors.push(`Kategori #${index + 1}: warna harus format #RRGGBB.`);
      }
    });

    if (!Array.isArray(data.studios)) {
      errors.push('Daftar studio tidak valid.');
      return errors;
    }

    const ids = new Set();
    data.studios.forEach((studio, index) => {
      const label = studio.name ? `"${studio.name}"` : `baris ${index + 1}`;
      if (!studio.id || !String(studio.id).trim()) errors.push(`${label}: ID wajib diisi.`);
      else if (ids.has(studio.id)) errors.push(`${label}: ID duplikat.`);
      else ids.add(studio.id);
      if (!studio.name || !String(studio.name).trim()) errors.push(`Baris ${index + 1}: nama wajib diisi.`);
      if (!studio.group || !String(studio.group).trim()) errors.push(`${label}: kategori wajib dipilih.`);

      if (studio.rating != null && studio.rating !== '') {
        const rating = Number(studio.rating);
        if (!Number.isFinite(rating) || rating < 0 || rating > 5) errors.push(`${label}: rating harus 0–5.`);
      }
      for (const [key, min, max] of [
        ['latitude', -90, 90],
        ['longitude', -180, 180],
      ]) {
        if (studio[key] == null || studio[key] === '') continue;
        const value = Number(studio[key]);
        if (!Number.isFinite(value) || value < min || value > max) {
          errors.push(`${label}: ${key} harus ${min}–${max}.`);
        }
      }
    });

    if (!Array.isArray(data.notes)) errors.push('Catatan data tidak valid.');
    return errors;
  }

  async function saveData() {
    flushCurrentForm();

    const oldGroups = state.data.groups;
    const newGroups = serializeGroups();
    remapGroupKeys(oldGroups, newGroups);
    state.data.groups = newGroups;
    state.data.notes = notesEditor.value.split('\n').map((entry) => entry.trim()).filter(Boolean);

    const validationErrors = validateData(state.data);
    if (validationErrors.length > 0) {
      state.dirty = true;
      const more = validationErrors.length > 3 ? ` (+${validationErrors.length - 3} lagi)` : '';
      saveStatus.textContent = `Validasi gagal: ${validationErrors.slice(0, 3).join(' ')}${more}`;
      saveStatus.className = 'admin-status-err';
      return;
    }

    state.data.generatedAt = new Date().toISOString();

    const json = JSON.stringify(state.data, null, 2);
    saveBtn.disabled = true;
    saveStatus.textContent = 'Menyimpan…';
    saveStatus.className = '';

    try {
      if (LOCAL) {
        const res = await fetch('/api/directory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': state.adminToken,
          },
          body: json,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const details = Array.isArray(body.details) ? ` ${body.details.join(' ')}` : '';
          throw new Error((body.error || `${res.status} ${res.statusText}`) + details);
        }
        const result = await res.json().catch(() => ({}));
        if (!result.committed) {
          saveStatus.textContent = 'Tidak ada perubahan untuk disimpan.';
        } else if (result.pushed) {
          saveStatus.textContent = 'Tersimpan, di-commit & di-push ✓';
        } else {
          saveStatus.textContent = 'Tersimpan & di-commit (push nonaktif)';
        }
      } else {
        const res = await gh(`/repos/${state.owner}/${state.repo}/contents/${DATA_PATH}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: 'Update directory data',
            content: utf8Base64(json),
            sha: state.sha,
          }),
        });
        state.sha = res.content.sha;
        saveStatus.textContent = 'Tersimpan ✓';
      }
      state.dirty = false;
      saveStatus.className = 'admin-status-ok';
      renderStudioList();
      if (state.selectedId) {
        const current = state.data.studios.find((entry) => entry.id === state.selectedId);
        if (current) renderStudioForm(current);
      }
    } catch (error) {
      saveStatus.textContent = `Gagal: ${error.message}`;
      saveStatus.className = 'admin-status-err';
    } finally {
      saveBtn.disabled = false;
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim() || 'miazakii';
    const repo = repoInput.value.trim() || 'design-directory-surabaya';

    state.token = token;
    state.owner = owner;
    state.repo = repo;

    try {
      await loadData();
      sessionStorage.setItem('admin_token', token);
      sessionStorage.setItem('admin_owner', owner);
      sessionStorage.setItem('admin_repo', repo);
      showEditor();
    } catch (error) {
      state.token = '';
      loginError.textContent = friendlyError(error);
    }
  });

  function showEditor() {
    loginView.hidden = true;
    editorView.hidden = false;
    adminSearch.value = '';
    state.data.schemaVersion = Number(state.data.schemaVersion) || 2;
    state.data.minYears = Number(state.data.minYears) || 2;
    state.selectedId = null;
    state.dirty = false;
    saveStatus.textContent = '';
    saveStatus.className = '';
    renderStudioList();
    renderStudioForm(null);
    renderGroupsEditor();
    renderNotesEditor();
    switchTab('studios');
  }

  adminSearch.addEventListener('input', renderStudioList);

  adminForm.addEventListener('input', () => {
    flushCurrentForm();
    markDirty();
  });
  adminForm.addEventListener('change', () => {
    flushCurrentForm();
    markDirty();
  });
  groupsEditor.addEventListener('input', markDirty);
  groupsEditor.addEventListener('change', markDirty);
  notesEditor.addEventListener('input', markDirty);

  adminList.addEventListener('click', (event) => {
    const item = event.target.closest('.admin-studio');
    if (!item) return;
    const studio = state.data.studios.find((entry) => entry.id === item.dataset.id);
    if (!studio) return;
    flushCurrentForm();
    state.selectedId = studio.id;
    renderStudioList();
    renderStudioForm(studio);
  });

  addBtn.addEventListener('click', () => {
    flushCurrentForm();
    const studio = {
      id: `new-${Date.now()}`,
      no: state.data.studios.length + 1,
      name: 'Studio Baru',
      category: '',
      group: state.data.groups[0]?.key || 'other',
      address: '',
      city: 'Surabaya',
      postalCode: '',
      phone: '',
      website: '',
      emails: [],
      instagram: '',
      facebook: '',
      linkedin: '',
      youtube: '',
      rating: null,
      reviews: 0,
      openingHours: [],
      latitude: null,
      longitude: null,
      mapsUrl: '',
      placeId: '',
      ageStatusCode: '',
      ageStatus: '',
      confidence: 0,
      foundedYear: null,
      ageYears: null,
      ageSummary: '',
      evidenceUrl: '',
      sourceKeyword: '',
      needsReview: false,
      outsideSurabaya: false,
    };
    state.data.studios.push(studio);
    state.selectedId = studio.id;
    markDirty();
    renderStudioList();
    renderStudioForm(studio);
  });

  groupsEditor.addEventListener('click', (event) => {
    if (event.target.id === 'group-add') {
      flushGroups();
      state.data.groups.push({ key: 'kategori-baru', label: 'Kategori Baru', color: '#8D99AE' });
      markDirty();
      renderGroupsEditor();
      return;
    }
    const deleteBtn = event.target.closest('.group-delete');
    if (deleteBtn) {
      const row = deleteBtn.closest('.group-row');
      const key = row.querySelector('.group-key').value.trim() || row.dataset.key;
      if (!window.confirm(`Hapus kategori "${key}"?`)) return;
      flushGroups();
      state.data.groups = state.data.groups.filter((group) => group.key !== key);
      markDirty();
      renderGroupsEditor();
    }
  });

  document.querySelectorAll('.admin-tab').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  saveBtn.addEventListener('click', saveData);

  logoutBtn.addEventListener('click', () => {
    if (state.dirty && !window.confirm('Ada perubahan yang belum disimpan. Keluar tetap?')) return;
    sessionStorage.clear();
    window.location.reload();
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  ownerInput.value = state.owner;
  repoInput.value = state.repo;

  (async () => {
    if (LOCAL) {
      if (!state.adminToken) {
        loginView.hidden = false;
        loginForm.hidden = true;
        localHelp.hidden = false;
        localHelp.textContent = 'Token admin lokal belum ada. Buka URL lengkap dengan #t=... yang dicetak di terminal saat `npm run admin`.';
        return;
      }
      try {
        await loadData();
        localHelp.hidden = true;
        showEditor();
      } catch (error) {
        sessionStorage.removeItem('admin_local_token');
        loginView.hidden = false;
        loginForm.hidden = true;
        localHelp.hidden = false;
        localHelp.textContent = `Gagal memuat dari server lokal. Jalankan \`npm run admin\` lalu buka URL dengan token yang dicetak — ${friendlyError(error)}`;
      }
      return;
    }

    loginForm.hidden = false;
    localHelp.hidden = true;
    if (!state.token) {
      loginView.hidden = false;
      return;
    }
    try {
      await loadData();
      showEditor();
    } catch (error) {
      sessionStorage.removeItem('admin_token');
      loginView.hidden = false;
      loginError.textContent = friendlyError(error);
    }
  })();
})();
