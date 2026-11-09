import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Database,
  FileText,
  History,
  Image,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Tags,
  UploadCloud,
} from 'lucide-react';
import { validateContent } from '@shared/validate-content.js';
import { ContentSection } from '@/components/admin/content-section';
import { HistorySection } from '@/components/admin/history-section';
import { MediaSection } from '@/components/admin/media-section';
import { OverviewSection } from '@/components/admin/overview-section';
import { SeoSection } from '@/components/admin/seo-section';
import { SettingsSection } from '@/components/admin/settings-section';
import { AdminLogin } from '@/components/site/admin-login';
import { Brand } from '@/components/site/brand';
import { GroupsEditor } from '@/components/site/groups-editor';
import { StudioForm } from '@/components/site/studio-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ageStatusLabel, makeNewStudio, minYearsValue, normalizeStudio, validateData } from '@/lib/admin';
import {
  LOCAL,
  deleteLocalMedia,
  discardLocalDraft,
  friendlyError,
  listLocalMedia,
  loadGitHubBundle,
  loadLocalBundle,
  loadLocalHistory,
  loadLocalSnapshot,
  loadLocalStatus,
  previewLocalDraft,
  publishLocalBundle,
  readAdminToken,
  saveGitHubBundle,
  saveLocalDraft,
  uploadLocalMedia,
} from '@/lib/admin-api';
import { normalizeContent } from '@/lib/content';
import { groupInfo, groupMap as buildGroupMap, hasCoords, hasContact, isVerified, safeColor } from '@/lib/directory';
import { setByPath } from '@/lib/object';
import { findDuplicateGroups, reviewQueue, studioCompleteness } from '@/lib/quality';

function prepareDirectory(raw) {
  return {
    ...raw,
    schemaVersion: Number(raw.schemaVersion) || 2,
    minYears: Number(raw.minYears) || 2,
    studios: Array.isArray(raw.studios) ? raw.studios : [],
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
  };
}

function cloneGroups(groups) {
  return groups.map(({ key, label, color }) => ({ key, label, color }));
}

function remapGroups(oldGroups, newGroups, studios) {
  const newKeys = new Set(newGroups.map((group) => group.key));
  const remap = new Map();
  oldGroups.forEach((oldGroup, index) => {
    const next = newGroups[index];
    if (next && oldGroup.key !== next.key && !newKeys.has(oldGroup.key)) remap.set(oldGroup.key, next.key);
  });
  return studios.map((studio) => {
    if (newKeys.has(studio.group)) return studio;
    return { ...studio, group: remap.get(studio.group) || newGroups[0]?.key || 'other' };
  });
}

const NAV_ITEMS = [
  { key: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { key: 'studios', label: 'Studio', icon: Database },
  { key: 'categories', label: 'Kategori', icon: Tags },
  { key: 'content', label: 'Konten', icon: FileText },
  { key: 'seo', label: 'SEO', icon: Search },
  { key: 'media', label: 'Media', icon: Image },
  { key: 'history', label: 'Riwayat', icon: History },
  { key: 'settings', label: 'Pengaturan', icon: Settings2 },
];

function AdminLoading() {
  return (
    <div className="min-h-dvh bg-secondary/30">
      <header className="flex h-16 items-center border-b bg-background px-4">
        <Brand compact />
      </header>
      <div className="container max-w-5xl py-10">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-[520px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [adminToken] = useState(() => readAdminToken());
  const [token, setToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const [owner, setOwner] = useState(() => sessionStorage.getItem('admin_owner') || 'miazakii');
  const [repo, setRepo] = useState(() => sessionStorage.getItem('admin_repo') || 'design-directory-surabaya');

  const [directory, setDirectory] = useState(null);
  const [content, setContent] = useState(null);
  const [shas, setShas] = useState({ directory: null, content: null });
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const [activeSection, setActiveSection] = useState('overview');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState({ tone: 'muted', text: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [loginError, setLoginError] = useState('');
  const [localError, setLocalError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [showDraftBar, setShowDraftBar] = useState(false);
  const savedGroupsRef = useRef([]);

  const setLoaded = (bundle) => {
    const nextDirectory = prepareDirectory(bundle.directory);
    const nextContent = normalizeContent(bundle.content);
    setDirectory(nextDirectory);
    setContent(nextContent);
    setShas(bundle.shas || { directory: null, content: null });
    setStatus(bundle.status || null);
    savedGroupsRef.current = cloneGroups(nextDirectory.groups);
    setSelectedId(null);
    setDirty(false);
    setNotice({ tone: 'muted', text: '' });
    setShowDraftBar(Boolean(bundle.drafts?.directory || bundle.drafts?.content));
  };

  const refreshStatus = async () => {
    if (!LOCAL || !adminToken) return;
    try {
      const result = await loadLocalStatus(adminToken);
      setStatus(result.status);
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    }
  };

  const refreshHistory = async () => {
    if (!LOCAL || !adminToken) return;
    try {
      const result = await loadLocalHistory(adminToken);
      setHistory(result.commits || []);
    } catch {
      setHistory([]);
    }
  };

  const refreshMedia = async () => {
    if (!LOCAL || !adminToken) return;
    setMediaLoading(true);
    try {
      const result = await listLocalMedia(adminToken);
      setMedia(result.files || []);
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setMediaLoading(false);
    }
  };

  const refreshAllMeta = () => {
    refreshStatus();
    refreshHistory();
    refreshMedia();
  };

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (LOCAL) {
        if (!adminToken) return;
        setLoading(true);
        try {
          const bundle = await loadLocalBundle(adminToken);
          if (cancelled) return;
          setLoaded(bundle);
          refreshAllMeta();
        } catch (error) {
          if (!cancelled) {
            sessionStorage.removeItem('admin_local_token');
            setLocalError(friendlyError(error));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (!token) return;
      setLoading(true);
      try {
        const bundle = await loadGitHubBundle({ token, owner, repo });
        if (!cancelled) {
          setLoaded(bundle);
          sessionStorage.setItem('admin_token', token);
        }
      } catch (error) {
        if (!cancelled) {
          sessionStorage.removeItem('admin_token');
          setToken('');
          setLoginError(friendlyError(error));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // Boot hanya sekali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const markDirty = (text = 'Ada perubahan belum disimpan.') => {
    setDirty(true);
    setNotice({ tone: 'muted', text });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const trimmedToken = token.trim();
      const bundle = await loadGitHubBundle({ token: trimmedToken, owner, repo });
      sessionStorage.setItem('admin_token', trimmedToken);
      sessionStorage.setItem('admin_owner', owner);
      sessionStorage.setItem('admin_repo', repo);
      setLoaded(bundle);
    } catch (error) {
      setLoginError(friendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const run = () => {
      sessionStorage.clear();
      window.location.reload();
    };
    if (!dirty) {
      run();
      return;
    }
    setConfirm({
      title: 'Keluar tanpa menyimpan?',
      description: 'Perubahan yang belum disimpan atau dipublikasikan akan hilang.',
      actionLabel: 'Keluar',
      onConfirm: run,
    });
  };

  const validateAll = () => [
    ...validateData(directory).map((error) => `Data: ${error}`),
    ...validateContent(content).map((error) => `Konten: ${error}`),
  ];

  const updateSelected = (key, value) => {
    setDirectory((prev) => {
      if (!prev || !selectedId) return prev;
      return {
        ...prev,
        studios: prev.studios.map((studio) => {
          if (studio.id !== selectedId) return studio;
          const next = { ...studio, [key]: value };
          if (key === 'ageStatusCode') {
            next.ageStatus = ageStatusLabel(value, minYearsValue(prev));
            next.needsReview = ['manual', 'unknown'].includes(value);
          }
          return next;
        }),
      };
    });
    markDirty();
  };

  const updateContent = (path, value) => {
    setContent((prev) => setByPath(prev, path, value));
    markDirty();
  };

  const addStudio = () => {
    if (!directory) return;
    const studio = makeNewStudio(directory);
    setDirectory((prev) => ({ ...prev, studios: [...prev.studios, studio] }));
    setSelectedId(studio.id);
    setActiveSection('studios');
    markDirty();
  };

  const deleteStudio = () => {
    if (!directory || !selectedId) return;
    const studio = directory.studios.find((entry) => entry.id === selectedId);
    if (!studio) return;
    setConfirm({
      title: `Hapus "${studio.name}"?`,
      description: 'Data studio akan dihapus dari direktori setelah dipublikasikan.',
      actionLabel: 'Hapus studio',
      onConfirm: () => {
        setDirectory((prev) => ({ ...prev, studios: prev.studios.filter((entry) => entry.id !== studio.id) }));
        setSelectedId(null);
        markDirty();
      },
    });
  };

  const deleteGroup = (index) => {
    if (!directory) return;
    const group = directory.groups[index];
    setConfirm({
      title: `Hapus kategori "${group.label}"?`,
      description: 'Studio pada kategori ini akan dipindahkan ke kategori pertama saat dipublikasikan.',
      actionLabel: 'Hapus kategori',
      onConfirm: () => {
        setDirectory((prev) => ({ ...prev, groups: prev.groups.filter((_, groupIndex) => groupIndex !== index) }));
        markDirty();
      },
    });
  };

  const updateGroups = (groups) => {
    setDirectory((prev) => ({ ...prev, groups }));
    markDirty();
  };

  const updateNotes = (notes) => {
    setDirectory((prev) => ({ ...prev, notes }));
    markDirty();
  };

  const cleanBundle = () => {
    const groups = directory.groups.map((group) => ({
      key: String(group.key || '').trim() || 'other',
      label: String(group.label || '').trim() || 'Kategori',
      color: safeColor(group.color),
    }));
    const normalized = directory.studios.map((studio) => normalizeStudio(studio, { ...directory, groups }));
    const studios = remapGroups(savedGroupsRef.current, groups, normalized);
    return {
      directory: {
        ...directory,
        schemaVersion: Number(directory.schemaVersion) || 2,
        minYears: Number(directory.minYears) || 2,
        groups,
        studios,
        notes: (directory.notes || []).map((note) => String(note).trim()).filter(Boolean),
        generatedAt: new Date().toISOString(),
      },
      content,
    };
  };

  const saveDraft = async () => {
    if (!LOCAL) {
      setNotice({ tone: 'muted', text: 'Mode GitHub tidak memakai draft. Gunakan Publish.' });
      return;
    }
    const errors = validateAll();
    if (errors.length) {
      setNotice({ tone: 'error', text: `Validasi gagal: ${errors.slice(0, 3).join(' ')}` });
      return;
    }
    setSaving('draft');
    setNotice({ tone: 'muted', text: 'Menyimpan draft…' });
    try {
      const bundle = cleanBundle();
      await saveLocalDraft(adminToken, bundle);
      setDirectory(bundle.directory);
      setContent(bundle.content);
      savedGroupsRef.current = cloneGroups(bundle.directory.groups);
      setDirty(false);
      setShowDraftBar(true);
      setNotice({ tone: 'success', text: 'Draft tersimpan. Belum dipublikasikan.' });
      await refreshStatus();
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving('');
    }
  };

  const preview = async () => {
    if (!LOCAL) return;
    const errors = validateAll();
    if (errors.length) {
      setNotice({ tone: 'error', text: `Preview gagal: ${errors.slice(0, 3).join(' ')}` });
      return;
    }
    setSaving('preview');
    setNotice({ tone: 'muted', text: 'Menyiapkan preview…' });
    const previewWindow = window.open('', '_blank');
    try {
      const bundle = cleanBundle();
      await previewLocalDraft(adminToken, bundle);
      setDirectory(bundle.directory);
      setContent(bundle.content);
      savedGroupsRef.current = cloneGroups(bundle.directory.groups);
      setDirty(false);
      setShowDraftBar(true);
      setNotice({ tone: 'success', text: 'Preview siap. Membuka tab baru…' });
      await refreshStatus();
      if (previewWindow) previewWindow.location.href = '/index.html';
    } catch (error) {
      previewWindow?.close();
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving('');
    }
  };

  const publish = async () => {
    const errors = validateAll();
    if (errors.length) {
      setNotice({ tone: 'error', text: `Validasi gagal: ${errors.slice(0, 3).join(' ')}` });
      return;
    }
    setSaving('publish');
    setNotice({ tone: 'muted', text: 'Mempublikasikan…' });
    try {
      const bundle = cleanBundle();
      let message = 'Tersimpan ✓';
      if (LOCAL) {
        const result = await publishLocalBundle(adminToken, bundle, 'Publish dashboard updates');
        if (!result.committed) message = 'Tidak ada perubahan untuk dipublikasikan.';
        else if (result.pushed) message = 'Dipublikasikan, di-commit & di-push ✓';
        else message = 'Dipublikasikan & di-commit (push nonaktif) ✓';
        setShowDraftBar(false);
        await refreshAllMeta();
      } else {
        const result = await saveGitHubBundle({ token, owner, repo, shas, bundle });
        setShas(result.shas);
        message = 'Tersimpan ke GitHub ✓';
      }
      setDirectory(bundle.directory);
      setContent(bundle.content);
      savedGroupsRef.current = cloneGroups(bundle.directory.groups);
      setDirty(false);
      setNotice({ tone: 'success', text: message });
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving('');
    }
  };

  const performDiscard = async () => {
    if (!LOCAL) return;
    setSaving('discard');
    try {
      await discardLocalDraft(adminToken);
      const bundle = await loadLocalBundle(adminToken);
      setLoaded(bundle);
      setShowDraftBar(false);
      setNotice({ tone: 'success', text: 'Draft dibuang. Kembali ke data terpublikasi.' });
      await refreshAllMeta();
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving('');
    }
  };

  const discardDraft = () => {
    if (!LOCAL) return;
    if (dirty) {
      setConfirm({
        title: 'Buang draft dan perubahan?',
        description: 'Semua perubahan yang belum dipublikasikan akan hilang.',
        actionLabel: 'Buang draft',
        onConfirm: performDiscard,
      });
      return;
    }
    performDiscard();
  };

  const restoreVersion = async (sha) => {
    if (!LOCAL) return;
    setSaving('restore');
    try {
      const snap = await loadLocalSnapshot(adminToken, sha);
      setDirectory(prepareDirectory(snap.directory));
      if (snap.content) setContent(normalizeContent(snap.content));
      savedGroupsRef.current = cloneGroups(prepareDirectory(snap.directory).groups);
      setDirty(true);
      setActiveSection('overview');
      setNotice({ tone: 'muted', text: `Versi ${sha} dimuat. Tinjau, preview, lalu publish.` });
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving('');
    }
  };

  const uploadMedia = async (file) => {
    if (!LOCAL) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Gagal membaca file.'));
      reader.readAsDataURL(file);
    });
    setSaving('media');
    try {
      await uploadLocalMedia(adminToken, file.name, dataUrl);
      await refreshMedia();
      setNotice({ tone: 'success', text: 'Media diunggah. Gunakan URL-nya di SEO/OG image.' });
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving('');
    }
  };

  const deleteMedia = async (name) => {
    if (!LOCAL) return;
    setSaving('media');
    try {
      await deleteLocalMedia(adminToken, name);
      await refreshMedia();
      setNotice({ tone: 'success', text: 'Media dihapus.' });
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving('');
    }
  };

  const useOg = (url) => {
    setContent((prev) => ({
      ...prev,
      seo: {
        home: { ...prev.seo.home, ogImage: url },
        map: { ...prev.seo.map, ogImage: url },
        privacy: { ...prev.seo.privacy, ogImage: url },
      },
    }));
    markDirty('OG image diperbarui. Publish untuk menerapkan.');
  };

  const groupMap = useMemo(() => buildGroupMap(directory?.groups || []), [directory?.groups]);
  const selectedStudio = directory?.studios.find((studio) => studio.id === selectedId) || null;
  const filteredStudios = useMemo(() => {
    if (!directory) return [];
    const needle = query.trim().toLowerCase();
    return directory.studios.filter((studio) => {
      if (needle && !`${studio.name} ${studio.category} ${studio.address}`.toLowerCase().includes(needle)) {
        return false;
      }
      if (reviewFilter === 'review' && !studio.needsReview && !studio.outsideSurabaya) return false;
      if (reviewFilter === 'no-contact' && hasContact(studio)) return false;
      if (reviewFilter === 'no-coords' && hasCoords(studio)) return false;
      if (reviewFilter === 'outside' && !studio.outsideSurabaya) return false;
      if (reviewFilter === 'unverified' && isVerified(studio)) return false;
      return true;
    });
  }, [directory, query, reviewFilter]);

  const duplicates = useMemo(() => findDuplicateGroups(directory?.studios || []), [directory?.studios]);
  const review = useMemo(() => reviewQueue(directory?.studios || []), [directory?.studios]);
  const completeness = useMemo(
    () => (directory?.studios || []).map((studio) => ({ studio, ...studioCompleteness(studio) })),
    [directory?.studios],
  );

  if (!directory && loading) return <AdminLoading />;

  if (!directory) {
    return (
      <AdminLogin
        loading={loading}
        error={loginError}
        localError={localError}
        token={token}
        setToken={setToken}
        owner={owner}
        setOwner={setOwner}
        repo={repo}
        setRepo={setRepo}
        onSubmit={handleLogin}
      />
    );
  }

  const toneClass =
    notice.tone === 'success'
      ? 'text-emerald-700'
      : notice.tone === 'error'
        ? 'text-destructive'
        : 'text-muted-foreground';

  const handleSelectStudio = (id) => {
    setSelectedId(id);
    setActiveSection('studios');
  };

  const section = (() => {
    if (activeSection === 'overview') {
      return (
        <OverviewSection
          data={directory}
          content={content}
          status={status}
          duplicates={duplicates}
          review={review}
          completeness={completeness}
          onNavigate={setActiveSection}
          onSelectStudio={handleSelectStudio}
          onRefresh={refreshAllMeta}
          loading={mediaLoading || saving !== ''}
        />
      );
    }
    if (activeSection === 'content') return <ContentSection content={content} onChange={updateContent} />;
    if (activeSection === 'seo') return <SeoSection content={content} onChange={updateContent} />;
    if (activeSection === 'settings') return <SettingsSection content={content} onChange={updateContent} />;
    if (activeSection === 'media') {
      return (
        <MediaSection
          files={media}
          loading={mediaLoading}
          onRefresh={refreshMedia}
          onUpload={uploadMedia}
          onUseOg={useOg}
          onDelete={deleteMedia}
        />
      );
    }
    if (activeSection === 'history') {
      return (
        <HistorySection
          commits={history}
          status={status}
          loading={saving === 'restore'}
          onRefresh={() => {
            refreshStatus();
            refreshHistory();
          }}
          onRestore={restoreVersion}
        />
      );
    }
    if (activeSection === 'categories') {
      return <GroupsEditor data={directory} onGroupsChange={updateGroups} onNotesChange={updateNotes} onDeleteGroup={deleteGroup} />;
    }
    return (
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <Card className="overflow-hidden lg:sticky lg:top-24">
          <div className="space-y-3 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari studio…"
                className="pl-9"
                aria-label="Cari studio di admin"
              />
            </div>
            <Button variant="outline" className="w-full" onClick={addStudio}>
              <Plus /> Tambah studio
            </Button>
            <div className="flex flex-wrap gap-1">
              {[
                ['all', 'Semua'],
                ['review', 'Perlu review'],
                ['unverified', 'Belum verifikasi'],
                ['no-contact', 'Tanpa kontak'],
                ['no-coords', 'Tanpa koordinat'],
                ['outside', 'Luar Surabaya'],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={reviewFilter === key ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 rounded-full px-2 text-[11px]"
                  onClick={() => setReviewFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="h-[calc(100dvh-23rem)] min-h-[280px]">
            <div className="space-y-0.5 p-2">
              {filteredStudios.length ? (
                filteredStudios.map((studio) => {
                  const info = groupInfo(groupMap, studio);
                  return (
                    <button
                      key={studio.id}
                      type="button"
                      onClick={() => setSelectedId(studio.id)}
                      aria-current={selectedId === studio.id ? 'true' : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-accent ${
                        selectedId === studio.id ? 'border-border bg-accent' : ''
                      }`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: safeColor(info.color) }} />
                      <span className="min-w-0 flex-1 truncate text-sm">{studio.name}</span>
                      {studio.needsReview ? <span className="text-[10px] text-amber-700">⚠</span> : null}
                      {studio.outsideSurabaya ? <span className="text-[10px] text-destructive">↗</span> : null}
                    </button>
                  );
                })
              ) : (
                <p className="p-4 text-center text-xs text-muted-foreground">Tidak ada studio yang cocok.</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="overflow-hidden">
          <StudioForm studio={selectedStudio} data={directory} onChange={updateSelected} onDelete={deleteStudio} />
        </Card>
      </div>
    );
  })();

  return (
    <div className="min-h-dvh bg-secondary/25">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <Brand compact />
          <Badge variant="secondary" className="hidden rounded-full sm:inline-flex">Admin</Badge>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <span role="status" aria-live="polite" className={`hidden max-w-[34ch] truncate text-xs lg:block ${toneClass}`}>
              {notice.text}
            </span>
            {showDraftBar ? (
              <Badge variant="warning" className="rounded-full">Draft</Badge>
            ) : null}
            <Button size="sm" variant="outline" className="rounded-full" onClick={saveDraft} disabled={!LOCAL || saving !== '' || !dirty}>
              {saving === 'draft' ? <Loader2 className="animate-spin" /> : <Save />} Simpan draft
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={preview} disabled={!LOCAL || saving !== ''}>
              {saving === 'preview' ? <Loader2 className="animate-spin" /> : <UploadCloud />} Preview
            </Button>
            <Button size="sm" className="rounded-full" onClick={publish} disabled={saving !== ''}>
              {saving === 'publish' ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Publish
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLogout} aria-label="Keluar">
              <LogOut />
            </Button>
          </div>
        </div>
        <div className="border-t px-4 py-1.5 lg:hidden">
          <span role="status" aria-live="polite" className={`text-xs ${toneClass}`}>{notice.text}</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-background p-1 lg:sticky lg:top-24 lg:flex-col" aria-label="Bagian dashboard">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={activeSection === item.key ? 'secondary' : 'ghost'}
                className="h-9 shrink-0 justify-start gap-2 rounded-lg px-3 text-sm lg:w-full"
                onClick={() => setActiveSection(item.key)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>
          {showDraftBar ? (
            <Card className="mt-3 p-3">
              <p className="text-xs font-medium">Draft belum dipublikasikan</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Preview untuk melihat hasil lokal, atau buang draft.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 rounded-full px-2 text-xs text-destructive" onClick={discardDraft} disabled={saving !== ''}>
                Buang draft
              </Button>
            </Card>
          ) : null}
        </aside>

        <main id="main" className="min-w-0">
          {section}
        </main>
      </div>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                confirm?.onConfirm();
                setConfirm(null);
              }}
            >
              {confirm?.actionLabel || 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
