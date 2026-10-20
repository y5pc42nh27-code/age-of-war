const shapes = {
  crest:
    '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6L12 2Z"/><path d="m7 15 5-9 5 9M9 12h6"/>',
  coin: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><path d="M12 8v8m-2-6h4m-4 4h4"/>',
  star: '<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.4l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9L12 3Z"/>',
  sword: '<path d="m5 3 5 2 9 12-3 3L6 8 5 3Zm9 13 5-4m-8 7 5-4m-1 4 3 3"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  evolve: '<path d="m5 12 7-7 7 7M5 19l7-7 7 7"/>',
  special: '<path d="m14 2-9 12h7l-2 8 9-12h-7l2-8Z"/>',
  fort: '<path d="M3 21V7h4v4h3V4h4v7h3V7h4v14H3Zm6 0v-5h6v5"/>',
  sound:
    '<path d="m11 4-5 5H2v6h4l5 5V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="m11 4-5 5H2v6h4l5 5V4Zm5 5 6 6m0-6-6 6"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  play: '<path d="m7 3 14 9-14 9V3Z"/>',
  gear: '<path d="m10 2-1 4-4-1-2 4 3 3-3 3 2 4 4-1 1 4h4l1-4 4 1 2-4-3-3 3-3-2-4-4 1-1-4h-4Z"/><circle cx="12" cy="12" r="4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8c1-4 8-1 4 2l-1 1v3m0 3v1"/>',
  flag: '<path d="M5 22V3l14 3-3 5 3 5-14-3"/>',
  cross: '<path d="m5 5 14 14M5 19 19 5"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
  signal:
    '<path d="M5 5c-5 4-5 10 0 14m14-14c5 4 5 10 0 14M8 8c-3 2-3 6 0 8m8-8c3 2 3 6 0 8"/><circle cx="12" cy="12" r="1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
};
export function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.crest}</svg>`;
}
