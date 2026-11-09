import { BadgeCheck, Phone, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  groupInfo,
  groupMap as buildGroupMap,
  hasContact,
  isVerified,
  ratingText,
  safeColor,
} from '@/lib/directory';
import { cn } from '@/lib/utils';

function FilterChip({ active, color, label, count, onClick }) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="h-8 shrink-0 rounded-full px-3 text-xs"
      aria-pressed={active}
      onClick={onClick}
    >
      {color ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: safeColor(color) }}
          aria-hidden="true"
        />
      ) : null}
      {label}
      <span className={cn('tabular-nums', active ? 'text-primary-foreground/65' : 'text-muted-foreground')}>
        {count}
      </span>
    </Button>
  );
}

function StudioListItem({ studio, groups, active, onSelect }) {
  const info = groupInfo(groups, studio);
  const rating = ratingText(studio);

  return (
    <button
      type="button"
      onClick={() => onSelect(studio)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group w-full rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:bg-accent/70',
        active && 'border-border bg-accent/80',
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: safeColor(info.color) }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{studio.name}</span>
        {studio.needsReview ? (
          <span className="text-[10px] font-semibold text-amber-700" title="Perlu verifikasi manual">
            ⚠
          </span>
        ) : null}
        {studio.outsideSurabaya ? (
          <span className="text-[10px] font-semibold text-destructive" title="Di luar Surabaya">
            ↗
          </span>
        ) : null}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-[18px] text-[11px] text-muted-foreground">
        <span className="truncate">{info.label}</span>
        {rating ? <span>★ {rating}</span> : null}
        {studio.foundedYear ? <span>Est. {studio.foundedYear}</span> : null}
      </span>
      <span className="mt-1 block truncate pl-[18px] text-xs text-muted-foreground/85">
        {studio.address || 'Alamat belum tersedia'}
      </span>
    </button>
  );
}

export function DirectorySidebar({
  studios,
  groups,
  filtered,
  activeGroup,
  onGroupChange,
  query,
  onQueryChange,
  verifiedOnly,
  onVerifiedChange,
  hasContactOnly,
  onContactChange,
  selectedId,
  onSelect,
  minYears,
}) {
  const groupMap = buildGroupMap(groups);
  const counts = new Map();
  for (const studio of studios) counts.set(studio.group, (counts.get(studio.group) || 0) + 1);

  const verifiedCount = studios.filter(isVerified).length;
  const contactCount = studios.filter(hasContact).length;
  const hasFilters = Boolean(activeGroup || query || verifiedOnly || hasContactOnly);

  const reset = () => {
    onGroupChange(null);
    onQueryChange('');
    onVerifiedChange(false);
    onContactChange(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari nama, kategori, alamat…"
            aria-label="Cari studio"
            className="h-10 pl-9 pr-9"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={!activeGroup}
            label="Semua"
            count={studios.length}
            onClick={() => onGroupChange(null)}
          />
          {groups.map((group) => (
            <FilterChip
              key={group.key}
              active={activeGroup === group.key}
              color={group.color}
              label={group.label}
              count={counts.get(group.key) || 0}
              onClick={() => onGroupChange(activeGroup === group.key ? null : group.key)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={verifiedOnly ? 'default' : 'outline'}
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
            aria-pressed={verifiedOnly}
            onClick={() => onVerifiedChange(!verifiedOnly)}
          >
            <BadgeCheck />
            Terverifikasi
            <span className="tabular-nums opacity-65">{verifiedCount}</span>
          </Button>
          <Button
            type="button"
            variant={hasContactOnly ? 'default' : 'outline'}
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
            aria-pressed={hasContactOnly}
            onClick={() => onContactChange(!hasContactOnly)}
          >
            <Phone />
            Punya kontak
            <span className="tabular-nums opacity-65">{contactCount}</span>
          </Button>
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-2 text-xs" onClick={reset}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Menampilkan <span className="font-medium text-foreground">{filtered.length}</span> dari{' '}
          {studios.length} studio
        </p>
        <Badge variant="outline" className="gap-1 rounded-full text-[10px] font-medium">
          <SlidersHorizontal className="h-3 w-3" />
          {minYears}+ thn
        </Badge>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-2">
          {filtered.length ? (
            filtered.map((studio) => (
              <StudioListItem
                key={studio.id}
                studio={studio}
                groups={groupMap}
                active={selectedId === studio.id}
                onSelect={onSelect}
              />
            ))
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm font-medium">Tidak ada studio yang cocok.</p>
              <p className="mt-1 text-xs text-muted-foreground">Coba ubah pencarian atau filter.</p>
              {hasFilters ? (
                <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={reset}>
                  Reset filter
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        <a className="transition-colors hover:text-foreground" href="privacy.html">
          Privasi &amp; disclaimer
        </a>
      </div>
    </div>
  );
}
