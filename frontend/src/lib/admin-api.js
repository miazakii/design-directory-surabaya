import { normalizeContent } from '@/lib/content';

const API = 'https://api.github.com';
const DIRECTORY_PATH = 'site/data/directory.json';
const CONTENT_PATH = 'site/data/content.json';

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

async function localApi(path, { method = 'GET', adminToken, body } = {}) {
  const headers = { 'X-Admin-Token': adminToken };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const details = Array.isArray(payload.details) ? ` ${payload.details.join(' ')}` : '';
    throw new Error((payload.error || `${response.status} ${response.statusText}`) + details);
  }
  return response.json();
}

export function friendlyError(error) {
  const message = error?.message || '';
  if (message.includes('401') || message.includes('Token admin')) {
    return LOCAL
      ? 'Token admin lokal tidak valid. Buka lagi URL lengkap dengan #t=... yang dicetak di terminal saat `npm run admin`.'
      : 'Token tidak valid atau sudah kedaluwarsa. Periksa kembali token-nya.';
  }
  if (message.includes('Failed to fetch')) {
    return 'Koneksi ke server admin gagal. Pastikan `npm run admin` masih berjalan.';
  }
  if (message.includes('403')) {
    return 'Token tidak punya akses ke repo ini. Pastikan fine-grained token punya izin "Contents: Read and write" untuk repo ini.';
  }
  if (message.includes('404')) {
    return 'File data atau repo tidak ditemukan. Periksa Owner dan Repo.';
  }
  return message.startsWith('Gagal:') ? message : `Gagal: ${message}`;
}

export async function loadLocalBundle(adminToken) {
  return localApi('/api/bundle', { adminToken });
}

export async function saveLocalDraft(adminToken, bundle) {
  return localApi('/api/draft', { method: 'POST', adminToken, body: bundle });
}

export async function discardLocalDraft(adminToken) {
  return localApi('/api/draft/discard', { method: 'POST', adminToken });
}

export async function previewLocalDraft(adminToken, bundle) {
  return localApi('/api/preview', { method: 'POST', adminToken, body: bundle });
}

export async function publishLocalBundle(adminToken, bundle, message) {
  return localApi('/api/publish', { method: 'POST', adminToken, body: { ...bundle, message } });
}

export async function loadLocalStatus(adminToken) {
  return localApi('/api/status', { adminToken });
}

export async function loadLocalHistory(adminToken) {
  return localApi('/api/history', { adminToken });
}

export async function loadLocalSnapshot(adminToken, sha) {
  return localApi(`/api/history/${sha}`, { adminToken });
}

export async function listLocalMedia(adminToken) {
  return localApi('/api/media', { adminToken });
}

export async function uploadLocalMedia(adminToken, filename, dataUrl) {
  return localApi('/api/media', { method: 'POST', adminToken, body: { filename, dataUrl } });
}

export async function deleteLocalMedia(adminToken, name) {
  return localApi('/api/media/delete', { method: 'POST', adminToken, body: { name } });
}

async function loadGitHubFile({ token, owner, repo, path }) {
  try {
    const response = await gh(`/repos/${owner}/${repo}/contents/${path}`, { token });
    return { data: JSON.parse(base64Utf8(response.content)), sha: response.sha };
  } catch (error) {
    if (error.message.includes('404')) return { data: null, sha: null };
    throw error;
  }
}

export async function loadGitHubBundle({ token, owner, repo }) {
  const [directory, content] = await Promise.all([
    loadGitHubFile({ token, owner, repo, path: DIRECTORY_PATH }),
    loadGitHubFile({ token, owner, repo, path: CONTENT_PATH }),
  ]);
  return {
    directory: directory.data,
    content: normalizeContent(content.data),
    shas: { directory: directory.sha, content: content.sha },
    drafts: { directory: false, content: false },
  };
}

export async function saveGitHubBundle({ token, owner, repo, shas, bundle }) {
  const put = async (path, data, sha, message) =>
    gh(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({
        message,
        content: utf8Base64(JSON.stringify(data, null, 2)),
        ...(sha ? { sha } : {}),
      }),
    });

  const [directory, content] = await Promise.all([
    put(DIRECTORY_PATH, bundle.directory, shas.directory, 'Update directory data'),
    put(CONTENT_PATH, bundle.content, shas.content, 'Update site content'),
  ]);

  return {
    shas: {
      directory: directory.content.sha,
      content: content.content.sha,
    },
  };
}
