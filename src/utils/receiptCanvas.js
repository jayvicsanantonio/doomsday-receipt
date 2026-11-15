import { FATES, ROSTER, THEMES, THEORY_QUESTIONS } from '../data/roster.js';
import { analyzeReceipt, scoreReceipt } from './codec.js';
import { drawCanvasIcon } from './icons.js';

const THEME_PALETTES = {
  doom: {
    backdrop: '#050b08',
    paper: '#0b1410',
    paperStroke: '#10b981',
    ink: '#ecfdf5',
    muted: '#6ee7b7',
    dim: '#34d399',
    accent: '#10b981',
    divider: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'rgba(16, 185, 129, 0.14)',
  },
  tva: {
    backdrop: '#0b0804',
    paper: '#161109',
    paperStroke: '#f59e0b',
    ink: '#fef3c7',
    muted: '#fbbf24',
    dim: '#d97706',
    accent: '#f59e0b',
    divider: 'rgba(245, 158, 11, 0.35)',
    badgeBg: 'rgba(245, 158, 11, 0.14)',
  },
  classic: {
    backdrop: '#18181b',
    paper: '#f8fafc',
    paperStroke: '#0f172a',
    ink: '#0f172a',
    muted: '#475569',
    dim: '#64748b',
    accent: '#059669',
    divider: 'rgba(15, 23, 42, 0.25)',
    badgeBg: 'rgba(15, 23, 42, 0.08)',
  },
};

function drawSerratedReceiptPaper(ctx, x, y, w, h, teethCount, toothHeight, fillColor, strokeColor) {
  const step = w / teethCount;
  ctx.beginPath();
  ctx.moveTo(x, y + toothHeight);
  for (let i = 0; i < teethCount; i += 1) {
    ctx.lineTo(x + (i + 0.5) * step, y);
    ctx.lineTo(x + (i + 1) * step, y + toothHeight);
  }
  ctx.lineTo(x + w, y + h - toothHeight);
  for (let i = teethCount; i > 0; i -= 1) {
    ctx.lineTo(x + (i - 0.5) * step, y + h);
    ctx.lineTo(x + (i - 1) * step, y + h - toothHeight);
  }
  ctx.closePath();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawDashedDivider(ctx, x1, x2, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawMatrixSeal(ctx, x, y, size, seedStr, fgColor) {
  const grid = 11;
  const cell = size / grid;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  ctx.save();
  ctx.fillStyle = fgColor;

  const isFinder = (r, c) =>
    (r < 3 && c < 3) || (r < 3 && c >= grid - 3) || (r >= grid - 3 && c < 3);

  for (let r = 0; r < grid; r += 1) {
    for (let c = 0; c < grid; c += 1) {
      let filled = false;
      if (isFinder(r, c)) {
        filled = r === 0 || r === 2 || r === grid - 1 || r === grid - 3 || c === 0 || c === 2 || c === grid - 1 || c === grid - 3 || (r === 1 && c === 1) || (r === 1 && c === grid - 2) || (r === grid - 2 && c === 1);
      } else {
        hash ^= (r * 31 + c * 17) >>> 0;
        hash = Math.imul(hash, 1664525) + 1013904223;
        filled = ((hash >>> 24) & 1) === 1;
      }
      if (filled) {
        ctx.fillRect(x + c * cell, y + r * cell, Math.ceil(cell - 1), Math.ceil(cell - 1));
      }
    }
  }
  ctx.restore();
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function loadAvatarImages(chars) {
  const map = new Map();
  if (typeof Image === 'undefined') return Promise.resolve(map);

  const tasks = chars.map(
    (c) =>
      new Promise((resolve) => {
        if (!c.avatar) {
          resolve();
          return;
        }
        const img = new Image();
        img.onload = () => {
          map.set(c.id, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = c.avatar;
      })
  );
  return Promise.all(tasks).then(() => map);
}

/**
 * Render the 1080x1920 vertical story receipt onto a canvas and return its PNG Blob / DataURL.
 */
export async function renderReceiptCanvas(state, options = {}) {
  const { gradingActive = false, rivalComparison = null, siteLabel = 'DOOMSDAYRECEIPT.APP' } = options;
  const themeId = state.theme && THEME_PALETTES[state.theme] ? state.theme : 'doom';
  const pal = THEME_PALETTES[themeId];
  const themeMeta = THEMES[themeId] || THEMES.doom;
  const stats = analyzeReceipt(state);
  const grade = gradingActive ? scoreReceipt(state) : null;
  const answeredChars = ROSTER.filter((c) => Boolean(state.fates?.[c.id]));
  const avatarMap = await loadAvatarImages(answeredChars);

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient + subtle grid
  const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.35, 60, W * 0.5, H * 0.5, H * 0.8);
  bgGrad.addColorStop(0, themeId === 'doom' ? '#0d261c' : themeId === 'tva' ? '#261a08' : '#27272a');
  bgGrad.addColorStop(1, pal.backdrop);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle horizontal scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.015)';
  for (let sy = 0; sy < H; sy += 6) {
    ctx.fillRect(0, sy, W, 2);
  }

  // Receipt paper bounds
  const px = 68;
  const py = 54;
  const pw = W - px * 2;
  const ph = H - py * 2;
  drawSerratedReceiptPaper(ctx, px, py, pw, ph, 26, 16, pal.paper, pal.paperStroke);

  const innerX = px + 46;
  const innerRight = px + pw - 46;
  const innerW = innerRight - innerX;
  let y = py + 62;

  // Top Terminal Badge
  ctx.fillStyle = pal.muted;
  ctx.font = '700 20px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(themeMeta.badge, W / 2, y);
  y += 44;

  // Title
  ctx.fillStyle = pal.ink;
  ctx.font = '900 44px "Inter", "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('THE DOOMSDAY RECEIPT', W / 2, y);
  y += 32;

  ctx.fillStyle = pal.muted;
  ctx.font = '700 20px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText(themeMeta.subTitle, W / 2, y);
  y += 28;

  drawDashedDivider(ctx, innerX, innerRight, y, pal.divider);
  y += 36;

  // Ticket Stub Metadata Block
  ctx.textAlign = 'left';
  ctx.font = '700 22px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillStyle = pal.muted;
  ctx.fillText('OPERATIVE:', innerX, y);
  ctx.fillStyle = pal.ink;
  ctx.textAlign = 'right';
  ctx.fillText(`@${(state.handle || 'ANONYMOUS').toUpperCase()}`, innerRight, y);
  y += 32;

  ctx.textAlign = 'left';
  ctx.fillStyle = pal.muted;
  ctx.fillText('SHOWTIME:', innerX, y);
  ctx.fillStyle = pal.ink;
  ctx.textAlign = 'right';
  ctx.fillText(state.format || 'IMAX 70MM • THU DEC 17', innerRight, y);
  y += 32;

  ctx.textAlign = 'left';
  ctx.fillStyle = pal.muted;
  ctx.fillText('LOCKED AT:', innerX, y);
  ctx.fillStyle = pal.ink;
  ctx.textAlign = 'right';
  const dateLabel = state.timestamp
    ? new Date(state.timestamp).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
    : 'PRE-DEC 18 LOCK';
  ctx.fillText(dateLabel, innerRight, y);
  y += 28;

  drawDashedDivider(ctx, innerX, innerRight, y, pal.divider);
  y += 26;

  // Persona + Metrics Strip
  ctx.fillStyle = pal.badgeBg;
  ctx.fillRect(innerX, y, innerW, 92);
  ctx.strokeStyle = pal.paperStroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(innerX, y, innerW, 92);

  drawCanvasIcon(ctx, stats.persona.badge, innerX + 34, y + 29, 24, pal.accent);

  ctx.textAlign = 'left';
  ctx.fillStyle = pal.ink;
  ctx.font = '900 28px "Inter", "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(stats.persona.title, innerX + 54, y + 38);

  ctx.fillStyle = pal.muted;
  ctx.font = '700 20px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText(
    `BLOODBATH: ${stats.bloodbathPct}%   •   SPICE INDEX: ${stats.spiceScore}/99   •   PICKS: ${stats.totalAnswered}`,
    innerX + 20,
    y + 72
  );
  y += 116;

  // Optional Prophet Score or Head-to-Head Stamp Banner
  if (grade) {
    ctx.fillStyle = grade.accuracyPct >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
    ctx.fillRect(innerX, y, innerW, 54);
    ctx.fillStyle = pal.ink;
    ctx.font = '900 24px "JetBrains Mono", "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `DEC 18 GRADE: ${grade.accuracyPct}% (${grade.rank}) — ${grade.charHits}/${grade.charTotal} FATES`,
      W / 2,
      y + 35
    );
    y += 72;
  } else if (rivalComparison) {
    ctx.fillStyle = pal.badgeBg;
    ctx.fillRect(innerX, y, innerW, 54);
    ctx.fillStyle = pal.ink;
    ctx.font = '900 22px "JetBrains Mono", "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `VS @${rivalComparison.rivalHandle}: ${rivalComparison.agreementPct}% MATCH (${rivalComparison.verdict})`,
      W / 2,
      y + 35
    );
    y += 72;
  }

  // Character Roster Header
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.muted;
  ctx.font = '700 19px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText('ITEMIZED MULTIVERSE FATES', innerX, y);
  ctx.textAlign = 'right';
  ctx.fillText('STATUS', innerRight, y);
  y += 16;

  drawDashedDivider(ctx, innerX, innerRight, y, pal.divider);
  y += 28;

  // Answered characters list
  const footerReserve = 505;
  const maxListBottom = py + ph - footerReserve;
  const availH = Math.max(240, maxListBottom - y);

  const twoCol = answeredChars.length > 18;
  const cols = twoCol ? 2 : 1;
  const rows = Math.ceil(answeredChars.length / cols);
  const rowH = Math.min(38, Math.max(23, Math.floor(availH / Math.max(1, rows))));
  const fontSize = twoCol ? (rowH <= 26 ? 16 : 18) : 21;
  const colGap = 28;
  const colW = twoCol ? (innerW - colGap) / 2 : innerW;
  const avatarR = Math.max(9, Math.floor(rowH * 0.36));
  const avatarPad = avatarR * 2 + 10;

  for (let idx = 0; idx < answeredChars.length; idx += 1) {
    const char = answeredChars[idx];
    const fate = FATES[state.fates[char.id]];
    if (!fate) continue;

    const col = twoCol ? Math.floor(idx / rows) : 0;
    const row = twoCol ? idx % rows : idx;
    const cx = innerX + col * (colW + colGap);
    const cy = y + row * rowH;

    if (cy > maxListBottom) break;

    const img = avatarMap.get(char.id);
    const imgCenterY = cy - fontSize * 0.32;
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) * 0.5;
      const sy = (img.naturalHeight - side) * 0.16;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + avatarR, imgCenterY, avatarR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, sx, sy, side, side, cx, imgCenterY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();

      ctx.strokeStyle = pal.paperStroke;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx + avatarR, imgCenterY, avatarR, 0, Math.PI * 2);
      ctx.stroke();
    }

    const labelStr = char.alias === 'DOCTOR DOOM' ? 'DR. DOOM' : char.name.toUpperCase();
    const textX = img ? cx + avatarPad : cx;
    const maxNameW = colW - (twoCol ? 132 : 195) - (img ? avatarPad : 0);

    ctx.textAlign = 'left';
    ctx.fillStyle = pal.ink;
    ctx.font = `700 ${fontSize}px "JetBrains Mono", "SF Mono", Menlo, monospace`;
    ctx.fillText(truncateText(ctx, `${char.rumorBadge ? '*' : ''}${labelStr}`, maxNameW), textX, cy);

    const fateColor = themeId === 'classic' && fate.key === 'survive' ? '#047857' : fate.color;
    let statusLabel = twoCol ? fate.shortLabel : fate.label;
    let statusIcon = fate.icon;
    let iconColor = fateColor;
    if (grade) {
      const g = grade.charGrades.find((x) => x.char.id === char.id);
      if (g) {
        statusLabel = fate.shortLabel;
        statusIcon = g.hit ? 'check-circle-2' : 'x-circle';
        iconColor = g.hit ? (themeId === 'classic' ? '#047857' : '#10b981') : '#ef4444';
      }
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = fateColor;
    ctx.font = `800 ${fontSize - 1}px "JetBrains Mono", "SF Mono", Menlo, monospace`;
    ctx.fillText(statusLabel, cx + colW, cy);

    const textW = ctx.measureText(statusLabel).width;
    const iconSize = fontSize - 2;
    const iconX = cx + colW - textW - iconSize * 0.65 - 4;
    drawCanvasIcon(ctx, statusIcon, iconX, cy - fontSize * 0.34, iconSize, iconColor);
  }

  y = maxListBottom + 18;
  drawDashedDivider(ctx, innerX, innerRight, y, pal.divider);
  y += 32;

  // 5 Parlay Theory Picks
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.muted;
  ctx.font = '700 19px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText('5 PARLAY THEORY LOCKS', innerX, y);
  y += 28;

  for (const q of THEORY_QUESTIONS) {
    const pickId = state.theories?.[q.id];
    const opt = q.options.find((o) => o.id === pickId);
    const shortQ = q.title.replace("UNMASKING RDJ'S DOOM", 'RDJ DOOM').replace('ACT I OPENING STATEMENT', 'ACT I').replace('THE INCURSION VICTIM', 'INCURSION').replace('THE TRAITOR IN THE RANKS', 'TRAITOR').replace('THE FINAL CUT-TO-BLACK', 'FINAL SHOT');
    const ansLabel = opt ? `[${opt.id}] ${opt.label}` : 'UNDECIDED';

    ctx.textAlign = 'left';
    ctx.fillStyle = pal.muted;
    ctx.font = '700 17px "JetBrains Mono", "SF Mono", Menlo, monospace';
    ctx.fillText(`${shortQ}:`, innerX, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = pal.ink;
    ctx.fillText(truncateText(ctx, ansLabel, innerW - 145), innerRight, y);
    y += 29;
  }

  y += 10;
  drawDashedDivider(ctx, innerX, innerRight, y, pal.divider);
  y += 30;

  // Bottom Stamp + Matrix Seal + CTA Watermark
  const sealSize = 114;
  drawMatrixSeal(ctx, innerRight - sealSize, y, sealSize, stats.lockStamp, pal.ink);

  ctx.textAlign = 'left';
  ctx.fillStyle = pal.muted;
  ctx.font = '700 17px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText('CRYPTOGRAPHIC ANTI-CHEAT LOCK:', innerX, y + 24);

  ctx.fillStyle = pal.accent;
  ctx.font = '900 26px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText(stats.lockStamp, innerX, y + 58);

  ctx.fillStyle = pal.muted;
  ctx.font = '700 17px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText('LOCK YOUR PREDICTIONS BEFORE DEC 18', innerX, y + 92);

  ctx.fillStyle = pal.ink;
  ctx.font = '800 20px "JetBrains Mono", "SF Mono", Menlo, monospace';
  ctx.fillText(siteLabel.toUpperCase(), innerX, y + 120);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({
        blob,
        dataUrl: canvas.toDataURL('image/png'),
      });
    }, 'image/png');
  });
}
