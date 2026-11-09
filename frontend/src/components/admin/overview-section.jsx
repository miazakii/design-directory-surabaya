import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Copy,
  Files,
  Layers3,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

function Stat({ label, value, icon: Icon, hint }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewSection({
  data,
  content,
  status,
  duplicates,
  review,
  completeness,
  onNavigate,
  onSelectStudio,
  onRefresh,
  loading,
}) {
  const verified = data.studios.filter(
    (studio) => studio.ageStatusCode === 'verified' || String(studio.ageStatus || '').startsWith('Usia terverifikasi'),
  ).length;
  const needsReview = data.studios.filter((studio) => studio.needsReview).length;
  const avgScore = completeness.length
    ? Math.round((completeness.reduce((sum, entry) => sum + entry.score, 0) / completeness.length) * 10) / 10
    : 0;
  const incomplete = [...completeness].sort((a, b) => a.score - b.score).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Studio terpetakan" value={data.studios.length} icon={Files} />
        <Stat label="Kategori" value={data.groups.length} icon={Layers3} />
        <Stat label="Usia terverifikasi" value={verified} icon={BadgeCheck} hint={`minimal ${data.minYears || 2} tahun`} />
        <Stat label="Perlu cek manual" value={needsReview} icon={ShieldAlert} hint="usia belum terverifikasi" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Kualitas data</CardTitle>
              <CardDescription>Rata-rata kelengkapan field penting: {avgScore}/10.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onRefresh} disabled={loading}>
              <RefreshCw /> Segarkan
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={avgScore * 10} />
            <div className="space-y-2">
              {incomplete.map(({ studio, score, missing }) => (
                <button
                  key={studio.id}
                  type="button"
                  onClick={() => onSelectStudio(studio.id)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{studio.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      Kurang: {missing.slice(0, 3).join(', ') || '—'}
                    </p>
                  </div>
                  <Badge variant={score < 5 ? 'warning' : 'outline'} className="shrink-0 rounded-full">
                    {score}/10
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kesiapan publikasi</CardTitle>
            <CardDescription>Status draft dan repo lokal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
              <span className="text-muted-foreground">Draft dashboard</span>
              <Badge variant={status?.drafts?.directory || status?.drafts?.content ? 'warning' : 'secondary'} className="rounded-full">
                {status?.drafts?.directory || status?.drafts?.content ? 'Ada draft' : 'Tidak ada'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
              <span className="text-muted-foreground">Perubahan belum di-commit</span>
              <Badge variant={status?.dirty ? 'warning' : 'secondary'} className="rounded-full">
                {status?.dirty ? 'Ada' : 'Bersih'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
              <span className="text-muted-foreground">Commit data terakhir</span>
              <span className="max-w-[18ch] truncate text-xs">{status?.lastCommit?.subject || '—'}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" className="rounded-full" onClick={() => onNavigate('content')}>
                Edit konten <ArrowRight />
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onNavigate('history')}>
                Riwayat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kemungkinan duplikat</CardTitle>
            <CardDescription>{duplicates.length ? `${duplicates.length} kelompok perlu ditinjau.` : 'Tidak ada duplikat terdeteksi.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {duplicates.length ? (
              duplicates.map((group, index) => (
                <div key={index} className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{group.studios.map((studio) => studio.name).join(' & ')}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Alasan: {group.reasons.join(', ') || 'perlu dicek'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.studios.map((studio) => (
                      <Button key={studio.id} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => onSelectStudio(studio.id)}>
                        {studio.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Semua bersih. Tetap cek berkala setelah impor data baru.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
            <CardDescription>{review.length} studio punya setidaknya satu alasan untuk ditinjau.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {review.slice(0, 8).map(({ studio, reasons }) => (
              <button
                key={studio.id}
                type="button"
                className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent"
                onClick={() => onSelectStudio(studio.id)}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{studio.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{reasons.join(' · ')}</p>
                </div>
              </button>
            ))}
            {review.length > 8 ? (
              <Button type="button" variant="ghost" size="sm" className="w-full rounded-full" onClick={() => onNavigate('studios')}>
                Lihat semua di Studio <Sparkles />
              </Button>
            ) : null}
            {!review.length ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Review queue kosong.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konten aktif</CardTitle>
          <CardDescription>Ringkasan konten yang sedang dipakai website.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Judul hero</p>
            <p className="mt-1 font-medium">{content.landing.hero.title} {content.landing.hero.highlight}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">SEO beranda</p>
            <p className="mt-1 line-clamp-2">{content.seo.home.description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
