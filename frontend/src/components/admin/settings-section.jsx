import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

function ToggleRow({ id, label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsSection({ content, onChange }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tampilan direktori</CardTitle>
          <CardDescription>Atur informasi yang ditampilkan di kartu dan dialog studio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            id="show-ratings"
            label="Tampilkan rating"
            description="Rating bintang dan jumlah ulasan di daftar serta dialog."
            checked={content.settings.showRatings}
            onChange={(value) => onChange('settings.showRatings', value)}
          />
          <ToggleRow
            id="show-hours"
            label="Tampilkan jam buka"
            description="Jam buka muncul di dialog detail studio."
            checked={content.settings.showOpeningHours}
            onChange={(value) => onChange('settings.showOpeningHours', value)}
          />
          <ToggleRow
            id="show-founded"
            label="Tampilkan estimasi tahun"
            description="Label “Est. tahun” di kartu studio."
            checked={content.settings.showFoundedYear}
            onChange={(value) => onChange('settings.showFoundedYear', value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peta</CardTitle>
          <CardDescription>Posisi awal dan label halaman peta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Judul halaman</Label>
            <Input value={content.map.title} onChange={(event) => onChange('map.title', event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea rows={3} value={content.map.description} onChange={(event) => onChange('map.description', event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Label tautan privasi</Label>
            <Input value={content.map.privacyLabel} onChange={(event) => onChange('map.privacyLabel', event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Longitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={content.map.defaultCenter[0]}
                onChange={(event) => onChange('map.defaultCenter.0', Number(event.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Latitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={content.map.defaultCenter[1]}
                onChange={(event) => onChange('map.defaultCenter.1', Number(event.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Zoom awal</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={content.map.defaultZoom}
              onChange={(event) => onChange('map.defaultZoom', Number(event.target.value))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
