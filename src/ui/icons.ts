const paths: Record<string, string> = {
  leaf: '<path d="M20 4C9 2 3 7 5 14c2 7 13 6 15-10Z"/><path d="M4 21 15 10M9 16v-5M9 16h5"/>',
  book: '<path d="M12 6C8 3 4 4 2 5v15c4-2 7-1 10 1 3-2 6-3 10-1V5c-2-1-6-2-10 1Zm0 0v15"/>',
  camera:
    '<path d="M8 6 10 3h4l2 3h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5ZM15 8c3 2 3 6 0 8M18 4c6 4 6 12 0 16"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
};
export function icon(name: string, className = ""): string {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.leaf}</svg>`;
}
