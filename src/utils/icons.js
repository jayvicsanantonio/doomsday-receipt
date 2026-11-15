/**
 * Local Lucide-style 24x24 SVG Icon Library + Canvas 2D Vector Icon Renderer
 * Zero emojis across DOM UI and 1080x1920 receipt PNG exports.
 */

export const ICONS = {
  'shield-check':
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  skull:
    '<path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/>',
  crown:
    '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
  orbit:
    '<circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><path d="M10.4 21.9a10 10 0 0 0 9.941-15.416"/><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416"/>',
  scale:
    '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  'volume-2':
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  'volume-x':
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
  'rotate-ccw':
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  receipt:
    '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  clapperboard:
    '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  swords:
    '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>',
  'bar-chart-3':
    '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  sparkles:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  award:
    '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  'check-circle-2': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  printer:
    '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  'share-2':
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  share:
    '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  'image-down':
    '<path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/><path d="m14 19 3 3 3-3"/><path d="M17 22v-5.5"/><circle cx="9" cy="9" r="2"/>',
  'x-brand':
    '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
};

export function icon(name, { size = 16, className = '', strokeWidth = 2 } = {}) {
  const inner = ICONS[name] || ICONS.sparkles;
  const cls = `lucide lucide-${name}${className ? ` ${className}` : ''}`;
  if (name === 'x-brand') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="${cls}" aria-hidden="true">${inner}</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${inner}</svg>`;
}

/**
 * Draw crisp vector glyphs on 2D <canvas> for PNG receipt exports without emojis.
 */
export function drawCanvasIcon(ctx, name, cx, cy, size, color) {
  const r = size * 0.44;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.11);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (name === 'shield-check') {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.85, -r * 0.62);
    ctx.lineTo(r * 0.85, r * 0.12);
    ctx.quadraticCurveTo(r * 0.65, r * 0.72, 0, r);
    ctx.quadraticCurveTo(-r * 0.65, r * 0.72, -r * 0.85, r * 0.12);
    ctx.lineTo(-r * 0.85, -r * 0.62);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.34, r * 0.04);
    ctx.lineTo(-r * 0.06, r * 0.32);
    ctx.lineTo(r * 0.38, -r * 0.22);
    ctx.stroke();
  } else if (name === 'skull') {
    ctx.beginPath();
    ctx.arc(0, -r * 0.14, r * 0.74, Math.PI * 0.78, Math.PI * 0.22, false);
    ctx.lineTo(r * 0.44, r * 0.42);
    ctx.lineTo(r * 0.44, r * 0.82);
    ctx.lineTo(-r * 0.44, r * 0.82);
    ctx.lineTo(-r * 0.44, r * 0.42);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.08, r * 0.13, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.08, r * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-r * 0.15, r * 0.52);
    ctx.lineTo(-r * 0.15, r * 0.82);
    ctx.moveTo(r * 0.15, r * 0.52);
    ctx.lineTo(r * 0.15, r * 0.82);
    ctx.stroke();
  } else if (name === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, r * 0.42);
    ctx.lineTo(-r * 0.92, -r * 0.48);
    ctx.lineTo(-r * 0.38, r * 0.04);
    ctx.lineTo(0, -r * 0.68);
    ctx.lineTo(r * 0.38, r * 0.04);
    ctx.lineTo(r * 0.92, -r * 0.48);
    ctx.lineTo(r * 0.78, r * 0.42);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.75, r * 0.8);
    ctx.lineTo(r * 0.75, r * 0.8);
    ctx.stroke();
  } else if (name === 'orbit') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, -Math.PI * 0.15, Math.PI * 0.68);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, Math.PI * 0.85, Math.PI * 1.68);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(r * 0.68, -r * 0.68, r * 0.18, 0, Math.PI * 2);
    ctx.arc(-r * 0.68, r * 0.68, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (name === 'scale') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.lineTo(0, r * 0.85);
    ctx.moveTo(-r * 0.45, r * 0.85);
    ctx.lineTo(r * 0.45, r * 0.85);
    ctx.moveTo(-r * 0.82, -r * 0.45);
    ctx.lineTo(r * 0.82, -r * 0.45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.82, -r * 0.45);
    ctx.lineTo(-r * 1.05, r * 0.18);
    ctx.lineTo(-r * 0.58, r * 0.18);
    ctx.closePath();
    ctx.moveTo(r * 0.82, -r * 0.45);
    ctx.lineTo(r * 0.58, r * 0.18);
    ctx.lineTo(r * 1.05, r * 0.18);
    ctx.closePath();
    ctx.stroke();
  } else if (name === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.92);
    ctx.bezierCurveTo(r * 0.72, -r * 0.3, r * 0.85, r * 0.28, r * 0.52, r * 0.7);
    ctx.bezierCurveTo(r * 0.25, r * 0.98, -r * 0.25, r * 0.98, -r * 0.52, r * 0.7);
    ctx.bezierCurveTo(-r * 0.88, r * 0.28, -r * 0.62, -r * 0.35, 0, -r * 0.92);
    ctx.stroke();
  } else if (name === 'check-circle-2') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, r * 0.04);
    ctx.lineTo(-r * 0.08, r * 0.34);
    ctx.lineTo(r * 0.42, -r * 0.26);
    ctx.stroke();
  } else if (name === 'x-circle') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, -r * 0.34);
    ctx.lineTo(r * 0.34, r * 0.34);
    ctx.moveTo(r * 0.34, -r * 0.34);
    ctx.lineTo(-r * 0.34, r * 0.34);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.lineTo(r * 0.24, -r * 0.24);
    ctx.lineTo(r * 0.85, 0);
    ctx.lineTo(r * 0.24, r * 0.24);
    ctx.lineTo(0, r * 0.85);
    ctx.lineTo(-r * 0.24, r * 0.24);
    ctx.lineTo(-r * 0.85, 0);
    ctx.lineTo(-r * 0.24, -r * 0.24);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}
