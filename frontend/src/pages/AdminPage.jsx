import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Save, Search, ShieldCheck } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ageStatusLabel,
  makeNewStudio,
  minYearsValue,
  normalizeStudio,
  validateData,
} from '@/lib/admin';
import {
  LOCAL,
  friendlyError,
  loadGitHubData,
  loadLocalData,
  readAdminToken,
  saveGitHubData,
  saveLocalData,
} from '@/lib/admin-api';
import { groupInfo, groupMap as buildGroupMap, safeColor } from '@/lib/directory';

function prepareData(raw) {
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
    const fallback = remap.get(studio.group) || newGroups[0]?.key || 'other';
    return { ...studio, group: fallback };
  });
}

function AdminLoading() {
  return (
    <div className="min-h-dvh bg-secondary/30">
      <header className="flex h-16 items-center border-b bg-background px-4">
        <Brand compact />
      </header>
      <div className="container max-w-4xl py-10">
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
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
  const [repo, setRepo] = useState(
    () => sessionStorage.getItem('admin_repo') || 'design-directory-surabaya',
  );

  const [data, setData] = useState(null);
  const [sha, setSha] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('studios');
  const [status, setStatus] = useState({ tone: 'muted', text: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [localError, setLocalError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const savedGroupsRef = useRef([]);

  const setLoaded = (result) => {
    const next = prepareData(result.data);
    setData(next);
    setSha(result.sha ?? null);
    savedGroupsRef.current = cloneGroups(next.groups);
    setSelectedId(null);
    setDirty(false);
    setStatus({ tone: 'muted', text: '' });
  };

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (LOCAL) {
        if (!adminToken) return;
        setLoading(true);
        try {
          const result = await loadLocalData(adminToken);
          if (!cancelled) setLoaded(result);
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
        const result = await loadGitHubData({ token, owner, repo });
        if (!cancelled) {
          setLoaded(result);
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
    // Boot hanya sekali; token/owner/repo awal sudah dibaca dari sessionStorage.
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

  const markDirty = () => {
    setDirty(true);
    setStatus({ tone: 'muted', text: 'Ada perubahan belum disimpan.' });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const trimmedToken = token.trim();
      const result = await loadGitHubData({ token: trimmedToken, owner, repo });
      sessionStorage.setItem('admin_token', trimmedToken);
      sessionStorage.setItem('admin_owner', owner);
      sessionStorage.setItem('admin_repo', repo);
      setLoaded(result);
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
      description: 'Perubahan yang belum disimpan akan hilang.',
      actionLabel: 'Keluar',
      onConfirm: run,
    });
  };

  const updateSelected = (key, value) => {
    setData((prev) => {
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

  const addStudio = () => {
    if (!data) return;
    const studio = makeNewStudio(data);
    setData((prev) => ({ ...prev, studios: [...prev.studios, studio] }));
    setSelectedId(studio.id);
    markDirty();
  };

  const deleteStudio = () => {
    if (!data || !selectedId) return;
    const studio = data.studios.find((entry) => entry.id === selectedId);
    if (!studio) return;
    setConfirm({
      title: `Hapus "${studio.name}"?`,
      description: 'Data studio akan dihapus dari direktori setelah disimpan.',
      actionLabel: 'Hapus studio',
      onConfirm: () => {
        setData((prev) => ({ ...prev, studios: prev.studios.filter((entry) => entry.id !== studio.id) }));
        setSelectedId(null);
        markDirty();
      },
    });
  };

  const deleteGroup = (index) => {
    if (!data) return;
    const group = data.groups[index];
    setConfirm({
      title: `Hapus kategori "${group.label}"?`,
      description: 'Studio pada kategori ini akan dipindahkan ke kategori pertama saat disimpan.',
      actionLabel: 'Hapus kategori',
      onConfirm: () => {
        setData((prev) => ({ ...prev, groups: prev.groups.filter((_, groupIndex) => groupIndex !== index) }));
        markDirty();
      },
    });
  };

  const updateGroups = (groups) => {
    setData((prev) => ({ ...prev, groups }));
    markDirty();
  };

  const updateNotes = (notes) => {
    setData((prev) => ({ ...prev, notes }));
    markDirty();
  };

  const saveData = async () => {
    if (!data || saving) return;

    const groups = data.groups.map((group) => ({
      key: String(group.key || '').trim() || 'other',
      label: String(group.label || '').trim() || 'Kategori',
      color: safeColor(group.color),
    }));
    const normalized = data.studios.map((studio) => normalizeStudio(studio, { ...data, groups }));
    const studios = remapGroups(savedGroupsRef.current, groups, normalized);
    const next = {
      ...data,
      schemaVersion: Number(data.schemaVersion) || 2,
      minYears: Number(data.minYears) || 2,
      groups,
      studios,
      notes: (data.notes || []).map((note) => String(note).trim()).filter(Boolean),
      generatedAt: new Date().toISOString(),
    };

    const errors = validateData(next);
    if (errors.length) {
      const more = errors.length > 3 ? ` (+${errors.length - 3} lagi)` : '';
      setStatus({ tone: 'error', text: `Validasi gagal: ${errors.slice(0, 3).join(' ')}${more}` });
      return;
    }

    setSaving(true);
    setStatus({ tone: 'muted', text: 'Menyimpan…' });
    try {
      let message = 'Tersimpan ✓';
      if (LOCAL) {
        const result = await saveLocalData(adminToken, next);
        if (!result.committed) message = 'Tidak ada perubahan untuk disimpan.';
        else if (result.pushed) message = 'Tersimpan, di-commit & di-push ✓';
        else message = 'Tersimpan & di-commit (push nonaktif)';
      } else {
        const nextSha = await saveGitHubData({ token, owner, repo, sha, data: next });
        setSha(nextSha);
      }
      setData(next);
      savedGroupsRef.current = cloneGroups(groups);
      setDirty(false);
      setStatus({ tone: 'success', text: message });
    } catch (error) {
      setStatus({ tone: 'error', text: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  };

  const groupMap = useMemo(() => buildGroupMap(data?.groups || []), [data?.groups]);
  const selectedStudio = data?.studios.find((studio) => studio.id === selectedId) || null;
  const filteredStudios = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data.studios;
    return data.studios.filter((studio) =>
      `${studio.name} ${studio.category} ${studio.address}`.toLowerCase().includes(needle),
    );
  }, [data, query]);

  if (!data && loading) return <AdminLoading />;

  if (!data) {
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

  const statusClass =
    status.tone === 'success'
      ? 'text-emerald-700'
      : status.tone === 'error'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div className="min-h-dvh bg-secondary/25">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6">
          <Brand compact />
          <Badge variant="secondary" className="hidden rounded-full sm:inline-flex">
            Admin
          </Badge>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span
              role="status"
              aria-live="polite"
              className={`hidden max-w-[42ch] truncate text-xs sm:block ${statusClass}`}
            >
              {status.text}
            </span>
            <Button size="sm" className="rounded-full" onClick={saveData} disabled={saving || !dirty}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Simpan
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
        <div className="border-t px-4 py-2 sm:hidden">
          <span role="status" aria-live="polite" className={`text-xs ${statusClass}`}>
            {status.text}
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1500px] p-4 sm:p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="studios">Studio</TabsTrigger>
              <TabsTrigger value="settings">Kategori &amp; catatan</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {data.studios.length} studio · {data.groups.length} kategori
            </div>
          </div>

          <TabsContent value="studios" className="mt-0">
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
                </div>
                <ScrollArea className="h-[calc(100dvh-19rem)] min-h-[280px]">
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
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: safeColor(info.color) }}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{studio.name}</span>
                            {studio.needsReview ? (
                              <span className="text-[10px] text-amber-700" title="Perlu cek manual">
                                ⚠
                              </span>
                            ) : null}
                            {studio.outsideSurabaya ? (
                              <span className="text-[10px] text-destructive" title="Di luar Surabaya">
                                ↗
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="p-4 text-center text-xs text-muted-foreground">
                        Tidak ada studio yang cocok.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="overflow-hidden">
                <StudioForm
                  studio={selectedStudio}
                  data={data}
                  onChange={updateSelected}
                  onDelete={deleteStudio}
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <GroupsEditor
              data={data}
              onGroupsChange={updateGroups}
              onNotesChange={updateNotes}
              onDeleteGroup={deleteGroup}
            />
          </TabsContent>
        </Tabs>
      </main>

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
