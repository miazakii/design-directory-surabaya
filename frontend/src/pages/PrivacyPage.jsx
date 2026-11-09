import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const sections = [
  {
    title: 'Sumber & akurasi data',
    paragraphs: [
      'Data dalam direktori ini dikumpulkan dari halaman publik Google Maps (nama, kategori, alamat, kontak, rating, jam buka, dan koordinat) serta estimasi usia dari sinyal publik seperti arsip web, tanggal registrasi domain, copyright situs, dan review tertua.',
      'Estimasi usia adalah batas bawah aktivitas, bukan tanggal berdiri resmi. Baris berstatus "Perlu cek manual" atau "Tidak dapat dipastikan" belum terverifikasi dan ditampilkan dengan penanda khusus.',
    ],
  },
  {
    title: 'Informasi yang ditampilkan',
    paragraphs: [
      'Kami menampilkan informasi usaha untuk keperluan referensi B2B: nama usaha, kategori, alamat, telepon, website, email, akun media sosial, rating, jam buka, dan estimasi tahun berdiri.',
      'Kami tidak mengumpulkan atau menampilkan data anak, data keuangan pribadi, dokumen identitas, maupun data pribadi sensitif lainnya.',
    ],
  },
  {
    title: 'Layanan pihak ketiga',
    paragraphs: [
      'Peta memuat tile dari OpenFreeMap dan data peta OpenStreetMap. Permintaan teknis ke layanan tersebut dapat memproses alamat IP dan informasi perangkat sesuai kebijakan penyedia.',
      'Font, skrip, dan aset antarmuka disajikan dari domain direktori ini. Tidak ada Google Fonts atau CDN eksternal untuk aset UI.',
    ],
  },
  {
    title: 'Dasar privasi',
    paragraphs: [
      'Pemrosesan informasi mengikuti Undang-Undang Pelindungan Data Pribadi No. 27 Tahun 2022 (UU PDP). Tampil di direktori ini tidak berarti usaha atau orang tersebut adalah klien, mitra, atau sponsor penyelenggara.',
    ],
  },
  {
    title: 'Hak Anda',
    paragraphs: [
      'Anda dapat meminta koreksi, pembatasan, penghapusan, atau keberatan atas informasi Anda kapan saja. Permintaan akan kami proses tanpa biaya.',
    ],
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur" />

      <main id="main">
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-grid opacity-45" aria-hidden="true" />
          <div className="absolute inset-0 bg-hero-glow" aria-hidden="true" />
          <div className="container relative max-w-4xl py-16 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Transparansi
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Privasi &amp; disclaimer
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Direktori ini adalah referensi terbuka. Kami berusaha menampilkan data yang berguna
              sekaligus jujur tentang batasannya.
            </p>
          </div>
        </section>

        <div className="container max-w-4xl py-12">
          <Alert className="mb-8 bg-card">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Prinsip kami</AlertTitle>
            <AlertDescription className="mt-1 leading-relaxed">
              Lebih baik menampilkan data yang belum pasti dengan label jelas daripada menghapusnya
              diam-diam atau membuatnya terlihat lebih pasti dari yang sebenarnya.
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-8">
                {sections.map((section, index) => (
                  <section key={section.title}>
                    <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
                    <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    {index < sections.length - 1 ? <Separator className="mt-8" /> : null}
                  </section>
                ))}

                <Separator />

                <section>
                  <h2 className="text-lg font-semibold tracking-tight">Kontak</h2>
                  <div className="mt-2 space-y-4 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      Untuk koreksi atau penghapusan data, ajukan melalui formulir koreksi data.
                      Sertakan nama studio dan detail perubahan. Kami akan menindaklanjuti melalui
                      GitHub.
                    </p>
                    <p>
                      Jika permintaan bersifat sensitif, jangan cantumkan data pribadi di issue
                      publik. Tulis bahwa Anda ingin dihubungi secara privat, lalu kami akan mengatur
                      jalur komunikasi yang sesuai.
                    </p>
                    <Button asChild className="rounded-full">
                      <a
                        href="https://github.com/miazakii/design-directory-surabaya/issues/new?template=koreksi-data.yml"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ajukan koreksi data <ArrowUpRight />
                      </a>
                    </Button>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
