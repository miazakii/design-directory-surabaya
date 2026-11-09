import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/directory';

export function SiteFooter({ generatedAt }) {
  return (
    <footer className="border-t bg-background">
      <div className="container py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-tight">Design Directory Surabaya</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Referensi terbuka untuk memetakan studio, agensi, dan praktisi desain di Surabaya.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a className="transition-colors hover:text-foreground" href="map.html">
              Peta
            </a>
            <a className="transition-colors hover:text-foreground" href="privacy.html">
              Privasi &amp; disclaimer
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="https://github.com/miazakii/design-directory-surabaya"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
        <Separator className="my-6" />
        <p className="text-xs text-muted-foreground">
          Data {generatedAt ? `diperbarui ${formatDate(generatedAt)}` : 'terbuka'} · Status usia adalah
          estimasi batas bawah, bukan tanggal berdiri resmi.
        </p>
      </div>
    </footer>
  );
}
