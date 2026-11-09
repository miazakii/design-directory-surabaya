import {
  ArrowUpRight,
  Clock3,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { groupInfo, ratingText, safeColor, safeUrl, studioPageUrl } from '@/lib/directory';

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <div className="mt-3 space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid gap-0.5 text-sm sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 leading-relaxed">{children}</dd>
    </div>
  );
}

function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
    >
      {children}
      <ArrowUpRight className="h-3 w-3" />
    </a>
  );
}

export function StudioDialog({ studio, groups, minYears, onOpenChange, showRatings = true, showOpeningHours = true }) {
  if (!studio) return null;
  const info = groupInfo(groups, studio);
  const rating = ratingText(studio);
  const emails = Array.isArray(studio.emails) ? studio.emails.filter(Boolean) : [];
  const hours = Array.isArray(studio.openingHours) ? studio.openingHours.filter(Boolean) : [];
  const city = String(studio.city || '').trim();
  const address = String(studio.address || '').trim();
  const addressText = [address, city && !address.toLowerCase().includes(city.toLowerCase()) ? city : '']
    .filter(Boolean)
    .join(', ');
  const mapsHref = safeUrl(studio.mapsUrl);
  const evidenceHref = safeUrl(studio.evidenceUrl);

  const contacts = [
    studio.phone && { href: `tel:${studio.phone}`, label: studio.phone, icon: Phone },
    studio.website && { href: safeUrl(studio.website), label: 'Website', icon: Globe },
    studio.instagram && { href: safeUrl(studio.instagram), label: 'Instagram', icon: Instagram },
    studio.facebook && { href: safeUrl(studio.facebook), label: 'Facebook', icon: Facebook },
    studio.linkedin && { href: safeUrl(studio.linkedin), label: 'LinkedIn', icon: Linkedin },
    studio.youtube && { href: safeUrl(studio.youtube), label: 'YouTube', icon: Youtube },
  ].filter((item) => item && item.href);

  return (
    <Dialog open={Boolean(studio)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="max-h-[92dvh] overflow-y-auto">
          <DialogHeader className="space-y-3 border-b p-6 pr-12">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="rounded-full">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: safeColor(info.color) }}
                />
                {info.label}
              </Badge>
              {studio.needsReview ? (
                <Badge variant="warning" className="rounded-full">
                  Perlu verifikasi manual
                </Badge>
              ) : null}
              {studio.outsideSurabaya ? (
                <Badge variant="destructive" className="rounded-full">
                  Di luar Surabaya
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="text-2xl tracking-[-0.03em]">{studio.name}</DialogTitle>
            <DialogDescription className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {addressText || 'Alamat belum tersedia'}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-7 p-6">
            <Section title="Ringkasan">
              <Row label="Kategori">{studio.category || info.label}</Row>
              {showRatings ? <Row label="Rating">{rating ? `★ ${rating}` : 'Belum ada rating'}</Row> : null}
              {showOpeningHours && hours.length ? (
                <Row label="Jam buka">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                    {hours[0]}
                    {hours.length > 1 ? ` (+${hours.length - 1} hari)` : ''}
                  </span>
                </Row>
              ) : null}
            </Section>

            <Separator />

            <Section title="Kontak & tautan">
              {contacts.length ? (
                <div className="flex flex-wrap gap-2">
                  {contacts.map(({ href, label, icon: Icon }) => (
                    <Button key={`${href}-${label}`} asChild variant="outline" size="sm" className="rounded-full">
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        <Icon />
                        {label}
                      </a>
                    </Button>
                  ))}
                  {emails.map((email) => (
                    <Button key={email} asChild variant="outline" size="sm" className="rounded-full">
                      <a href={`mailto:${email}`}>
                        <Mail />
                        {email}
                      </a>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada kontak digital yang tercatat.</p>
              )}
              {mapsHref ? (
                <p className="text-sm">
                  <ExternalLink href={mapsHref}>Buka di Google Maps</ExternalLink>
                </p>
              ) : null}
            </Section>

            {showOpeningHours && hours.length ? (
              <>
                <Separator />
                <Section title="Jam buka">
                  <ul className="divide-y rounded-lg border text-sm">
                    {hours.map((slot) => {
                      const [day, ...rest] = String(slot).split(': ');
                      return (
                        <li key={slot} className="flex items-center justify-between gap-4 px-3 py-2">
                          <span className="text-muted-foreground">{day}</span>
                          <span className="text-right">{rest.join(': ')}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              </>
            ) : null}

            <Separator />

            <Section title="Usia & verifikasi">
              <div className="flex items-start gap-3 rounded-lg border bg-secondary/35 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2 text-sm">
                  <Row label="Status">{studio.ageStatus || '—'}</Row>
                  <Row label="Keyakinan">{studio.confidence ?? 0}%</Row>
                  {studio.foundedYear ? <Row label="Estimasi berdiri">{studio.foundedYear}</Row> : null}
                  {studio.ageYears != null ? (
                    <Row label="Usia">{String(studio.ageYears).replace('.', ',')} tahun</Row>
                  ) : null}
                  {studio.ageSummary ? <Row label="Sinyal">{studio.ageSummary}</Row> : null}
                  <p className="text-xs text-muted-foreground">
                    Estimasi batas bawah aktivitas, bukan tanggal berdiri resmi. Minimal {minYears} tahun.
                  </p>
                </div>
              </div>
              {evidenceHref ? (
                <p className="text-sm">
                  <ExternalLink href={evidenceHref}>Lihat bukti</ExternalLink>
                </p>
              ) : null}
            </Section>
          </div>

          <DialogFooter className="border-t bg-secondary/25 p-4 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {studio.city || 'Surabaya'}
              {studio.postalCode ? ` · ${studio.postalCode}` : ''}
            </p>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={studioPageUrl(studio.id)}>
                Lihat halaman profil <ArrowUpRight />
              </a>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
