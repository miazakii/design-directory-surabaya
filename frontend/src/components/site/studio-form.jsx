import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FIELD_SECTIONS, ageStatusOptions, minYearsValue } from '@/lib/admin';

function FieldControl({ field, studio, data, onChange }) {
  const value = studio[field.key];
  const id = `field-${field.key}`;

  if (field.type === 'group') {
    return (
      <>
        <Label htmlFor={id}>{field.label}</Label>
        <Select value={studio.group || undefined} onValueChange={(next) => onChange(field.key, next)}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {(data.groups || []).map((group) => (
              <SelectItem key={group.key} value={group.key}>
                {group.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }

  if (field.type === 'select') {
    const selected = value || 'none';
    return (
      <>
        <Label htmlFor={id}>{field.label}</Label>
        <Select
          value={selected}
          onValueChange={(next) => onChange(field.key, next === 'none' ? '' : next)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            {ageStatusOptions('', minYearsValue(data)).map((option) => (
              <SelectItem key={option.value || 'none'} value={option.value || 'none'}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }

  if (field.type === 'switch') {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3 sm:col-span-2">
        <div>
          <Label htmlFor={id}>{field.label}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tandai jika lokasi berada di luar Kota Surabaya.
          </p>
        </div>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(field.key, checked)} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    const text = field.array ? (Array.isArray(value) ? value.join('\n') : value || '') : value || '';
    return (
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id}>{field.label}</Label>
        <Textarea
          id={id}
          rows={field.array ? 4 : 3}
          value={text}
          onChange={(event) =>
            onChange(field.key, field.array ? event.target.value.split('\n') : event.target.value)
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        type={field.type === 'number' ? 'number' : 'text'}
        value={value ?? ''}
        onChange={(event) => {
          if (field.type === 'number') {
            onChange(field.key, event.target.value === '' ? null : Number(event.target.value));
          } else {
            onChange(field.key, event.target.value);
          }
        }}
      />
    </div>
  );
}

export function StudioForm({ studio, data, onChange, onDelete }) {
  if (!studio) {
    return (
      <div className="grid min-h-[360px] place-items-center p-8 text-center">
        <div>
          <p className="text-sm font-medium">Pilih studio dari daftar</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Atau tambah studio baru untuk mulai mengisi data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">Edit studio</h2>
            <Badge variant="outline" className="rounded-full font-mono text-[10px]">
              {studio.id}
            </Badge>
            {studio.needsReview ? (
              <Badge variant="warning" className="rounded-full">
                Perlu cek manual
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Perubahan disimpan ke <code>site/data/directory.json</code>.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
          <Trash2 /> Hapus
        </Button>
      </div>

      <div className="space-y-8 p-5 sm:p-6">
        {FIELD_SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="mb-3">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  studio={studio}
                  data={data}
                  onChange={onChange}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
