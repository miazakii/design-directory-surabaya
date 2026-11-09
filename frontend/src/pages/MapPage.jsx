import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpRight, Menu, RefreshCw } from 'lucide-react';
import { Brand } from '@/components/site/brand';
import { DirectorySidebar } from '@/components/site/directory-sidebar';
import { MapCanvas } from '@/components/site/map-canvas';
import { StudioDialog } from '@/components/site/studio-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useDirectory } from '@/hooks/use-directory';
import { groupInfo, groupMap as buildGroupMap, hasContact, isVerified } from '@/lib/directory';

const initialParams = new URLSearchParams(window.location.search);

function LoadingMap() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Skeleton className="h-9 w-9 rounded-md lg:hidden" />
        <Brand compact />
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[380px] shrink-0 space-y-4 border-r p-4 lg:block">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-40" />
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-16 w-full rounded-lg" />
          ))}
        </aside>
        <div className="flex-1 bg-secondary/40">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}

export function MapPage() {
  const { data, error, loading } = useDirectory();
  const studios = data?.studios ?? [];
  const groups = data?.groups ?? [];
  const minYears = Number(data?.minYears) || 2;

  const [activeGroup, setActiveGroup] = useState(() => initialParams.get('group') || null);
  const [query, setQuery] = useState(() => initialParams.get('q') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(initialParams.get('verified') === '1');
  const [hasContactOnly, setHasContactOnly] = useState(initialParams.get('contact') === '1');
  const [selectedId, setSelectedId] = useState(() => initialParams.get('studio') || null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const groupMap = useMemo(() => buildGroupMap(groups), [groups]);

  useEffect(() => {
    if (!data) return;
    if (activeGroup && !groupMap.has(activeGroup)) setActiveGroup(null);
    if (selectedId && !studios.some((studio) => studio.id === selectedId)) setSelectedId(null);
  }, [data, activeGroup, groupMap, selectedId, studios]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return studios.filter((studio) => {
      if (activeGroup && studio.group !== activeGroup) return false;
      if (verifiedOnly && !isVerified(studio)) return false;
      if (hasContactOnly && !hasContact(studio)) return false;
      if (needle) {
        const info = groupInfo(groupMap, studio);
        const haystack =
          `${studio.name} ${studio.category} ${info.label} ${studio.address} ${studio.city} ${studio.sourceKeyword}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [studios, activeGroup, verifiedOnly, hasContactOnly, query, groupMap]);

  const selectedStudio = selectedId ? studios.find((studio) => studio.id === selectedId) : null;

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeGroup) next.set('group', activeGroup);
    if (selectedId) next.set('studio', selectedId);
    if (verifiedOnly) next.set('verified', '1');
    if (hasContactOnly) next.set('contact', '1');
    if (query.trim()) next.set('q', query.trim());
    const search = next.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
  }, [activeGroup, selectedId, verifiedOnly, hasContactOnly, query]);

  const handleGroupChange = useCallback((group) => {
    setActiveGroup(group);
    setSelectedId(null);
  }, []);

  const handleVerifiedChange = useCallback((value) => {
    setVerifiedOnly(value);
    setSelectedId(null);
  }, []);

  const handleContactChange = useCallback((value) => {
    setHasContactOnly(value);
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((studio) => {
    setSelectedId(studio.id);
    setSheetOpen(false);
  }, []);

  const handleMapSelect = useCallback((id) => {
    setSelectedId(id);
  }, []);

  if (loading) return <LoadingMap />;

  if (error) {
    return (
      <div className="min-h-dvh">
        <header className="flex h-14 items-center border-b px-4">
          <Brand compact />
        </header>
        <div className="container max-w-xl py-20">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data direktori tidak dapat dimuat</AlertTitle>
            <AlertDescription className="mt-2">
              Periksa koneksi lalu muat ulang halaman.
              <Button variant="outline" size="sm" className="ml-3" onClick={() => window.location.reload()}>
                <RefreshCw /> Muat ulang
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const activeGroupLabel = activeGroup ? groupMap.get(activeGroup)?.label : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Buka panel direktori">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[min(92vw,390px)] flex-col p-0">
            <SheetHeader className="flex h-14 shrink-0 flex-row items-center space-y-0 border-b px-4 pr-12">
              <SheetTitle className="text-sm">Direktori studio</SheetTitle>
              <SheetDescription className="sr-only">
                Cari dan filter studio desain Surabaya.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1">
              <DirectorySidebar
                studios={studios}
                groups={groups}
                filtered={filtered}
                activeGroup={activeGroup}
                onGroupChange={handleGroupChange}
                query={query}
                onQueryChange={setQuery}
                verifiedOnly={verifiedOnly}
                onVerifiedChange={handleVerifiedChange}
                hasContactOnly={hasContactOnly}
                onContactChange={handleContactChange}
                selectedId={selectedId}
                onSelect={handleSelect}
                minYears={minYears}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Brand compact />

        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
            {filtered.length} tampil
          </Badge>
          <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex">
            <a href="privacy.html">Privasi</a>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <a href="index.html">
              Beranda <ArrowUpRight />
            </a>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[380px] shrink-0 border-r lg:block">
          <DirectorySidebar
            studios={studios}
            groups={groups}
            filtered={filtered}
            activeGroup={activeGroup}
            onGroupChange={handleGroupChange}
            query={query}
            onQueryChange={setQuery}
            verifiedOnly={verifiedOnly}
            onVerifiedChange={handleVerifiedChange}
            hasContactOnly={hasContactOnly}
            onContactChange={handleContactChange}
            selectedId={selectedId}
            onSelect={handleSelect}
            minYears={minYears}
          />
        </aside>

        <main id="main" className="relative min-w-0 flex-1">
          <MapCanvas
            studios={filtered}
            groups={groups}
            selectedStudio={selectedStudio}
            onSelect={handleMapSelect}
          />
          <div className="pointer-events-none absolute left-4 top-4 z-10 hidden sm:block">
            <div className="rounded-full border bg-background/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
              <span className="font-medium">{filtered.length}</span> studio
              {activeGroupLabel ? <span className="text-muted-foreground"> · {activeGroupLabel}</span> : null}
            </div>
          </div>
        </main>
      </div>

      <StudioDialog
        studio={selectedStudio}
        groups={groupMap}
        minYears={minYears}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}
