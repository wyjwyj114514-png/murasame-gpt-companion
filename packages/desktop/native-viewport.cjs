// Host bounds are physical pixels. Resize using the companion's display scale,
// not the host's reported DPI: a DPI-unaware host can report 96 on a 133% display.
function syncNativeViewport(host, window, screen, previousKey = '') {
  if (!host.nativeFollowing) return '';
  if (!host.visible || !host.bounds || !['width', 'height', 'x', 'y'].every(k => Number.isFinite(host.bounds[k]))) return previousKey;
  const current = window.getBounds();
  const reported = screen.getDisplayMatching(current).scaleFactor;
  const scale = Number.isFinite(reported) && reported > 0 ? reported : 1;
  // Round inward so a fractional DIP cannot enlarge the overlay past the host.
  const width = Math.floor(host.bounds.width / scale), height = Math.floor(host.bounds.height / scale);
  const key = [host.window, width, height, scale].join(':');
  if (width > 10 && height > 10 && key !== previousKey) {
    if (width !== current.width || height !== current.height) window.setBounds({width, height}, false);
    return key;
  }
  return previousKey;
}
function confinedViewport(host, window, screen) {
  const viewport = window.getContentBounds();
  if (!host?.nativeFollowing || !host.bounds) return viewport;
  const reported = screen.getDisplayMatching(window.getBounds()).scaleFactor;
  const scale = Number.isFinite(reported) && reported > 0 ? reported : 1;
  return {width:Math.min(viewport.width,Math.floor(host.bounds.width/scale)),height:Math.min(viewport.height,Math.floor(host.bounds.height/scale))};
}
module.exports = {syncNativeViewport, confinedViewport};
