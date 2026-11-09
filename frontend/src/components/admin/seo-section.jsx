import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const pageLabels = {
  home: 'Beranda',
  map: 'Peta',
  privacy: 'Privasi',
};

function CharacterCount({ value, limit }) {
  const length = String(value || '').length;
  const over = length > limit;
  return (
    <p className={`text-[11px] ${over ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
      {length}/{limit} karakter
    </p>
  );
}

function GooglePreview({ meta, siteUrl }) {
  const url = meta.canonical || siteUrl;
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary">
          <Search className="h-3 w-3" />
        </span>
        <span className="truncate">{url}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-lg font-medium leading-snug text-[#1a0dab]">
        {meta.title || 'Judul halaman'}
      </p>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {meta.description || 'Deskripsi halaman akan tampil di sini.'}
      </p>
    </div>
  );
}

function SeoPageCard({ page, meta, siteUrl, onChange }) {
  const label = pageLabels[page] || page;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>Metadata statis untuk halaman {page}.html.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label>Title</Label>
            <CharacterCount value={meta.title} limit={70} />
          </div>
          <Input value={meta.title || ''} onChange={(event) => onChange(`seo.${page}.title`, event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label>Description</Label>
            <CharacterCount value={meta.description} limit={170} />
          </div>
          <Textarea
            rows={3}
            value={meta.description || ''}
            onChange={(event) => onChange(`seo.${page}.description`, event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Canonical</Label>
            <Input value={meta.canonical || ''} onChange={(event) => onChange(`seo.${page}.canonical`, event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>OG image</Label>
            <Input value={meta.ogImage || ''} onChange={(event) => onChange(`seo.${page}.ogImage`, event.target.value)} />
          </div>
        </div>
        <GooglePreview meta={meta} siteUrl={siteUrl} />
      </CardContent>
    </Card>
  );
}

export function SeoSection({ content, onChange }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SEO & metadata</CardTitle>
          <CardDescription>
            Metadata ini ditulis ke HTML statis saat build. Preview di bawah adalah perkiraan tampilan
            hasil pencarian.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {['home', 'map', 'privacy'].map((page) => (
          <SeoPageCard
            key={page}
            page={page}
            meta={content.seo[page]}
            siteUrl={content.site.url}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
