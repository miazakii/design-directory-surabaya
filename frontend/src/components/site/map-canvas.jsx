import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { groupInfo, groupMap as buildGroupMap, hasCoords, safeColor } from '@/lib/directory';
import { escapeHtml } from '@/lib/utils';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const MAP_CENTER = [112.745, -7.275];
const MAP_ZOOM = 12;

function toFeature(studio, groups) {
  const info = groupInfo(groups, studio);
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [Number(studio.longitude), Number(studio.latitude)],
    },
    properties: {
      id: studio.id,
      name: studio.name || '',
      color: safeColor(info.color),
      groupLabel: info.label,
    },
  };
}

function featureCollection(studios, groups) {
  return {
    type: 'FeatureCollection',
    features: studios.filter(hasCoords).map((studio) => toFeature(studio, groups)),
  };
}

export function MapCanvas({ studios, groups, selectedStudio, onSelect, onError }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onErrorRef = useRef(onError);
  const studiosRef = useRef(studios);
  const groupsRef = useRef(groups);
  const hoverPopupRef = useRef(null);
  const [mapFailed, setMapFailed] = useState(false);

  onSelectRef.current = onSelect;
  onErrorRef.current = onError;

  const groupMap = useMemo(() => buildGroupMap(groups), [groups]);
  const data = useMemo(() => featureCollection(studios, groupMap), [studios, groupMap]);

  studiosRef.current = studios;
  groupsRef.current = groupMap;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let map;
    let cancelled = false;

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        maxZoom: 18,
        attributionControl: false,
      });
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://openfreemap.org">OpenFreeMap</a>',
        }),
        'bottom-right',
      );

      hoverPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'studio-hover-popup',
      });

      map.on('error', (event) => {
        if (loadedRef.current) return;
        console.error(event.error);
        setMapFailed(true);
        onErrorRef.current?.('Gaya peta gagal dimuat.');
      });

      map.on('load', () => {
        if (cancelled) return;
        loadedRef.current = true;
        setMapFailed(false);

        map.addSource('studios', {
          type: 'geojson',
          data: featureCollection(studiosRef.current, groupsRef.current),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'studios',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#E63946', 10, '#E76F51', 50, '#9B5DE5'],
            'circle-radius': ['step', ['get', 'point_count'], 17, 10, 22, 50, 28],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.94,
          },
        });

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'studios',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 12,
          },
          paint: { 'text-color': '#ffffff' },
        });

        map.addLayer({
          id: 'studios',
          type: 'circle',
          source: 'studios',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 7,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.on('click', 'clusters', (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const source = map.getSource('studios');
          if (!source) return;
          let handled = false;
          const zoomTo = (zoom) => {
            if (handled || typeof zoom !== 'number') return;
            handled = true;
            map.easeTo({ center: feature.geometry.coordinates, zoom });
          };
          try {
            const result = source.getClusterExpansionZoom(feature.properties.cluster_id, (error, zoom) => {
              if (!error) zoomTo(zoom);
            });
            if (result && typeof result.then === 'function') result.then(zoomTo).catch(() => {});
          } catch {
            map.easeTo({ center: feature.geometry.coordinates, zoom: Math.min(map.getZoom() + 2, 16) });
          }
        });

        map.on('click', 'studios', (event) => {
          const feature = event.features?.[0];
          if (feature?.properties?.id) onSelectRef.current?.(feature.properties.id);
        });

        map.on('mouseenter', 'studios', (event) => {
          map.getCanvas().style.cursor = 'pointer';
          const feature = event.features?.[0];
          hoverPopupRef.current
            ?.setLngLat(feature.geometry.coordinates)
            .setHTML(escapeHtml(feature.properties.name))
            .addTo(map);
        });

        map.on('mouseleave', 'studios', () => {
          map.getCanvas().style.cursor = '';
          hoverPopupRef.current?.remove();
        });

        map.on('mouseenter', 'clusters', (event) => {
          map.getCanvas().style.cursor = 'pointer';
          const feature = event.features?.[0];
          hoverPopupRef.current
            ?.setLngLat(feature.geometry.coordinates)
            .setHTML(`${Number(feature.properties.point_count) || 0} studio`)
            .addTo(map);
        });

        map.on('mouseleave', 'clusters', () => {
          map.getCanvas().style.cursor = '';
          hoverPopupRef.current?.remove();
        });

        if (selectedStudio && hasCoords(selectedStudio)) {
          map.jumpTo({
            center: [Number(selectedStudio.longitude), Number(selectedStudio.latitude)],
            zoom: 15,
          });
        }
      });
    } catch (error) {
      console.error(error);
      setMapFailed(true);
      onErrorRef.current?.('Peta tidak dapat dimuat.');
    }

    return () => {
      cancelled = true;
      loadedRef.current = false;
      hoverPopupRef.current?.remove();
      map?.remove();
      mapRef.current = null;
    };
    // Map dibuat sekali; data dan seleksi diperbarui lewat effect di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('studios');
    if (source) source.setData(data);
  }, [data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !selectedStudio || !hasCoords(selectedStudio)) return;
    const target = [Number(selectedStudio.longitude), Number(selectedStudio.latitude)];
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) map.jumpTo({ center: target, zoom: 15 });
    else map.flyTo({ center: target, zoom: 15, duration: 900 });
  }, [selectedStudio]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <div
          ref={containerRef}
          className="h-full w-full"
          role="region"
          aria-label="Peta studio desain Surabaya"
        />
      </div>
      {mapFailed ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
          <div className="pointer-events-auto max-w-sm rounded-xl border bg-background/95 p-5 text-center shadow-soft backdrop-blur">
            <p className="text-sm font-semibold">Peta tidak dapat dimuat</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Koneksi ke tile peta gagal atau WebGL tidak tersedia. Daftar studio tetap bisa
              digunakan dari panel di samping.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
