import { useRef, useState } from 'react';
import { Copy, ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function fileSize(size) {
  if (size > 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function MediaSection({ files, loading, onRefresh, onUpload, onUseOg, onDelete }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      await onUpload(file);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const copy = async (url) => {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(''), 1600);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Media</CardTitle>
            <CardDescription>Gambar untuk OG image, favicon, atau aset editorial. PNG/JPEG/WebP, maksimal 5 MB.</CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onRefresh} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Muat ulang
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Unggah
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {files.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <div key={file.name} className="overflow-hidden rounded-xl border bg-background">
                  <div className="aspect-video bg-secondary/40">
                    <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium">{file.name}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {fileSize(file.size)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => copy(file.url)}>
                        <Copy /> {copied === file.url ? 'Tersalin' : 'Salin URL'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => onUseOg(file.url)}>
                        Jadikan OG
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Hapus media ${file.name}?`)) onDelete(file.name);
                        }}
                      >
                        <Trash2 /> Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Belum ada media. Unggah gambar PNG/JPEG/WebP untuk mulai.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
