import { useEffect } from "react";
import { useParams } from "react-router-dom";

/**
 * ShareRedirect — /share/:id
 *
 * This route exists solely so shared URLs point to a path that the ogMeta
 * backend function can intercept for crawlers. The ogMeta function serves
 * server-rendered OG meta tags when a social bot hits this URL, then
 * redirects humans (via meta-refresh + JS) to /song/:id.
 *
 * If a real browser somehow lands here (e.g. direct navigation, history
 * back, etc.), this component immediately sends them to /song/:id.
 */
export default function ShareRedirect() {
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      window.location.replace(`/song/${id}`);
    } else {
      window.location.replace("/music");
    }
  }, [id]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#04040e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "rgba(255,255,255,0.5)",
      fontFamily: "sans-serif",
      fontSize: 14,
    }}>
      Redirecting…
    </div>
  );
}