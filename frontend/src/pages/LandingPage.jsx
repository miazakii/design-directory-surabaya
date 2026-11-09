import { useMemo } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Layers3,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentMeta } from '@/hooks/use-document-meta';
import { useSiteData } from '@/hooks/use-site-data';
import { formatDate, isVerified, safeColor } from '@/lib/directory';

function StatCard({ value, label, icon: Icon }) {
  return (
    <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LandingPage() {
  const { data, content, error, loading } = useSiteData();
  const landing = content.landing;
  useDocumentMeta(content.seo.home, content.site.url);

  const studios = data?.studios ?? [];
  const groups = data?.groups ?? [];
  const verified = studios.filter(isVerified).length;
  const minYears = Number(data?.minYears) || 2;

  const groupCounts = useMemo(() => {
    const counts = new Map();
    for (const studio of studios) counts.set(studio.group, (counts.get(studio.group) || 0) + 1);
    return counts;
  }, [studios]);

  return (
    <div className="min-h-dvh">
      <SiteHeader content={content} className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur" />

      <main id="main">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-grid opacity-55" aria-hidden="true" />
          <div className="absolute inset-0 bg-hero-glow" aria-hidden="true" />
          <div className="container relative grid gap-14 py-20 lg:grid-cols-[1.08fr_0.72fr] lg:items-end lg:py-28">
            <div className="animate-fade-up">
              <Badge variant="outline" className="rounded-full bg-background/80 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {landing.hero.kicker}
              </Badge>
              <h1 className="mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                {landing.hero.title} <span className="text-brand">{landing.hero.highlight}</span>
              </h1>
              <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
                {landing.hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <a href={landing.hero.primary.href}>
                    {landing.hero.primary.label} <ArrowRight />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full bg-background/70">
                  <a href={landing.hero.secondary.href}>{landing.hero.secondary.label}</a>
                </Button>
              </div>
            </div>

            <Card className="relative overflow-hidden border-border/80 bg-card/85 shadow-soft backdrop-blur">
              <CardHeader className="border-b border-border/70 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {landing.snapshot.eyebrow}
                </p>
                <CardTitle className="text-2xl tracking-tight">{landing.snapshot.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Studio', studios.length || '—'],
                    ['Kategori', groups.length || '—'],
                    ['Terverifikasi', verified || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border bg-background/70 p-3">
                      <div className="text-xl font-semibold tracking-tight">{value}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                  <p>
                    {landing.snapshot.note}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {loading ? 'Memuat data…' : data?.generatedAt ? `Diperbarui ${formatDate(data.generatedAt)}` : 'Data terbuka'}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container relative z-10 -mt-7">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-[86px] rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive" className="bg-background shadow-sm">
              <AlertTitle>Data direktori tidak dapat dimuat</AlertTitle>
              <AlertDescription className="mt-1 flex flex-wrap items-center gap-3">
                Periksa koneksi lalu muat ulang halaman.
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  <RefreshCw /> Muat ulang
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard value={studios.length} label="Studio & agensi terpetakan" icon={MapPinned} />
              <StatCard value={groups.length} label="Kategori" icon={Layers3} />
              <StatCard
                value={verified}
                label={`Usia terverifikasi (≥ ${minYears} tahun)`}
                icon={BadgeCheck}
              />
            </div>
          )}
        </section>

        <section id="kategori" className="container scroll-mt-24 py-20 lg:py-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {landing.categories.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{landing.categories.title}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {landing.categories.description}
              </p>
            </div>
            <Button asChild variant="ghost" className="w-fit rounded-full">
              <a href="map.html">
                Semua studio <ArrowUpRight />
              </a>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[92px] rounded-xl" />
                ))
              : groups.map((group) => {
                  const count = groupCounts.get(group.key) || 0;
                  return (
                    <a
                      key={group.key}
                      href={`map.html?group=${encodeURIComponent(group.key)}`}
                      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-soft"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full ring-4 ring-background"
                          style={{ backgroundColor: safeColor(group.color) }}
                        />
                        <span className="truncate text-sm font-medium">{group.label}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </span>
                    </a>
                  );
                })}
          </div>
        </section>

        <section id="tentang" className="border-y bg-secondary/35 scroll-mt-24">
          <div className="container grid gap-12 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:py-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {landing.about.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {landing.about.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {landing.about.body}
              </p>
              <div className="mt-6 grid gap-3">
                {landing.about.points.map((item, index) => {
                  const Icon = [Search, MapPinned, ShieldCheck][index % 3] || ShieldCheck;
                  return (
                    <div key={`${item.title}-${index}`} className="flex gap-3 rounded-xl border bg-background/70 p-4">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {landing.notes.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {landing.notes.title}
              </h2>
              <div className="mt-6 grid gap-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-xl" />
                  ))
                ) : (data?.notes ?? []).length ? (
                  data.notes.map((note, index) => (
                    <Alert key={`${index}-${note}`} className="bg-background">
                      <ShieldCheck className="h-4 w-4" />
                      <AlertDescription className="leading-relaxed">{note}</AlertDescription>
                    </Alert>
                  ))
                ) : (
                  <Alert className="bg-background">
                    <AlertDescription>Belum ada catatan data.</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter content={content} generatedAt={data?.generatedAt} />
    </div>
  );
}
