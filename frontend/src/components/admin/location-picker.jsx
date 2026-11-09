import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const DEFAULT_CENTER = [112.745, -7.275];

export function LocationPicker({ latitude, longitude, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [failed, setFailed] = useState(false);
  onChangeRef.current = onChange;

  const hasCoords = latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const center = hasCoords ? [Number(longitude), Number(latitude)] : DEFAULT_CENTER;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let map;
    let loaded = false;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center,
        zoom: hasCoords ? 14 : 12,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => {
        loaded = true;
        setFailed(false);
      });
      map.on('error', (event) => {
        if (loaded) return;
        console.error(event.error);
        setFailed(true);
      });
      map.on('click', (event) => {
        const nextLat = Number(event.lngLat.lat.toFixed(7));
        const nextLng = Number(event.lngLat.lng.toFixed(7));
        onChangeRef.current(nextLat, nextLng);
      });
      if (hasCoords) {
        markerRef.current = new maplibregl.Marker({ draggable: true, color: '#E63946' })
          .setLngLat(center)
          .addTo(map);
        markerRef.current.on('dragend', () => {
          const lngLat = markerRef.current.getLngLat();
          onChangeRef.current(Number(lngLat.lat.toFixed(7)), Number(lngLat.lng.toFixed(7)));
        });
      }
    } catch (error) {
      console.error(error);
      setFailed(true);
    }

    return () => {
      markerRef.current?.remove();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map cukup dibuat sekali; koordinat diperbarui lewat effect berikutnya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ draggable: true, color: '#E63946' }).setLngLat(center).addTo(map);
      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current.getLngLat();
        onChangeRef.current(Number(lngLat.lat.toFixed(7)), Number(lngLat.lng.toFixed(7)));
      });
    } else {
      markerRef.current.setLngLat(center);
    }
    map.easeTo({ center, duration: 400 });
  }, [latitude, longitude]);

  return (
    <div className="space-y-3 rounded-xl border bg-background p-3 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Koordinat peta</p>
          <p className="text-xs text-muted-foreground">Klik peta atau geser marker untuk mengisi latitude/longitude.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => {
            mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: 12 });
            onChangeRef.current(null, null);
          }}
        >
          <MapPin /> Reset
        </Button>
      </div>
      <div className="relative h-[220px] overflow-hidden rounded-lg border bg-secondary/30">
        <div ref={containerRef} className="h-full w-full" />
        {failed ? (
          <div className="absolute inset-0 grid place-items-center bg-background/90 p-4 text-center text-xs text-muted-foreground">
            Peta tidak dapat dimuat. Isi koordinat manual di bawah.
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Latitude</Label>
          <Input
            type="number"
            step="0.0000001"
            value={latitude ?? ''}
            onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value), longitude)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Longitude</Label>
          <Input
            type="number"
            step="0.0000001"
            value={longitude ?? ''}
            onChange={(event) => onChange(latitude, event.target.value === '' ? null : Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
