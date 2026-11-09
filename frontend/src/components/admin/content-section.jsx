import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

function Field({ label, value, onChange, hint, multiline = false, rows = 3 }) {
  const Control = multiline ? Textarea : Input;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Control
        value={value ?? ''}
        rows={multiline ? rows : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function LinkEditor({ link, path, onChange, onRemove }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end">
      <Field label="Label" value={link.label} onChange={(value) => onChange(`${path}.label`, value)} />
      <Field label="Href" value={link.href} onChange={(value) => onChange(`${path}.href`, value)} />
      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Hapus tautan">
        <Trash2 />
      </Button>
    </div>
  );
}

export function ContentSection({ content, onChange }) {
  const update = onChange;
  const addLink = (path) => {
    const current = path.split('.').reduce((value, key) => value?.[key], content) || [];
    update(path, [...current, { label: 'Tautan baru', href: 'index.html' }]);
  };
  const removeFrom = (path, index) => {
    const current = path.split('.').reduce((value, key) => value?.[key], content) || [];
    update(path, current.filter((_, itemIndex) => itemIndex !== index));
  };
  const addPoint = () => update('landing.about.points', [...content.landing.about.points, { title: 'Poin baru', text: 'Deskripsi poin.' }]);
  const addPrivacySection = () =>
    update('privacy.sections', [...content.privacy.sections, { title: 'Bagian baru', paragraphs: ['Tulis paragraf di sini.'] }]);

  return (
    <Tabs defaultValue="landing" className="space-y-4">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="landing">Landing</TabsTrigger>
        <TabsTrigger value="identity">Identitas & navigasi</TabsTrigger>
        <TabsTrigger value="privacy">Privasi</TabsTrigger>
        <TabsTrigger value="footer">Footer</TabsTrigger>
      </TabsList>

      <TabsContent value="landing" className="mt-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Hero landing</CardTitle>
            <CardDescription>Judul utama, deskripsi, dan tombol aksi di atas lipatan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Kicker" value={content.landing.hero.kicker} onChange={(value) => update('landing.hero.kicker', value)} />
            <Field label="Highlight" value={content.landing.hero.highlight} onChange={(value) => update('landing.hero.highlight', value)} />
            <div className="sm:col-span-2">
              <Field label="Judul" value={content.landing.hero.title} onChange={(value) => update('landing.hero.title', value)} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Deskripsi" value={content.landing.hero.description} multiline rows={4} onChange={(value) => update('landing.hero.description', value)} />
            </div>
            <Field label="Tombol utama — label" value={content.landing.hero.primary.label} onChange={(value) => update('landing.hero.primary.label', value)} />
            <Field label="Tombol utama — href" value={content.landing.hero.primary.href} onChange={(value) => update('landing.hero.primary.href', value)} />
            <Field label="Tombol sekunder — label" value={content.landing.hero.secondary.label} onChange={(value) => update('landing.hero.secondary.label', value)} />
            <Field label="Tombol sekunder — href" value={content.landing.hero.secondary.href} onChange={(value) => update('landing.hero.secondary.href', value)} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Snapshot</CardTitle>
              <CardDescription>Kartu ringkasan di sisi kanan hero.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Eyebrow" value={content.landing.snapshot.eyebrow} onChange={(value) => update('landing.snapshot.eyebrow', value)} />
              <Field label="Judul" value={content.landing.snapshot.title} onChange={(value) => update('landing.snapshot.title', value)} />
              <Field label="Catatan" value={content.landing.snapshot.note} multiline rows={4} onChange={(value) => update('landing.snapshot.note', value)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kategori</CardTitle>
              <CardDescription>Judul bagian kategori di landing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Eyebrow" value={content.landing.categories.eyebrow} onChange={(value) => update('landing.categories.eyebrow', value)} />
              <Field label="Judul" value={content.landing.categories.title} onChange={(value) => update('landing.categories.title', value)} />
              <Field label="Deskripsi" value={content.landing.categories.description} multiline rows={3} onChange={(value) => update('landing.categories.description', value)} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Tentang direktori</CardTitle>
              <CardDescription>Narasi dan tiga poin pendukung.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addPoint}>
              <Plus /> Tambah poin
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Eyebrow" value={content.landing.about.eyebrow} onChange={(value) => update('landing.about.eyebrow', value)} />
              <Field label="Judul" value={content.landing.about.title} onChange={(value) => update('landing.about.title', value)} />
            </div>
            <Field label="Body" value={content.landing.about.body} multiline rows={4} onChange={(value) => update('landing.about.body', value)} />
            <div className="grid gap-3">
              {content.landing.about.points.map((point, index) => (
                <div key={index} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                  <Field label="Judul poin" value={point.title} onChange={(value) => update(`landing.about.points.${index}.title`, value)} />
                  <Field label="Teks" value={point.text} onChange={(value) => update(`landing.about.points.${index}.text`, value)} />
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeFrom('landing.about.points', index)} aria-label="Hapus poin">
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Eyebrow catatan" value={content.landing.notes.eyebrow} onChange={(value) => update('landing.notes.eyebrow', value)} />
              <Field label="Judul catatan" value={content.landing.notes.title} onChange={(value) => update('landing.notes.title', value)} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="identity" className="mt-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Identitas situs</CardTitle>
            <CardDescription>Dipakai di header, footer, metadata, dan halaman SEO.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama situs" value={content.site.name} onChange={(value) => update('site.name', value)} />
            <Field label="Nama pendek" value={content.site.shortName} onChange={(value) => update('site.shortName', value)} />
            <Field label="Aksen brand" value={content.site.accent} onChange={(value) => update('site.accent', value)} />
            <Field label="Tagline" value={content.site.tagline} onChange={(value) => update('site.tagline', value)} />
            <div className="sm:col-span-2">
              <Field label="Deskripsi" value={content.site.description} multiline rows={3} onChange={(value) => update('site.description', value)} />
            </div>
            <Field label="URL situs" value={content.site.url} onChange={(value) => update('site.url', value)} />
            <Field label="URL GitHub" value={content.site.github} onChange={(value) => update('site.github', value)} />
            <div className="sm:col-span-2">
              <Field label="URL formulir koreksi" value={content.site.issueUrl} onChange={(value) => update('site.issueUrl', value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Navigasi</CardTitle>
              <CardDescription>Tautan di header desktop dan menu seluler.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addLink('navigation')}>
              <Plus /> Tambah
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {content.navigation.map((link, index) => (
              <LinkEditor
                key={index}
                link={link}
                path={`navigation.${index}`}
                onChange={update}
                onRemove={() => removeFrom('navigation', index)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CTA header</CardTitle>
            <CardDescription>Tombol utama di kanan navigasi.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" value={content.cta.label} onChange={(value) => update('cta.label', value)} />
            <Field label="Href" value={content.cta.href} onChange={(value) => update('cta.href', value)} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="privacy" className="mt-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Hero privasi</CardTitle>
            <CardDescription>Judul, intro, dan prinsip utama halaman privasi.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow" value={content.privacy.eyebrow} onChange={(value) => update('privacy.eyebrow', value)} />
            <Field label="Judul" value={content.privacy.title} onChange={(value) => update('privacy.title', value)} />
            <div className="sm:col-span-2">
              <Field label="Intro" value={content.privacy.intro} multiline rows={3} onChange={(value) => update('privacy.intro', value)} />
            </div>
            <Field label="Judul prinsip" value={content.privacy.principleTitle} onChange={(value) => update('privacy.principleTitle', value)} />
            <Field label="Isi prinsip" value={content.privacy.principleBody} onChange={(value) => update('privacy.principleBody', value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Bagian privasi</CardTitle>
              <CardDescription>Satu paragraf per baris di dalam textarea.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addPrivacySection}>
              <Plus /> Tambah bagian
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.privacy.sections.map((section, index) => (
              <div key={index} className="space-y-2 rounded-lg border bg-background p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label={`Judul bagian ${index + 1}`} value={section.title} onChange={(value) => update(`privacy.sections.${index}.title`, value)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeFrom('privacy.sections', index)} aria-label="Hapus bagian">
                    <Trash2 />
                  </Button>
                </div>
                <Field
                  label="Paragraf"
                  value={(section.paragraphs || []).join('\n')}
                  multiline
                  rows={4}
                  onChange={(value) => update(`privacy.sections.${index}.paragraphs`, value.split('\n'))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kontak privasi</CardTitle>
            <CardDescription>Ajakan koreksi data dan catatan permintaan sensitif.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Judul" value={content.privacy.contact.title} onChange={(value) => update('privacy.contact.title', value)} />
            <Field label="Body" value={content.privacy.contact.body} multiline rows={3} onChange={(value) => update('privacy.contact.body', value)} />
            <Field label="Catatan sensitif" value={content.privacy.contact.sensitive} multiline rows={3} onChange={(value) => update('privacy.contact.sensitive', value)} />
            <Field label="Label tombol" value={content.privacy.contact.ctaLabel} onChange={(value) => update('privacy.contact.ctaLabel', value)} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="footer" className="mt-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Footer</CardTitle>
            <CardDescription>Teks dan tautan di bagian bawah semua halaman.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Teks footer" value={content.footer.text} onChange={(value) => update('footer.text', value)} />
            <Field label="Deskripsi" value={content.footer.description} multiline rows={3} onChange={(value) => update('footer.description', value)} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Tautan footer</p>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addLink('footer.links')}>
                <Plus /> Tambah
              </Button>
            </div>
            <div className="space-y-2">
              {content.footer.links.map((link, index) => (
                <LinkEditor
                  key={index}
                  link={link}
                  path={`footer.links.${index}`}
                  onChange={update}
                  onRemove={() => removeFrom('footer.links', index)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
