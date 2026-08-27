import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every route depends on a Firebase session (and, in local mode, on
 * `localStorage`), neither of which exists on the server. Rendering on the
 * client avoids shipping a shell that hydration would immediately replace.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
