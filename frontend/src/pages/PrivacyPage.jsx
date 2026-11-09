import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDocumentMeta } from '@/hooks/use-document-meta';
import { useContent } from '@/hooks/use-site-data';

export function PrivacyPage() {
  const content = useContent();
  const privacy = content.privacy;
  useDocumentMeta(content.seo.privacy, content.site.url);

  return (
    <div className="min-h-dvh">
      <SiteHeader content={content} className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur" />

      <main id="main">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-grid opacity-45" aria-hidden="true" />
          <div className="absolute inset-0 bg-hero-glow" aria-hidden="true" />
          <div className="container relative max-w-4xl py-16 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {privacy.eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              {privacy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {privacy.intro}
            </p>
          </div>
        </section>

        <div className="container max-w-4xl py-12">
          <Alert className="mb-8 bg-card">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>{privacy.principleTitle}</AlertTitle>
            <AlertDescription className="mt-1 leading-relaxed">
              {privacy.principleBody}
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-8">
                {privacy.sections.map((section, index) => (
                  <section key={`${section.title}-${index}`}>
                    <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
                    <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </div>
                    {index < privacy.sections.length - 1 ? <Separator className="mt-8" /> : null}
                  </section>
                ))}

                <Separator />

                <section>
                  <h2 className="text-lg font-semibold tracking-tight">{privacy.contact.title}</h2>
                  <div className="mt-2 space-y-4 text-sm leading-relaxed text-muted-foreground">
                    <p>{privacy.contact.body}</p>
                    {privacy.contact.sensitive ? <p>{privacy.contact.sensitive}</p> : null}
                    <Button asChild className="rounded-full">
                      <a href={content.site.issueUrl} target="_blank" rel="noopener noreferrer">
                        {privacy.contact.ctaLabel} <ArrowUpRight />
                      </a>
                    </Button>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter content={content} />
    </div>
  );
}
