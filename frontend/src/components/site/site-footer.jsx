import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/directory';

export function SiteFooter({ content, generatedAt }) {
  const footer = content?.footer || {
    text: 'Design Directory Surabaya — referensi terbuka.',
    description:
      'Referensi terbuka untuk memetakan studio, agensi, dan praktisi desain di Surabaya.',
    links: [
      { label: 'Peta', href: 'map.html' },
      { label: 'Privasi & disclaimer', href: 'privacy.html' },
      { label: 'GitHub', href: 'https://github.com/miazakii/design-directory-surabaya' },
    ],
  };
  return (
    <footer className="border-t bg-background">
      <div className="container py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-tight">{content?.site?.name || 'Design Directory Surabaya'}</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{footer.description}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {footer.links.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                className="transition-colors hover:text-foreground"
                href={link.href}
                target={/^https?:/i.test(link.href) ? '_blank' : undefined}
                rel={/^https?:/i.test(link.href) ? 'noopener noreferrer' : undefined}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <Separator className="my-6" />
        <p className="text-xs text-muted-foreground">
          {footer.text} · Data {generatedAt ? `diperbarui ${formatDate(generatedAt)}` : 'terbuka'} · Status
          usia adalah estimasi batas bawah, bukan tanggal berdiri resmi.
        </p>
      </div>
    </footer>
  );
}
