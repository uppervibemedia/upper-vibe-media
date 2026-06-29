import React, { useEffect, useRef, useState } from "react";

export default function DeferredMount({ children, rootMargin = "300px", minHeight = 0, fallback = null }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const id = window.requestIdleCallback ? window.requestIdleCallback(() => setReady(true)) : setTimeout(() => setReady(true), 120);
      return () => window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setReady(true);
        observer.disconnect();
      }
    }, { rootMargin });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, rootMargin]);

  return <div ref={ref} style={{ minHeight: ready ? undefined : minHeight }}>{ready ? children : fallback}</div>;
}