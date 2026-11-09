import { useEffect, useState } from 'react';
import { loadContent, normalizeContent } from '@/lib/content';
import { loadDirectory } from '@/lib/directory';

export function useSiteData() {
  const [state, setState] = useState({
    data: null,
    content: normalizeContent(null),
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([loadDirectory(controller.signal), loadContent(controller.signal)])
      .then(([data, content]) => setState({ data, content, error: null, loading: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState((prev) => ({ ...prev, data: null, error, loading: false }));
      });

    return () => controller.abort();
  }, []);

  return state;
}

export function useContent() {
  const [content, setContent] = useState(() => normalizeContent(null));

  useEffect(() => {
    const controller = new AbortController();
    loadContent(controller.signal)
      .then(setContent)
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error);
      });
    return () => controller.abort();
  }, []);

  return content;
}
