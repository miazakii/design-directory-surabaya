import { GitCommitHorizontal, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistorySection({ commits, status, loading, onRefresh, onRestore }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Status publikasi</CardTitle>
          <CardDescription>Kondisi repo lokal dan draft yang belum dipublikasikan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Branch</p>
              <p className="mt-1 font-medium">{status?.branch || '—'}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Perubahan data</p>
              <p className="mt-1 font-medium">{status?.dirty ? 'Belum di-commit' : 'Bersih'}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Draft</p>
              <p className="mt-1 font-medium">
                {status?.drafts?.directory || status?.drafts?.content ? 'Ada draft' : 'Tidak ada'}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Ahead / behind</p>
              <p className="mt-1 font-medium">
                {status?.ahead ?? 0} / {status?.behind ?? 0}
              </p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground">Commit terakhir untuk data</p>
            <p className="mt-1 text-sm font-medium">{status?.lastCommit?.subject || 'Belum ada commit data'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status?.lastCommit
                ? `${status.lastCommit.hash} · ${status.lastCommit.author || '—'} · ${formatDateTime(status.lastCommit.date)}`
                : '—'}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Segarkan status
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat versi</CardTitle>
          <CardDescription>30 commit terakhir yang mengubah directory atau konten. Muat versi lama sebagai draft untuk ditinjau.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {commits.length ? (
              commits.map((commit) => (
                <div key={commit.hash} className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary">
                    <GitCommitHorizontal className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{commit.subject}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {commit.hash} · {commit.author || '—'} · {formatDateTime(commit.date)}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onRestore(commit.hash)}>
                    <RotateCcw /> Muat
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Riwayat hanya tersedia di admin lokal yang memiliki repo Git.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
