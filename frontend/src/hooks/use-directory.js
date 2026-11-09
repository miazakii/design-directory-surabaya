import { useEffect, useState } from 'react';
import { loadDirectory } from '@/lib/directory';

export function useDirectory() {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    const controller = new AbortController();

    loadDirectory(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ data: null, error, loading: false });
      });

    return () => controller.abort();
  }, []);

  return state;
}
