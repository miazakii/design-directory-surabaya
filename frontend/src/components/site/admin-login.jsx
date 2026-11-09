import { Github, KeyRound, Loader2, TriangleAlert } from 'lucide-react';
import { Brand } from '@/components/site/brand';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LOCAL } from '@/lib/admin-api';

export function AdminLogin({
  loading,
  error,
  localError,
  token,
  setToken,
  owner,
  setOwner,
  repo,
  setRepo,
  onSubmit,
}) {
  const showLocalHelp = LOCAL && (!token || localError);

  return (
    <div className="min-h-dvh bg-secondary/35">
      <header className="flex h-16 items-center border-b bg-background px-4 sm:px-6">
        <Brand compact />
        <span className="ml-auto text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Admin
        </span>
      </header>

      <div className="container flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
        <div className="w-full max-w-md space-y-4">
          {showLocalHelp ? (
            <Card>
              <CardHeader>
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-secondary">
                  <KeyRound className="h-4 w-4" />
                </div>
                <CardTitle>Admin lokal</CardTitle>
                <CardDescription>
                  Halaman ini dijalankan dari server lokal dan hanya bisa dibuka dengan token.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="warning">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Token belum tersedia</AlertTitle>
                  <AlertDescription className="mt-1 leading-relaxed">
                    {localError ||
                      'Buka URL lengkap dengan #t=... yang dicetak di terminal saat `npm run admin`. Token hanya berlaku untuk sesi ini.'}
                  </AlertDescription>
                </Alert>
                <pre className="overflow-x-auto rounded-lg border bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                  npm run admin{'\n'}
                  # buka URL dengan #t=... dari terminal
                </pre>
                <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                  Muat ulang halaman
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-secondary">
                  <Github className="h-4 w-4" />
                </div>
                <CardTitle>Masuk admin</CardTitle>
                <CardDescription>
                  Gunakan GitHub Personal Access Token dengan izin <strong>Contents: Read and write</strong>.
                  Token hanya disimpan di browser selama sesi ini.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="admin-token">Token</Label>
                    <Input
                      id="admin-token"
                      type="password"
                      autoComplete="off"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="admin-owner">Owner</Label>
                      <Input
                        id="admin-owner"
                        value={owner}
                        onChange={(event) => setOwner(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-repo">Repo</Label>
                      <Input
                        id="admin-repo"
                        value={repo}
                        onChange={(event) => setRepo(event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {error ? (
                    <Alert variant="destructive">
                      <TriangleAlert className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : null}
                    {loading ? 'Memuat data…' : 'Masuk'}
                  </Button>
                </form>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Belum punya token?{' '}
                  <a
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buat di GitHub
                  </a>
                </p>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <a className="underline-offset-4 hover:text-foreground hover:underline" href="index.html">
              Kembali ke direktori
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
