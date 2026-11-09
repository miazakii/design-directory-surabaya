import * as maplibregl from '../vendor/maplibre/maplibre-gl.mjs';

(async () => {
  const mapEl = document.getElementById('map');
  const searchEl = document.getElementById('search');
  const filtersEl = document.getElementById('filters');
  const quickFiltersEl = document.getElementById('quick-filters');
  const countEl = document.getElementById('count');
  const listEl = document.getElementById('list');
  const dialog = document.getElementById('dialog');
  const dialogClose = document.getElementById('dialog-close');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogBadges = document.getElementById('dialog-badges');
  const dialogBody = document.getElementById('dialog-body');
  const openSidebar = document.getElementById('open-sidebar');
  const closeSidebar = document.getElementById('close-sidebar');

  function showLoadError(error) {
    const message = 'Data direktori tidak dapat dimuat. Periksa koneksi lalu muat ulang halaman.';
    if (countEl) countEl.textContent = 'Gagal memuat data.';
    if (listEl) listEl.innerHTML = `<div class="list-empty">${message}</div>`;
    console.error(error);
  }

  let json;
  try {
    const res = await fetch('data/directory.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    json = await res.json();
  } catch (error) {
    showLoadError(error);
    return;
  }

  const studios = Array.isArray(json.studios) ? json.studios : [];
  const groups = Array.isArray(json.groups) ? json.groups : [];
  const minYears = Number(json.minYears) || 2;

  const groupByKey = new Map(groups.map((group) => [group.key, group]));
  const fallbackGroup = { key: 'other', label: 'Lainnya', color: '#8D99AE' };
  const groupInfo = (studio) => groupByKey.get(studio.group) || fallbackGroup;

  const params = new URLSearchParams(window.location.search);
  const initialGroup = params.get('group');
  const initialStudioId = params.get('studio');
  const initialStudio = initialStudioId
    ? studios.find((studio) => studio.id === initialStudioId)
    : null;

  let activeGroup = null;
  let query = '';
  let verifiedOnly = params.get('verified') === '1';
  let hasContactOnly = params.get('contact') === '1';
  let currentStudioId = initialStudio ? initialStudio.id : null;

  if (groups.some((group) => group.key === initialGroup)) {
    activeGroup = initialGroup;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#8D99AE';
  }

  function safeUrl(url) {
    if (!url) return '#';
    const trimmed = String(url).trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
    return '#';
  }

  function isVerified(studio) {
    return (
      studio.ageStatusCode === 'verified' ||
      String(studio.ageStatus || '').startsWith('Usia terverifikasi')
    );
  }

  function hasContact(studio) {
    return Boolean(
      studio.phone ||
        studio.website ||
        studio.instagram ||
        studio.facebook ||
        studio.linkedin ||
        studio.youtube ||
        (Array.isArray(studio.emails) && studio.emails.length > 0),
    );
  }

  const hasCoords = (studio) => studio.latitude != null && studio.longitude != null;

  function toFeature(studio) {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(studio.longitude), Number(studio.latitude)] },
      properties: {
        id: studio.id,
        name: studio.name || '',
        color: safeColor(groupInfo(studio).color),
        groupLabel: groupInfo(studio).label,
      },
    };
  }

  let map = null;
  let hoverPopup = null;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  try {
    if (!maplibregl.Map) throw new Error('MapLibre tidak tersedia.');
    map = new maplibregl.Map({
      container: mapEl,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [112.745, -7.275],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://openfreemap.org">OpenFreeMap</a>',
      }),
      'bottom-right',
    );

    hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
  } catch (error) {
    console.error(error);
    if (mapEl) {
      mapEl.innerHTML =
        '<div class="list-empty" style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;">Peta tidak dapat dimuat. Daftar studio tetap bisa digunakan.</div>';
    }
    map = null;
    hoverPopup = null;
  }

  function moveMap(center, zoom, mode = 'fly') {
    if (!map) return;
    if (prefersReducedMotion) {
      map.jumpTo({ center, zoom });
    } else if (mode === 'ease') {
      map.easeTo({ center, zoom });
    } else {
      map.flyTo({ center, zoom });
    }
  }

  function matches(studio) {
    if (activeGroup && studio.group !== activeGroup) return false;
    if (verifiedOnly && !isVerified(studio)) return false;
    if (hasContactOnly && !hasContact(studio)) return false;
    if (query) {
      const hay = `${studio.name} ${studio.category} ${groupInfo(studio).label} ${studio.address} ${studio.city} ${studio.sourceKeyword}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }

  function visibleStudios() {
    return studios.filter(matches);
  }

  function featureCollection() {
    return {
      type: 'FeatureCollection',
      features: visibleStudios().filter(hasCoords).map(toFeature),
    };
  }

  function updateMapData() {
    if (!map) return;
    const source = map.getSource('studios');
    if (source) source.setData(featureCollection());
  }

  function syncUrl() {
    const next = new URLSearchParams(window.location.search);
    if (activeGroup) next.set('group', activeGroup);
    else next.delete('group');
    if (currentStudioId) next.set('studio', currentStudioId);
    else next.delete('studio');
    if (verifiedOnly) next.set('verified', '1');
    else next.delete('verified');
    if (hasContactOnly) next.set('contact', '1');
    else next.delete('contact');

    const queryString = next.toString();
    history.replaceState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
  }

  if (map) {
    map.on('load', () => {
      map.addSource('studios', {
        type: 'geojson',
        data: featureCollection(),
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
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 50, 27],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.92,
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
        const feature = event.features[0];
        const source = map.getSource('studios');
        if (!source) return;
        let handled = false;
        const handleZoom = (zoom) => {
          if (handled) return;
          handled = true;
          moveMap(feature.geometry.coordinates, zoom, 'ease');
        };
        // MapLibre v4 memakai callback; v6 mengembalikan Promise.
        const result = source.getClusterExpansionZoom(feature.properties.cluster_id, (error, zoom) => {
          if (!error) handleZoom(zoom);
        });
        if (result && typeof result.then === 'function') {
          result.then(handleZoom).catch(() => {});
        }
      });

      map.on('click', 'studios', (event) => {
        const feature = event.features[0];
        const studio = studios.find((entry) => entry.id === feature.properties.id);
        if (studio) openDetail(studio);
        moveMap(feature.geometry.coordinates, 15);
      });

      map.on('mouseenter', 'studios', (event) => {
        map.getCanvas().style.cursor = 'pointer';
        hoverPopup
          .setLngLat(event.features[0].geometry.coordinates)
          .setHTML(esc(event.features[0].properties.name))
          .addTo(map);
      });

      map.on('mouseleave', 'studios', () => {
        map.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      map.on('mouseenter', 'clusters', (event) => {
        map.getCanvas().style.cursor = 'pointer';
        hoverPopup
          .setLngLat(event.features[0].geometry.coordinates)
          .setHTML(`${Number(event.features[0].properties.point_count) || 0} studio`)
          .addTo(map);
      });

      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      if (initialStudio && hasCoords(initialStudio)) {
        moveMap([Number(initialStudio.longitude), Number(initialStudio.latitude)], 15);
      }
    });
  }

  function buildFilters() {
    const counts = new Map();
    studios.forEach((studio) => counts.set(studio.group, (counts.get(studio.group) || 0) + 1));

    const chips = [{ key: null, label: 'Semua', color: '#171615', count: studios.length }]
      .concat(groups.map((group) => ({ ...group, count: counts.get(group.key) || 0 })));

    filtersEl.innerHTML = chips.map((chip) => {
      const active = activeGroup === chip.key ? ' is-active' : '';
      return `<button class="chip${active}" type="button" data-group="${esc(chip.key ?? '')}" aria-pressed="${activeGroup === chip.key}">
        ${chip.color ? `<span class="dot" style="background:${safeColor(chip.color)}"></span>` : ''}${esc(chip.label)}
        <span style="color:${chip.color ? 'inherit' : '#9b948d'}">${chip.count}</span>
      </button>`;
    }).join('');
  }

  function buildQuickFilters() {
    const verifiedCount = studios.filter(isVerified).length;
    const contactCount = studios.filter(hasContact).length;

    quickFiltersEl.innerHTML = `
      <button class="quick-chip${verifiedOnly ? ' is-active' : ''}" type="button" data-filter="verified" aria-pressed="${verifiedOnly}" title="Usia terverifikasi (>= ${esc(minYears)} tahun)">
        Terverifikasi <span>${verifiedCount}</span>
      </button>
      <button class="quick-chip${hasContactOnly ? ' is-active' : ''}" type="button" data-filter="contact" aria-pressed="${hasContactOnly}">
        Punya kontak <span>${contactCount}</span>
      </button>
    `;
  }

  function ratingText(studio) {
    if (studio.rating == null || studio.rating === '') return '';
    const rating = Number(studio.rating);
    if (!Number.isFinite(rating)) return '';
    const reviews = Number.isFinite(Number(studio.reviews)) ? Number(studio.reviews) : 0;
    return `★ ${rating.toFixed(1).replace('.', ',')} (${reviews})`;
  }

  function itemHtml(studio) {
    const rating = ratingText(studio);
    const year = studio.foundedYear ? `Est. ${studio.foundedYear}` : '';
    const metaBits = [rating, year].filter(Boolean).map((text) => `<span>${esc(text)}</span>`).join('');

    return `<button class="list-item" type="button" data-id="${esc(studio.id)}">
      <div class="list-item__top">
        <span class="dot" style="background:${safeColor(groupInfo(studio).color)}"></span>
        <span class="list-item__name">${esc(studio.name)}</span>
      </div>
      <div class="list-item__meta">${metaBits}</div>
      <div class="list-item__address">${esc(studio.address || '')}</div>
    </button>`;
  }

  function renderList() {
    const filtered = visibleStudios();
    countEl.textContent = `Menampilkan ${filtered.length} dari ${studios.length} studio`;
    listEl.innerHTML = filtered.length
      ? filtered.map(itemHtml).join('')
      : '<div class="list-empty">Tidak ada studio yang cocok.</div>';
  }

  function link(url, label) {
    const href = safeUrl(url);
    if (href === '#') return '';
    return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }

  function openDetail(studio, options = {}) {
    const info = groupInfo(studio);
    const badges = [];
    badges.push(`<span class="badge"><span class="dot" style="background:${safeColor(info.color)}"></span>${esc(info.label)}</span>`);
    if (studio.needsReview) badges.push('<span class="badge badge--warn">Perlu verifikasi manual</span>');
    if (studio.outsideSurabaya) badges.push('<span class="badge badge--error">Di luar Surabaya</span>');

    dialogBadges.innerHTML = badges.join('');
    dialogTitle.textContent = studio.name;
    currentStudioId = studio.id;
    if (options.updateUrl !== false) syncUrl();

    const contactLinks = [
      studio.phone ? link(`tel:${studio.phone}`, studio.phone) : '',
      studio.website ? link(studio.website, 'Website') : '',
      studio.instagram ? link(studio.instagram, 'Instagram') : '',
      studio.facebook ? link(studio.facebook, 'Facebook') : '',
      studio.linkedin ? link(studio.linkedin, 'LinkedIn') : '',
      studio.youtube ? link(studio.youtube, 'YouTube') : '',
      studio.mapsUrl ? link(studio.mapsUrl, 'Google Maps') : '',
    ].filter(Boolean).join('');

    const emails = (studio.emails || []).length
      ? studio.emails.map((email) => `<a href="mailto:${esc(email)}">${esc(email)}</a>`).join('')
      : '';

    const hours = (studio.openingHours || []).length
      ? `<ul class="hours">${studio.openingHours.map((slot) => {
          const [day, ...rest] = String(slot).split(': ');
          const time = rest.join(': ');
          return `<li><span>${esc(day)}</span><span>${esc(time)}</span></li>`;
        }).join('')}</ul>`
      : '<p style="color:var(--muted)">Tidak tersedia.</p>';

    const age = [
      `<div class="detail-row"><dt>Status</dt><dd>${esc(studio.ageStatus || '—')}</dd></div>`,
      `<div class="detail-row"><dt>Skor keyakinan</dt><dd>${esc(studio.confidence ?? 0)}%</dd></div>`,
      studio.foundedYear ? `<div class="detail-row"><dt>Tahun berdiri</dt><dd>${esc(studio.foundedYear)}</dd></div>` : '',
      studio.ageYears != null ? `<div class="detail-row"><dt>Usia</dt><dd>${esc(String(studio.ageYears).replace('.', ','))} tahun</dd></div>` : '',
      studio.ageSummary ? `<div class="detail-row"><dt>Sinyal usia</dt><dd>${esc(studio.ageSummary)}</dd></div>` : '',
    ].filter(Boolean).join('');

    dialogBody.innerHTML = `
      <section class="detail-section">
        <h3>Ringkasan</h3>
        <div class="detail-row"><dt>Kategori</dt><dd>${esc(studio.category || info.label)}</dd></div>
        <div class="detail-row"><dt>Rating</dt><dd>${esc(ratingText(studio)) || 'Belum ada rating'}</dd></div>
      </section>

      <section class="detail-section">
        <h3>Lokasi</h3>
        <div class="detail-row"><dt>Alamat</dt><dd>${esc(studio.address || '—')}</dd></div>
        <div class="detail-row"><dt>Kota</dt><dd>${esc(studio.city || '—')}</dd></div>
        ${studio.postalCode ? `<div class="detail-row"><dt>Kode pos</dt><dd>${esc(studio.postalCode)}</dd></div>` : ''}
      </section>

      <section class="detail-section">
        <h3>Kontak</h3>
        <div class="detail-links">${contactLinks}</div>
        ${emails ? `<div class="detail-links" style="margin-top:8px">${emails}</div>` : ''}
      </section>

      <section class="detail-section">
        <h3>Jam buka</h3>
        ${hours}
      </section>

      <section class="detail-section">
        <h3>Usia & verifikasi</h3>
        ${age}
        ${studio.evidenceUrl ? `<div class="detail-links">${link(studio.evidenceUrl, 'Lihat bukti')}</div>` : ''}
      </section>
    `;

    if (!dialog.open) dialog.showModal();
  }

  filtersEl.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    const group = chip.dataset.group || null;
    activeGroup = group === activeGroup ? null : group;
    currentStudioId = null;
    buildFilters();
    renderList();
    updateMapData();
    syncUrl();
  });

  quickFiltersEl.addEventListener('click', (event) => {
    const button = event.target.closest('.quick-chip');
    if (!button) return;
    if (button.dataset.filter === 'verified') verifiedOnly = !verifiedOnly;
    if (button.dataset.filter === 'contact') hasContactOnly = !hasContactOnly;
    currentStudioId = null;
    buildQuickFilters();
    renderList();
    updateMapData();
    syncUrl();
  });

  searchEl.addEventListener('input', () => {
    query = searchEl.value.trim().toLowerCase();
    renderList();
    updateMapData();
  });

  listEl.addEventListener('click', (event) => {
    const item = event.target.closest('.list-item');
    if (!item) return;
    const studio = studios.find((entry) => entry.id === item.dataset.id);
    if (!studio) return;
    if (hasCoords(studio)) {
      moveMap([Number(studio.longitude), Number(studio.latitude)], 15);
    }
    openDetail(studio);
    if (window.innerWidth <= 860) setSidebar(false);
  });

  function closeDialog() {
    currentStudioId = null;
    syncUrl();
    dialog.close();
  }

  dialogClose.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    currentStudioId = null;
    syncUrl();
  });

  function setSidebar(open) {
    document.body.classList.toggle('sidebar-open', open);
    openSidebar.setAttribute('aria-expanded', String(open));
  }

  openSidebar.addEventListener('click', () => setSidebar(true));
  closeSidebar.addEventListener('click', () => setSidebar(false));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      setSidebar(false);
    }
  });

  buildFilters();
  buildQuickFilters();
  renderList();
  syncUrl();
  if (initialStudio) openDetail(initialStudio, { updateUrl: false });
})();
