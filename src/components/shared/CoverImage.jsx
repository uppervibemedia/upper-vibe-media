import React, { useState, useRef, useEffect } from "react";
import { Music4 } from "lucide-react";

/**
 * CoverImage — consistent cover art rendering with:
 *  - Skeleton placeholder while loading (never an empty box)
 *  - Error fallback (broken URL → fallback icon)
 *  - Eager loading for first N visible images, lazy for rest
 *  - Smooth fade-in on load
 */

const FALLBACK_ICON = Music4;

export default function CoverImage({
  src,
  alt = "",
  className = "",
  width,
  height,
  eager = false,
  iconClassName = "w-8 h-8",
  fallbackOpacityClass = "text-white/15",
  fallbackBgClass = "",
  onLoad,
  onError,
}) {
  const [state, setState] = useState("loading"); // "loading" | "loaded" | "error"
  const [inView, setInView] = useState(eager);
  const ref = useRef(null);

  // IntersectionObserver for lazy images
  useEffect(() => {
    if (eager || inView) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [eager, inView]);

  const hasValidSrc = src && typeof src === "string" && src.length > 0;

  const handleLoad = () => {
    setState("loaded");
    onLoad?.();
  };

  const handleError = () => {
    setState("error");
    onError?.();
  };

  // No valid src → immediate fallback
  if (!hasValidSrc) {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-center ${fallbackBgClass || "bg-white/[0.03]"} ${className}`}
        style={{ width: width || "100%", height: height || "100%" }}
      >
        <FALLBACK_ICON className={`${iconClassName} ${fallbackOpacityClass}`} />
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`} style={{ width: width || "100%", height: height || "100%" }}>
      {/* Skeleton — shown while loading or before entering viewport */}
      {state === "loading" && (
        <div
          className={`absolute inset-0 animate-pulse rounded-inherit ${fallbackBgClass || "bg-white/[0.04]"}`}
          style={{ borderRadius: "inherit" }}
        />
      )}

      {/* Error fallback */}
      {state === "error" && (
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-inherit ${fallbackBgClass || "bg-white/[0.03]"}`}
          style={{ borderRadius: "inherit" }}
        >
          <FALLBACK_ICON className={`${iconClassName} ${fallbackOpacityClass}`} />
        </div>
      )}

      {/* Actual image — only render once in view */}
      {inView && state !== "error" && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? "eager" : "lazy"}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover ${state === "loaded" ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          style={{ borderRadius: "inherit" }}
        />
      )}
    </div>
  );
}