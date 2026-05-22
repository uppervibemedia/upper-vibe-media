/**
 * usePageMeta — sets document title + in-page meta tags for regular browsers.
 * 
 * NOTE: Social crawlers (Twitter, Facebook, Discord, iMessage) do NOT execute JS,
 * so they won't see these tags. For social sharing you need the ogMeta backend function.
 * This hook handles the browser tab title and any client-side SEO tooling.
 */

import { useEffect } from "react";

const SITE_NAME   = "Upper Vibe Media";
const DEFAULT_IMG = "https://media.base44.com/images/public/69cd68afb7fe90ae92757154/10c561c0c_ChatGPTImageApr1202611_53_51AM.png";

function setMeta(property, content) {
  if (!content) return;
  // Try og: / twitter: meta tags
  let el = document.querySelector(`meta[property="${property}"]`)
        || document.querySelector(`meta[name="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    if (property.startsWith("twitter:")) {
      el.setAttribute("name", property);
    } else {
      el.setAttribute("property", property);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function usePageMeta({ title, description, imageUrl, pageUrl, type = "website" }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const img       = imageUrl || DEFAULT_IMG;
    const desc      = description || `Premium high-vibration music on ${SITE_NAME}.`;

    // Browser tab title
    document.title = fullTitle;

    // OG tags
    setMeta("og:title",       fullTitle);
    setMeta("og:description", desc);
    setMeta("og:image",       img);
    if (pageUrl) setMeta("og:url", pageUrl);
    setMeta("og:type",        type);
    setMeta("og:site_name",   SITE_NAME);

    // Twitter/X tags
    setMeta("twitter:title",       fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:image",       img);
    setMeta("twitter:card",        img !== DEFAULT_IMG ? "summary_large_image" : "summary");

    // description tag
    setMeta("description", desc);
  }, [title, description, imageUrl, pageUrl, type]);
}