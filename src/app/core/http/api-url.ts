import { API_PATH_PREFIX } from './api.tokens';

/**
 * Whether a request targets the app's own API — the only requests allowed to
 * carry the student's ID token. Anything else (a third-party endpoint, a CDN)
 * is deliberately excluded, so a credential cannot leak off-origin.
 */
export function isAppApiUrl(url: string, baseUrl: string): boolean {
  if (isApiPath(url)) return true;
  if (!baseUrl) return false;

  try {
    const target = new URL(url, baseUrl);
    const base = new URL(baseUrl);
    // Compare parsed origins rather than string prefixes, so a lookalike host
    // such as `https://api.example.com.attacker.test` cannot match.
    return target.origin === base.origin && isApiPath(target.pathname);
  } catch {
    return false;
  }
}

/** Expands an `/api/...` path against the configured API origin, if there is one. */
export function resolveApiUrl(url: string, baseUrl: string): string {
  if (!baseUrl || !isApiPath(url)) return url;
  return `${baseUrl.replace(/\/+$/, '')}${url}`;
}

function isApiPath(path: string): boolean {
  return path === API_PATH_PREFIX || path.startsWith(`${API_PATH_PREFIX}/`);
}
