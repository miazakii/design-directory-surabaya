import { useEffect } from 'react';

function setMeta(attribute, key, value) {
  if (!value) return;
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

export function useDocumentMeta(meta, siteUrl) {
  useEffect(() => {
    if (!meta) return;
    document.title = meta.title || document.title;
    setMeta('name', 'description', meta.description);
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    if (meta.canonical) {
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = meta.canonical;
      setMeta('property', 'og:url', meta.canonical);
    }
    if (meta.ogImage) {
      const image = /^https?:\/\//i.test(meta.ogImage)
        ? meta.ogImage
        : `${String(siteUrl || '').replace(/\/$/, '')}/${meta.ogImage.replace(/^\//, '')}`;
      setMeta('property', 'og:image', image);
      setMeta('name', 'twitter:image', image);
    }
  }, [meta, siteUrl]);
}
