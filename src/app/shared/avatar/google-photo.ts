/**
 * Google serves profile photos at a size baked into the URL, e.g.
 * `.../a/ACg8oc...=s96-c`. The default is small enough to look soft on a HiDPI
 * screen, so ask for the size actually needed.
 *
 * Only `googleusercontent.com` URLs are rewritten; anything else is returned
 * untouched.
 */
export function sizedGooglePhoto(url: string, pixels: number): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('googleusercontent.com')) return url;

    // The size lives in the last path segment after `=`, not in the query.
    const requested = Math.min(Math.max(Math.round(pixels), 32), 512);
    return url.replace(/=s\d+(-c)?$/, `=s${requested}-c`);
  } catch {
    return url;
  }
}
