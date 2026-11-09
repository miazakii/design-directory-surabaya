import { ArrowUpRight, Menu } from 'lucide-react';
import { Brand } from '@/components/site/brand';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function SiteHeader({ content, className }) {
  const links = content?.navigation || [
    { href: 'map.html', label: 'Peta' },
    { href: 'index.html#kategori', label: 'Kategori' },
    { href: 'index.html#tentang', label: 'Tentang' },
  ];
  const cta = content?.cta || { label: 'Buka direktori', href: 'map.html' };
  return (
    <header className={className}>
      <div className="container flex h-16 items-center justify-between gap-6">
        <Brand content={content} />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {links.map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm" className="text-muted-foreground">
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
            <a href={cta.href}>
              {cta.label} <ArrowUpRight />
            </a>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Buka menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(88vw,360px)]">
              <SheetHeader>
                <SheetTitle>
                  <Brand content={content} />
                </SheetTitle>
                <SheetDescription>{content?.site?.description || 'Direktori terbuka studio desain Surabaya.'}</SheetDescription>
              </SheetHeader>
              <nav className="mt-8 grid gap-2" aria-label="Navigasi seluler">
                {links.map((link) => (
                  <Button
                    key={link.href}
                    asChild
                    variant="ghost"
                    className="h-11 justify-start rounded-lg px-3 text-base"
                  >
                    <a href={link.href}>{link.label}</a>
                  </Button>
                ))}
                <Button asChild className="mt-3 h-11 rounded-full">
                  <a href={cta.href}>
                    {cta.label} <ArrowUpRight />
                  </a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
