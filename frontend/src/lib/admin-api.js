const API = 'https://api.github.com';
const DATA_PATH = 'site/data/directory.json';

export const LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export function readAdminToken() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const fromHash = hash.get('t') || hash.get('token') || '';
  if (fromHash) {
    sessionStorage.setItem('admin_local_token', fromHash);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return fromHash;
  }
  return sessionStorage.getItem('admin_local_token') || '';
}

export function utf8Base64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64Utf8(value) {
  const binary = atob(String(value).replace(/\s+/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function gh(path, { method = 'GET', body, token } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };
  if (body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API}${path}`, { method, headers, body });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const json = await response.json();
      message = json.message || message;
    } catch {
      // Pesan default sudah cukup.
    }
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

export function friendlyError(error) {
  const message = error?.message || '';
  if (message.includes('401') || message.includes('Token admin')) {
    return LOCAL
      ? 'Token admin lokal tidak valid. Buka lagi URL lengkap dengan #t=... yang dicetak di terminal saat `npm run admin`.'
      : 'Token tidak valid atau sudah kedaluwarsa. Periksa kembali token-nya.';
  }
  if (message.includes('Failed to fetch')) {
    return 'Koneksi ke api.github.com gagal. Pastikan terhubung internet, nonaktifkan ad-blocker, atau pakai browser lain.';
  }
  if (message.includes('403')) {
    return 'Token tidak punya akses ke repo ini. Pastikan fine-grained token punya izin "Contents: Read and write" untuk repo ini.';
  }
  if (message.includes('404')) {
    return 'File data atau repo tidak ditemukan. Periksa Owner dan Repo.';
  }
  return `Gagal: ${message}`;
}

export async function loadLocalData(adminToken) {
  const response = await fetch('/api/directory', {
    headers: { 'X-Admin-Token': adminToken },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Server lokal: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  return { data: json.data, sha: null };
}

export async function saveLocalData(adminToken, data) {
  const response = await fetch('/api/directory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const details = Array.isArray(body.details) ? ` ${body.details.join(' ')}` : '';
    throw new Error((body.error || `${response.status} ${response.statusText}`) + details);
  }
  return response.json().catch(() => ({}));
}

export async function loadGitHubData({ token, owner, repo }) {
  const response = await gh(`/repos/${owner}/${repo}/contents/${DATA_PATH}`, { token });
  return { data: JSON.parse(base64Utf8(response.content)), sha: response.sha };
}

export async function saveGitHubData({ token, owner, repo, sha, data }) {
  const response = await gh(`/repos/${owner}/${repo}/contents/${DATA_PATH}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({
      message: 'Update directory data',
      content: utf8Base64(JSON.stringify(data, null, 2)),
      sha,
    }),
  });
  return response.content.sha;
}
