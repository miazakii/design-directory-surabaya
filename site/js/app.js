(() => {
  const meta = window.DIRECTORY_META;
  const data = window.DIRECTORY_DATA || [];

  const mapEl = document.getElementById('map');
  const searchEl = document.getElementById('search');
  const filtersEl = document.getElementById('filters');
  const countEl = document.getElementById('count');
  const listEl = document.getElementById('list');
  const dialog = document.getElementById('dialog');
  const dialogClose = document.getElementById('dialog-close');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogBadges = document.getElementById('dialog-badges');
  const dialogBody = document.getElementById('dialog-body');
  const openSidebar = document.getElementById('open-sidebar');
  const closeSidebar = document.getElementById('close-sidebar');

  let activeGroup = null;
  let query = '';

  const initialGroup = new URLSearchParams(window.location.search).get('group');
  if (meta.groups.some((group) => group.key === initialGroup)) {
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

  function safeUrl(url) {
    if (!url) return '#';
    const trimmed = String(url).trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
    return '#';
  }

  const map = new maplibregl.Map({
    container: mapEl,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [112.745, -7.275],
    zoom: 12,
    attributionControl: false,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.AttributionControl({
    compact: true,
    customAttribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://openfreemap.org">OpenFreeMap</a>',
  }), 'bottom-right');

  const features = data
    .filter((studio) => studio.latitude != null && studio.longitude != null)
    .map((studio) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [studio.longitude, studio.latitude] },
      properties: {
        id: studio.id,
        name: studio.name,
        color: studio.groupColor,
        groupLabel: studio.groupLabel,
      },
    }));

  const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

  map.on('load', () => {
    map.addSource('studios', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    map.addLayer({
      id: 'studios',
      type: 'circle',
      source: 'studios',
      paint: {
        'circle-radius': 7,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.on('click', 'studios', (event) => {
      const feature = event.features[0];
      const studio = data.find((entry) => entry.id === feature.properties.id);
      if (studio) openDetail(studio);
      map.flyTo({ center: feature.geometry.coordinates, zoom: 15 });
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
  });

  function buildFilters() {
    const counts = new Map();
    data.forEach((studio) => counts.set(studio.group, (counts.get(studio.group) || 0) + 1));

    const chips = [{ key: null, label: 'Semua', color: '#171615', count: data.length }]
      .concat(meta.groups.map((group) => ({ ...group, count: counts.get(group.key) || 0 })));

    filtersEl.innerHTML = chips.map((chip) => {
      const active = activeGroup === chip.key ? ' is-active' : '';
      return `<button class="chip${active}" type="button" data-group="${esc(chip.key ?? '')}">
        ${chip.color ? `<span class="dot" style="background:${chip.color}"></span>` : ''}${esc(chip.label)}
        <span style="color:${chip.color ? 'inherit' : '#9b948d'}">${chip.count}</span>
      </button>`;
    }).join('');
  }

  function matches(studio) {
    if (activeGroup && studio.group !== activeGroup) return false;
    if (query) {
      const hay = `${studio.name} ${studio.category} ${studio.groupLabel} ${studio.address} ${studio.city} ${studio.sourceKeyword}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }

  function ratingText(studio) {
    if (studio.rating == null) return '';
    return `★ ${studio.rating.toFixed(1).replace('.', ',')} (${studio.reviews})`;
  }

  function itemHtml(studio) {
    const rating = ratingText(studio);
    const year = studio.foundedYear ? `Est. ${studio.foundedYear}` : '';
    const metaBits = [rating, year].filter(Boolean).map((text) => `<span>${esc(text)}</span>`).join('');

    return `<button class="list-item" type="button" data-id="${esc(studio.id)}">
      <div class="list-item__top">
        <span class="dot" style="background:${studio.groupColor}"></span>
        <span class="list-item__name">${esc(studio.name)}</span>
      </div>
      <div class="list-item__meta">${metaBits}</div>
      <div class="list-item__address">${esc(studio.address || '')}</div>
    </button>`;
  }

  function renderList() {
    const filtered = data.filter(matches);
    countEl.textContent = `Menampilkan ${filtered.length} dari ${data.length} studio`;
    listEl.innerHTML = filtered.length
      ? filtered.map(itemHtml).join('')
      : '<div class="list-empty">Tidak ada studio yang cocok.</div>';
  }

  function link(url, label) {
    const href = safeUrl(url);
    if (href === '#') return '';
    return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }

  function openDetail(studio) {
    const badges = [];
    badges.push(`<span class="badge"><span class="dot" style="background:${studio.groupColor}"></span>${esc(studio.groupLabel)}</span>`);
    if (studio.needsReview) badges.push('<span class="badge badge--warn">Perlu verifikasi manual</span>');
    if (studio.outsideSurabaya) badges.push('<span class="badge badge--error">Di luar Surabaya</span>');

    dialogBadges.innerHTML = badges.join('');
    dialogTitle.textContent = studio.name;

    const contactLinks = [
      studio.phone ? link(`tel:${studio.phone}`, studio.phone) : '',
      studio.website ? link(studio.website, 'Website') : '',
      studio.instagram ? link(studio.instagram, 'Instagram') : '',
      studio.facebook ? link(studio.facebook, 'Facebook') : '',
      studio.linkedin ? link(studio.linkedin, 'LinkedIn') : '',
      studio.youtube ? link(studio.youtube, 'YouTube') : '',
      studio.mapsUrl ? link(studio.mapsUrl, 'Google Maps') : '',
    ].filter(Boolean).join('');

    const emails = studio.emails.length
      ? studio.emails.map((email) => `<a href="mailto:${esc(email)}">${esc(email)}</a>`).join('')
      : '';

    const hours = studio.openingHours.length
      ? `<ul class="hours">${studio.openingHours.map((slot) => {
          const [day, ...rest] = slot.split(': ');
          const time = rest.join(': ');
          return `<li><span>${esc(day)}</span><span>${esc(time)}</span></li>`;
        }).join('')}</ul>`
      : '<p style="color:var(--muted)">Tidak tersedia.</p>';

    const age = [
      `<div class="detail-row"><dt>Status</dt><dd>${esc(studio.ageStatus || '—')}</dd></div>`,
      `<div class="detail-row"><dt>Skor keyakinan</dt><dd>${studio.confidence}%</dd></div>`,
      studio.foundedYear ? `<div class="detail-row"><dt>Tahun berdiri</dt><dd>${studio.foundedYear}</dd></div>` : '',
      studio.ageYears != null ? `<div class="detail-row"><dt>Usia</dt><dd>${String(studio.ageYears).replace('.', ',')} tahun</dd></div>` : '',
      studio.ageSummary ? `<div class="detail-row"><dt>Sinyal usia</dt><dd>${esc(studio.ageSummary)}</dd></div>` : '',
    ].filter(Boolean).join('');

    dialogBody.innerHTML = `
      <section class="detail-section">
        <h3>Ringkasan</h3>
        <div class="detail-row"><dt>Kategori</dt><dd>${esc(studio.category || studio.groupLabel)}</dd></div>
        <div class="detail-row"><dt>Rating</dt><dd>${ratingText(studio) || 'Belum ada rating'}</dd></div>
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

    dialog.showModal();
  }

  filtersEl.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    const group = chip.dataset.group || null;
    activeGroup = group === activeGroup ? null : group;
    buildFilters();
    renderList();
  });

  searchEl.addEventListener('input', () => {
    query = searchEl.value.trim().toLowerCase();
    renderList();
  });

  listEl.addEventListener('click', (event) => {
    const item = event.target.closest('.list-item');
    if (!item) return;
    const studio = data.find((entry) => entry.id === item.dataset.id);
    if (!studio) return;
    if (studio.latitude != null && studio.longitude != null) {
      map.flyTo({ center: [studio.longitude, studio.latitude], zoom: 15 });
    }
    openDetail(studio);
    if (window.innerWidth <= 860) document.body.classList.remove('sidebar-open');
  });

  dialogClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  openSidebar.addEventListener('click', () => document.body.classList.add('sidebar-open'));
  closeSidebar.addEventListener('click', () => document.body.classList.remove('sidebar-open'));

  buildFilters();
  renderList();
})();
