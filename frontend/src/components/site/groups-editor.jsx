import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function GroupsEditor({ data, onGroupsChange, onNotesChange, onDeleteGroup }) {
  const updateGroup = (index, key, value) => {
    onGroupsChange(data.groups.map((group, groupIndex) => (groupIndex === index ? { ...group, [key]: value } : group)));
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Kategori &amp; legend</CardTitle>
            <CardDescription className="mt-1">
              Ubah nama, warna, atau hapus kategori. Studio dari kategori yang dihapus akan dipindahkan
              ke kategori pertama saat disimpan.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => onGroupsChange([...data.groups, { key: 'kategori-baru', label: 'Kategori Baru', color: '#8D99AE' }])}
          >
            <Plus /> Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.groups.map((group, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`group-key-${index}`} className="text-xs text-muted-foreground">
                  Key
                </Label>
                <Input
                  id={`group-key-${index}`}
                  value={group.key}
                  onChange={(event) => updateGroup(index, 'key', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`group-label-${index}`} className="text-xs text-muted-foreground">
                  Label
                </Label>
                <Input
                  id={`group-label-${index}`}
                  value={group.label}
                  onChange={(event) => updateGroup(index, 'label', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`group-color-${index}`} className="text-xs text-muted-foreground">
                  Warna
                </Label>
                <input
                  id={`group-color-${index}`}
                  type="color"
                  value={group.color}
                  onChange={(event) => updateGroup(index, 'color', event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Hapus kategori ${group.label}`}
                onClick={() => onDeleteGroup(index)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catatan data</CardTitle>
          <CardDescription>Ditampilkan di landing page. Satu catatan per baris.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={7}
            value={(data.notes || []).join('\n')}
            onChange={(event) => onNotesChange(event.target.value.split('\n'))}
            placeholder="Contoh: 9 baris belum terverifikasi usia…"
          />
        </CardContent>
      </Card>
    </div>
  );
}
