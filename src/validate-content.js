function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isText(value) {
  return typeof value === 'string';
}

function requiredText(errors, value, path) {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${path} wajib berupa teks.`);
}

function optionalText(errors, value, path) {
  if (value != null && typeof value !== 'string') errors.push(`${path} harus berupa teks.`);
}

function validateLink(errors, link, path) {
  if (!isObject(link)) {
    errors.push(`${path} harus berupa objek.`);
    return;
  }
  requiredText(errors, link.label, `${path}.label`);
  requiredText(errors, link.href, `${path}.href`);
}

function validateLinks(errors, links, path) {
  if (!Array.isArray(links)) {
    errors.push(`${path} harus berupa array.`);
    return;
  }
  links.forEach((link, index) => validateLink(errors, link, `${path}[${index}]`));
}

function validateParagraphs(errors, paragraphs, path) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    errors.push(`${path} harus berisi minimal satu paragraf.`);
    return;
  }
  paragraphs.forEach((paragraph, index) => {
    if (!isText(paragraph) || !paragraph.trim()) errors.push(`${path}[${index}] wajib berupa teks.`);
  });
}

/**
 * Validasi konten editorial yang dipakai landing, peta, privacy, dan metadata SEO.
 * File ini murni (tanpa Node API) agar bisa dipakai dashboard React dan test.
 */
export function validateContent(data) {
  const errors = [];

  if (!isObject(data)) return ['Konten harus berupa objek JSON.'];

  if (data.version != null && (!Number.isInteger(Number(data.version)) || Number(data.version) < 1)) {
    errors.push('version harus bilangan bulat positif.');
  }

  if (!isObject(data.site)) {
    errors.push('site harus berupa objek.');
  } else {
    requiredText(errors, data.site.name, 'site.name');
    requiredText(errors, data.site.shortName, 'site.shortName');
    requiredText(errors, data.site.accent, 'site.accent');
    requiredText(errors, data.site.description, 'site.description');
    requiredText(errors, data.site.url, 'site.url');
    optionalText(errors, data.site.tagline, 'site.tagline');
    optionalText(errors, data.site.github, 'site.github');
    optionalText(errors, data.site.issueUrl, 'site.issueUrl');
  }

  validateLinks(errors, data.navigation, 'navigation');
  validateLink(errors, data.cta, 'cta');

  if (!isObject(data.landing)) {
    errors.push('landing harus berupa objek.');
  } else {
    if (!isObject(data.landing.hero)) {
      errors.push('landing.hero harus berupa objek.');
    } else {
      requiredText(errors, data.landing.hero.kicker, 'landing.hero.kicker');
      requiredText(errors, data.landing.hero.title, 'landing.hero.title');
      requiredText(errors, data.landing.hero.highlight, 'landing.hero.highlight');
      requiredText(errors, data.landing.hero.description, 'landing.hero.description');
      validateLink(errors, data.landing.hero.primary, 'landing.hero.primary');
      validateLink(errors, data.landing.hero.secondary, 'landing.hero.secondary');
    }

    if (!isObject(data.landing.snapshot)) {
      errors.push('landing.snapshot harus berupa objek.');
    } else {
      requiredText(errors, data.landing.snapshot.eyebrow, 'landing.snapshot.eyebrow');
      requiredText(errors, data.landing.snapshot.title, 'landing.snapshot.title');
      requiredText(errors, data.landing.snapshot.note, 'landing.snapshot.note');
    }

    if (!isObject(data.landing.categories)) {
      errors.push('landing.categories harus berupa objek.');
    } else {
      requiredText(errors, data.landing.categories.eyebrow, 'landing.categories.eyebrow');
      requiredText(errors, data.landing.categories.title, 'landing.categories.title');
      requiredText(errors, data.landing.categories.description, 'landing.categories.description');
    }

    if (!isObject(data.landing.about)) {
      errors.push('landing.about harus berupa objek.');
    } else {
      requiredText(errors, data.landing.about.eyebrow, 'landing.about.eyebrow');
      requiredText(errors, data.landing.about.title, 'landing.about.title');
      requiredText(errors, data.landing.about.body, 'landing.about.body');
      if (!Array.isArray(data.landing.about.points)) {
        errors.push('landing.about.points harus berupa array.');
      } else {
        data.landing.about.points.forEach((point, index) => {
          if (!isObject(point)) {
            errors.push(`landing.about.points[${index}] harus berupa objek.`);
            return;
          }
          requiredText(errors, point.title, `landing.about.points[${index}].title`);
          requiredText(errors, point.text, `landing.about.points[${index}].text`);
        });
      }
    }

    if (!isObject(data.landing.notes)) {
      errors.push('landing.notes harus berupa objek.');
    } else {
      requiredText(errors, data.landing.notes.eyebrow, 'landing.notes.eyebrow');
      requiredText(errors, data.landing.notes.title, 'landing.notes.title');
    }
  }

  if (!isObject(data.map)) {
    errors.push('map harus berupa objek.');
  } else {
    requiredText(errors, data.map.title, 'map.title');
    requiredText(errors, data.map.description, 'map.description');
    if (!Array.isArray(data.map.defaultCenter) || data.map.defaultCenter.length !== 2) {
      errors.push('map.defaultCenter harus berisi [longitude, latitude].');
    } else {
      const [lng, lat] = data.map.defaultCenter.map(Number);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.push('map.defaultCenter[0] harus -180–180.');
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push('map.defaultCenter[1] harus -90–90.');
    }
    const zoom = Number(data.map.defaultZoom);
    if (!Number.isFinite(zoom) || zoom < 1 || zoom > 20) errors.push('map.defaultZoom harus 1–20.');
    optionalText(errors, data.map.privacyLabel, 'map.privacyLabel');
  }

  if (!isObject(data.privacy)) {
    errors.push('privacy harus berupa objek.');
  } else {
    requiredText(errors, data.privacy.title, 'privacy.title');
    requiredText(errors, data.privacy.description, 'privacy.description');
    requiredText(errors, data.privacy.eyebrow, 'privacy.eyebrow');
    requiredText(errors, data.privacy.intro, 'privacy.intro');
    requiredText(errors, data.privacy.principleTitle, 'privacy.principleTitle');
    requiredText(errors, data.privacy.principleBody, 'privacy.principleBody');
    if (!Array.isArray(data.privacy.sections) || data.privacy.sections.length === 0) {
      errors.push('privacy.sections harus berisi minimal satu bagian.');
    } else {
      data.privacy.sections.forEach((section, index) => {
        if (!isObject(section)) {
          errors.push(`privacy.sections[${index}] harus berupa objek.`);
          return;
        }
        requiredText(errors, section.title, `privacy.sections[${index}].title`);
        validateParagraphs(errors, section.paragraphs, `privacy.sections[${index}].paragraphs`);
      });
    }
    if (!isObject(data.privacy.contact)) {
      errors.push('privacy.contact harus berupa objek.');
    } else {
      requiredText(errors, data.privacy.contact.title, 'privacy.contact.title');
      requiredText(errors, data.privacy.contact.body, 'privacy.contact.body');
      requiredText(errors, data.privacy.contact.ctaLabel, 'privacy.contact.ctaLabel');
      optionalText(errors, data.privacy.contact.sensitive, 'privacy.contact.sensitive');
    }
  }

  if (!isObject(data.seo)) {
    errors.push('seo harus berupa objek.');
  } else {
    for (const page of ['home', 'map', 'privacy']) {
      const meta = data.seo[page];
      if (!isObject(meta)) {
        errors.push(`seo.${page} harus berupa objek.`);
        continue;
      }
      requiredText(errors, meta.title, `seo.${page}.title`);
      requiredText(errors, meta.description, `seo.${page}.description`);
      optionalText(errors, meta.ogImage, `seo.${page}.ogImage`);
      optionalText(errors, meta.canonical, `seo.${page}.canonical`);
      if (typeof meta.title === 'string' && meta.title.length > 70) {
        errors.push(`seo.${page}.title sebaiknya maksimal 70 karakter.`);
      }
      if (typeof meta.description === 'string' && meta.description.length > 170) {
        errors.push(`seo.${page}.description sebaiknya maksimal 170 karakter.`);
      }
    }
  }

  if (!isObject(data.footer)) {
    errors.push('footer harus berupa objek.');
  } else {
    requiredText(errors, data.footer.text, 'footer.text');
    optionalText(errors, data.footer.description, 'footer.description');
    validateLinks(errors, data.footer.links, 'footer.links');
  }

  if (!isObject(data.settings)) {
    errors.push('settings harus berupa objek.');
  } else {
    for (const key of ['showRatings', 'showOpeningHours', 'showFoundedYear']) {
      if (typeof data.settings[key] !== 'boolean') errors.push(`settings.${key} harus boolean.`);
    }
  }

  return errors;
}
