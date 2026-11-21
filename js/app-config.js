// Preserves Render backend API URL on GitHub Pages while supporting same-origin Express serving in local/AI Studio preview.
const PRODUCTION_RENDER_API_URL = "https://studentlife-1-zcuc.onrender.com";

export const API_BASE_URL = typeof window !== "undefined"
  ? (window.location.hostname.endsWith("github.io") ? PRODUCTION_RENDER_API_URL : window.location.origin)
  : PRODUCTION_RENDER_API_URL;
