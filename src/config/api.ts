/**
 * API Configuration
 *
 * In development: API calls go to '/api' (proxied by Vite to localhost:3001)
 * In production: API calls go to the backend server URL set via VITE_API_BASE_URL
 */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || '/api';

export const AI_BASE_URL: string =
  import.meta.env.VITE_AI_API_BASE_URL;

export const STT_WS_AUTH_TOKEN: string =
  import.meta.env.VITE_STT_WS_AUTH_TOKEN || '';

/**
 * Backend server origin for resolving relative paths (uploads, etc.)
 * In development: empty string (same origin, proxied by Vite)
 * In production: full backend URL like 'https://familytree.familyaconnect.com'
 */
export const BACKEND_ORIGIN: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Resolve a backend-relative path (e.g. '/uploads/photo.jpg') to a full URL.
 * In dev returns the path as-is; in production prepends the backend origin.
 */
export function resolveBackendUrl(path: string): string {
  if (path && (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:'))) return path;
  const origin = BACKEND_ORIGIN.replace(/\/$/, '');
  if (!path) return origin;

  let normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Robustness: ensure /api prefix for typical API endpoints if hitting the server root
  if (normalizedPath === '/api' || normalizedPath.startsWith('/api/')) {
    // Already has it
  } else if (['/notifications', '/tree', '/watch', '/invitation', '/person'].some(p => normalizedPath.startsWith(p))) {
    normalizedPath = `/api${normalizedPath}`;
  }

  return `${origin}${normalizedPath}`;
}

/**
 * Build the public share-preview URL for a post.
 * Points to the backend /share/:postId endpoint which serves OG meta tags.
 * e.g. https://api-familytree.familyaconnect.com/share/<postId>
 */
export function getShareUrl(postId: string): string {
  // Strip the trailing /api from the API base to get the server root.
  const serverRoot = API_BASE_URL.replace(/\/api$/, '');
  return `${serverRoot}/share/${postId}`;
}
