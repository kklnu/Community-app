// Where the backend API lives.
// - Served by server.js (localhost or Render): same origin, so leave it empty.
// - Served by GitHub Pages (*.github.io): put your Render service URL here, no trailing slash.
export const RENDER_API_URL = 'https://community-app.onrender.com';

export const API_BASE = location.hostname.endsWith('github.io') ? RENDER_API_URL : '';
