/**
 * useImagePreloader — eagerly preloads a batch of cover URLs so they
 * render instantly when the user scrolls or navigates.
 *
 * Usage:
 *   const preloaded = useImagePreloader(tracks.slice(0, 10).map(t => t.cover_url).filter(Boolean));
 */

import { useEffect, useRef } from "react";

const PRELOADED = new Set();

export function useImagePreloader(urls) {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!urls || !urls.length) return;

    const toLoad = urls.filter((u) => u && !PRELOADED.has(u));
    if (!toLoad.length) return;

    // Use Image() constructor — browser caches the decoded image
    toLoad.forEach((url) => {
      PRELOADED.add(url);
      const img = new Image();
      img.src = url;
      // No need to await — the browser starts loading immediately
    });

    return () => {
      mounted.current = false;
    };
  }, [urls]);
}

export default useImagePreloader;