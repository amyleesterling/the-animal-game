/**
 * Resolve a path in public/ against the page the game is actually served from.
 *
 * Vite is configured with base "./", and it rewrites asset URLs it can see at
 * build time, for example url() inside CSS. It cannot rewrite a path that only
 * exists as a runtime string, so those stay rooted at "/" and 404 as soon as
 * the site is served from a subpath. GitHub Pages serves this game from
 * /the-animal-game/, so a bare "/assets/x" asks the domain root for a file that
 * is not there, and the failure never shows up in local development.
 *
 * Same rule the safari model loader already applies to its GLB paths: make a
 * leading slash relative, then resolve against document.baseURI.
 */
export function publicAsset(path: string) {
  return new URL(path.startsWith("/") ? `.${path}` : path, document.baseURI)
    .href;
}
