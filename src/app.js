import {
  FATES,
  OFFICIAL_RESULTS,
  PREMIERE_ISO,
  RIVAL_PRESETS,
  ROSTER,
  THEATER_FORMATS,
  THEMES,
  THEORY_QUESTIONS,
  TIERS,
} from './data/roster.js';
import {
  analyzeReceipt,
  buildSharePayload,
  compareReceipts,
  decodeReceipt,
  getCharactersForTier,
  scoreReceipt,
} from './utils/codec.js';
import { icon } from './utils/icons.js';
import { renderReceiptCanvas } from './utils/receiptCanvas.js';
import { sound } from './utils/sound.js';

const rootEl = document.getElementById('app-root');
const sheetRootEl = document.getElementById('sheet-root');
const toastEl = document.getElementById('toast-container');
const countdownClockEl = document.getElementById('countdown-clock');
const muteBtn = document.getElementById('mute-btn');
const homeBtn = document.getElementById('brand-home-btn');

const appState = {
  view: 'swipe', // 'swipe' | 'pitstop' | 'theories' | 'receipt'
  theme: 'doom',
  handle: 'AGENT_616',
  format: THEATER_FORMATS[0],
  tier: 'core',
  timestamp: null,

  fates: {},
  theories: {},

  deck: getCharactersForTier('core'),
  cardIndex: 0,
  history: [],
  theoryIndex: 0,
  lastCrowdPulseHtml: '',

  incomingChallenge: null,
  challengeDismissed: false,
  activeRivalKey: 'feige', // 'incoming' | 'feige' | 'doombot'
  receiptTab: 'receipt', // 'receipt' | 'diff' | 'crowd'
  gradingSimulated: false,
  viewingFriendOnly: false,
  shareSheetOpen: false,
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg, iconName = 'check-circle-2') {
  const item = document.createElement('div');
  item.className = 'toast';
  item.innerHTML = `${icon(iconName, { size: 14 })}<span>${esc(msg)}</span>`;
  toastEl.appendChild(item);
  setTimeout(() => item.remove(), 2400);
}

function setTheme(themeId) {
  const valid = THEMES[themeId] ? themeId : 'doom';
  appState.theme = valid;
  document.documentElement.setAttribute('data-theme', valid);
}

function updateCountdown() {
  if (!countdownClockEl) return;
  const diff = Date.parse(PREMIERE_ISO) - Date.now();
  if (diff <= 0) {
    countdownClockEl.textContent = 'IN THEATERS';
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  countdownClockEl.textContent = `${days}D ${String(hrs).padStart(2, '0')}H TO DEC 18`;
}

function generateMatrixSealSvg(seedStr) {
  const grid = 11;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const isFinder = (r, c) =>
    (r < 3 && c < 3) || (r < 3 && c >= grid - 3) || (r >= grid - 3 && c < 3);

  let rects = '';
  for (let r = 0; r < grid; r += 1) {
    for (let c = 0; c < grid; c += 1) {
      let filled = false;
      if (isFinder(r, c)) {
        filled =
          r === 0 ||
          r === 2 ||
          r === grid - 1 ||
          r === grid - 3 ||
          c === 0 ||
          c === 2 ||
          c === grid - 1 ||
          c === grid - 3 ||
          (r === 1 && c === 1) ||
          (r === 1 && c === grid - 2) ||
          (r === grid - 2 && c === 1);
      } else {
        hash ^= (r * 31 + c * 17) >>> 0;
        hash = Math.imul(hash, 1664525) + 1013904223;
        filled = ((hash >>> 24) & 1) === 1;
      }
      if (filled) {
        rects += `<rect x="${c * 10}" y="${r * 10}" width="9" height="9" fill="currentColor" />`;
      }
    }
  }
  return `<svg class="matrix-seal" viewBox="0 0 ${grid * 10} ${grid * 10}" aria-hidden="true">${rects}</svg>`;
}

function getActiveReceiptState() {
  if (appState.viewingFriendOnly && appState.incomingChallenge) {
    return appState.incomingChallenge;
  }
  return {
    handle: appState.handle || 'ANONYMOUS',
    theme: appState.theme,
    tier: appState.tier,
    format: appState.format,
    timestamp: appState.timestamp || new Date().toISOString(),
    fates: appState.fates,
    theories: appState.theories,
  };
}

function getActiveRivalState() {
  if (appState.activeRivalKey === 'incoming' && appState.incomingChallenge) {
    return appState.incomingChallenge;
  }
  if (appState.activeRivalKey === 'doombot') {
    return RIVAL_PRESETS.doombot;
  }
  return RIVAL_PRESETS.feige;
}

function startSwipeDeck(tierId = 'core') {
  appState.tier = tierId;
  appState.fates = {};
  appState.theories = {};
  appState.history = [];
  appState.deck = getCharactersForTier(tierId);
  appState.cardIndex = 0;
  appState.theoryIndex = 0;
  appState.lastCrowdPulseHtml = '';
  appState.viewingFriendOnly = false;
  appState.shareSheetOpen = false;
  appState.timestamp = null;
  appState.view = 'swipe';
  sound.playTick();
  render();
}

function switchTierMidRun(tierId) {
  const newDeck = getCharactersForTier(tierId);
  appState.tier = tierId;
  appState.deck = newDeck;
  if (appState.cardIndex >= newDeck.length) {
    appState.cardIndex = 0;
  }
  appState.view = 'swipe';
  sound.playTick();
  render();
}

function finishToReceipt() {
  appState.timestamp = appState.timestamp || new Date().toISOString();
  appState.viewingFriendOnly = false;
  appState.view = 'receipt';
  if (appState.incomingChallenge) {
    appState.activeRivalKey = 'incoming';
  }
  sound.playPrintReceipt();
  render();
}

function recordCardFate(fateKey) {
  const card = appState.deck[appState.cardIndex];
  if (!card || !FATES[fateKey]) return;

  sound.playSwipe(fateKey);
  appState.fates[card.id] = fateKey;
  appState.history.push({ index: appState.cardIndex, id: card.id });

  const pct = card.crowdOdds?.[fateKey] ?? 25;
  const f = FATES[fateKey];
  appState.lastCrowdPulseHtml = `${icon(f.icon, { size: 14 })}<span>You &amp; ${pct}% say ${esc(card.name)} ${icon('arrow-right', { size: 12 })} ${esc(f.shortLabel)}</span>`;

  appState.cardIndex += 1;

  if (appState.cardIndex >= appState.deck.length) {
    if (appState.tier === 'core' || appState.tier === 'confirmed') {
      appState.view = 'pitstop';
    } else {
      appState.view = 'theories';
      appState.theoryIndex = 0;
    }
  }
  render();
}

function undoLastCard() {
  if (appState.history.length === 0) return;
  const prev = appState.history.pop();
  delete appState.fates[prev.id];
  appState.cardIndex = prev.index;
  appState.view = 'swipe';
  appState.lastCrowdPulseHtml = `${icon('rotate-ccw', { size: 14 })}<span>Undid previous pick</span>`;
  sound.playTick();
  render();
}

function selectTheoryAnswer(optionId) {
  const q = THEORY_QUESTIONS[appState.theoryIndex];
  if (!q) return;
  appState.theories[q.id] = optionId;
  sound.playTick();

  if (appState.theoryIndex + 1 < THEORY_QUESTIONS.length) {
    appState.theoryIndex += 1;
    render();
  } else {
    finishToReceipt();
  }
}

/* ==================== RENDERING ==================== */

function renderChallengePill() {
  const rival = appState.incomingChallenge;
  if (!rival || appState.challengeDismissed) return '';
  const stats = analyzeReceipt(rival);
  return `
    <div class="challenge-pill">
      <div class="challenge-pill-text">
        <strong>${icon('swords', { size: 14 })} Challenged by @${esc(rival.handle)}</strong>
        <span>${icon(stats.persona.badge, { size: 12 })} ${esc(stats.persona.title)} • ${stats.bloodbathPct}% Bloodbath</span>
      </div>
      <div class="challenge-pill-btns">
        <button type="button" class="mini-pill-btn" id="peek-rival-btn">Peek</button>
        <button type="button" class="mini-pill-btn" id="dismiss-challenge-btn" aria-label="Dismiss">${icon('x', { size: 12 })}</button>
      </div>
    </div>
  `;
}

function renderCardContent(char, isBack = false) {
  return `
    <img class="card-photo" src="${esc(char.avatar)}" alt="${esc(char.name)}" loading="eager" draggable="false" />
    <div class="card-scrim"></div>

    <div class="card-top-bar">
      <span class="glass-badge">${esc(char.universe)}</span>
      ${char.rumorBadge ? '<span class="glass-badge is-rumor">RUMORED</span>' : ''}
    </div>

    ${!isBack ? '<div class="swipe-stamp-overlay" id="swipe-stamp"></div>' : ''}

    <div class="card-bottom-info">
      <div class="card-actor-line">${esc(char.actor)} • ${esc(char.alias)}</div>
      <h2 class="card-name">${esc(char.name)}</h2>
      <p class="card-hook">${esc(char.hook)}</p>
    </div>
  `;
}

function renderSwipe() {
  const total = appState.deck.length;
  const idx = appState.cardIndex;
  const current = appState.deck[idx];
  const next = appState.deck[idx + 1];
  const pct = Math.round((idx / total) * 100);
  const answeredCount = Object.keys(appState.fates).length;

  if (!current) return '';

  return `
    ${renderChallengePill()}

    <div class="segmented" role="group" aria-label="Deck Size">
      <button type="button" class="seg-btn ${appState.tier === 'core' ? 'is-active' : ''}" data-tier-switch="core">16 Core</button>
      <button type="button" class="seg-btn ${appState.tier === 'confirmed' ? 'is-active' : ''}" data-tier-switch="confirmed">30 Cast</button>
      <button type="button" class="seg-btn ${appState.tier === 'classified' ? 'is-active' : ''}" data-tier-switch="classified">42 All</button>
    </div>

    <section class="swipe-stage">
      <div class="progress-row">
        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
        <span class="progress-count">${String(idx + 1).padStart(2, '0')} / ${total}</span>
      </div>

      <div class="deck-arena" id="deck-arena">
        ${
          next
            ? `<article class="swipe-card is-back" aria-hidden="true">${renderCardContent(next, true)}</article>`
            : ''
        }
        <article class="swipe-card" id="active-swipe-card">
          ${renderCardContent(current, false)}
        </article>
      </div>

      <div class="crowd-pulse">${appState.lastCrowdPulseHtml || '<span>Swipe card or tap a fate below</span>'}</div>

      <div class="thumb-pad">
        <button type="button" class="thumb-btn" data-fate="die">
          <span class="thumb-icon">${icon('skull', { size: 18 })}</span>
          <span>Dies</span>
        </button>
        <button type="button" class="thumb-btn" data-fate="doom">
          <span class="thumb-icon">${icon('crown', { size: 18 })}</span>
          <span>Kneels</span>
        </button>
        <button type="button" class="thumb-btn" data-fate="variant">
          <span class="thumb-icon">${icon('orbit', { size: 18 })}</span>
          <span>Variant</span>
        </button>
        <button type="button" class="thumb-btn" data-fate="survive">
          <span class="thumb-icon">${icon('shield-check', { size: 18 })}</span>
          <span>Lives</span>
        </button>
      </div>

      <div class="swipe-sub-actions">
        <button type="button" class="text-action-btn" id="undo-btn" ${appState.history.length === 0 ? 'disabled' : ''}>
          ${icon('rotate-ccw', { size: 13 })} Undo
        </button>
        <button type="button" class="text-action-btn" id="skip-to-receipt-btn">
          ${answeredCount > 0 ? `Print Receipt (${answeredCount})` : 'Skip to Theories'} ${icon('arrow-right', { size: 13 })}
        </button>
      </div>
    </section>
  `;
}

function renderPitstop() {
  const isCore = appState.tier === 'core';
  return `
    <section class="minimal-card">
      <div class="minimal-kicker">CHECKPOINT REACHED</div>
      <h2 class="minimal-title">${isCore ? '16 Core Fates Locked' : 'All 30 Confirmed Cast Locked'}</h2>
      <p class="minimal-sub">
        ${
          isCore
            ? 'Lock your 5 multiverse theories and print your receipt now, or keep swiping the full cast.'
            : 'Add the 12 rumored wildcards (Spider-Man, Scarlet Witch, Wolverine, Deadpool) or print now.'
        }
      </p>

      <div class="stack-btns">
        <button type="button" class="btn btn-primary" id="pitstop-theories-btn">
          ${icon('zap', { size: 16 })} <span>5 Quick Theories &amp; Print</span>
        </button>
        <button type="button" class="btn btn-secondary" id="pitstop-skip-receipt-btn">
          ${icon('receipt', { size: 16 })} <span>Print Receipt Immediately</span>
        </button>
        ${
          isCore
            ? `<button type="button" class="btn btn-secondary" id="expand-confirmed-btn">
                ${icon('clapperboard', { size: 16 })} <span>Swipe +14 More (30 Confirmed)</span>
              </button>`
            : ''
        }
        <button type="button" class="btn btn-secondary" id="expand-classified-btn">
          ${icon('eye', { size: 16 })} <span>Swipe ${isCore ? '+26' : '+12'} More (42 + Rumors)</span>
        </button>
      </div>
    </section>
  `;
}

function renderTheories() {
  const q = THEORY_QUESTIONS[appState.theoryIndex];
  const total = THEORY_QUESTIONS.length;
  const pct = Math.round(((appState.theoryIndex + 1) / total) * 100);

  const optsHtml = q.options
    .map(
      (opt) => `
      <button type="button" class="option-pill" data-theory-opt="${opt.id}">
        <span>${esc(opt.label)}</span>
        <span class="odds-chip">${esc(opt.odds)}</span>
      </button>
    `
    )
    .join('');

  return `
    <section class="minimal-card">
      <div class="swipe-sub-actions" style="padding: 0">
        <span class="minimal-kicker">THEORY ${appState.theoryIndex + 1} OF ${total}</span>
        <button type="button" class="text-action-btn" id="skip-theories-btn">Skip to Receipt ${icon('arrow-right', { size: 13 })}</button>
      </div>

      <div class="progress-track">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>

      <h2 class="minimal-title">${esc(q.prompt)}</h2>
      <div class="stack-btns">${optsHtml}</div>
    </section>
  `;
}

function renderReceipt() {
  const state = getActiveReceiptState();
  const themeMeta = THEMES[appState.theme] || THEMES.doom;
  const stats = analyzeReceipt(state);
  const grade = appState.gradingSimulated ? scoreReceipt(state, OFFICIAL_RESULTS) : null;
  const answeredChars = ROSTER.filter((c) => Boolean(state.fates?.[c.id]));

  const rival = getActiveRivalState();
  const comparison = compareReceipts(state, rival);

  const itemsHtml = answeredChars
    .map((c) => {
      const fateKey = state.fates[c.id];
      const f = FATES[fateKey];
      const crowdPct = c.crowdOdds?.[fateKey] ?? 50;
      const isHotTake = crowdPct < 25;
      let gradeIcon = '';
      if (grade) {
        const g = grade.charGrades.find((x) => x.char.id === c.id);
        if (g) {
          gradeIcon = g.hit
            ? icon('check-circle-2', { size: 13, className: 'grade-hit' })
            : icon('x-circle', { size: 13, className: 'grade-miss' });
        }
      }
      return `
        <div class="receipt-item">
          <div class="receipt-item-left">
            <img class="mini-portrait" src="${esc(c.avatar)}" alt="${esc(c.name)}" />
            <span class="receipt-item-name">${gradeIcon}${esc(c.alias === 'DOCTOR DOOM' ? 'DR. DOOM' : c.name)}</span>
            ${isHotTake ? `<span class="rarity-tag">${icon('flame', { size: 11 })}${crowdPct}%</span>` : ''}
          </div>
          <span class="receipt-item-fate" style="color: ${f.color}">${icon(f.icon, { size: 13 })} <span>${esc(f.shortLabel)}</span></span>
        </div>
      `;
    })
    .join('');

  const theoriesHtml = THEORY_QUESTIONS.map((q) => {
    const pick = state.theories?.[q.id];
    const opt = q.options.find((o) => o.id === pick);
    if (!opt) return '';
    let badge = '';
    if (grade) {
      const tg = grade.theoryGrades.find((x) => x.question.id === q.id);
      if (tg) {
        badge = tg.hit
          ? ` ${icon('check-circle-2', { size: 12, className: 'grade-hit' })}`
          : ` ${icon('x-circle', { size: 12, className: 'grade-miss' })}`;
      }
    }
    return `
      <div class="receipt-theory">
        <span class="receipt-theory-q">${esc(q.title)}${badge}</span>
        <span class="receipt-theory-a">${esc(opt.label)}</span>
      </div>
    `;
  }).join('');

  const formatOptionsHtml = THEATER_FORMATS.map(
    (fmt) => `<option value="${esc(fmt)}" ${appState.format === fmt ? 'selected' : ''}>${esc(fmt)}</option>`
  ).join('');

  let tabBodyHtml = '';

  if (appState.receiptTab === 'diff') {
    const clashesHtml =
      comparison.clashes.length > 0
        ? comparison.clashes
            .slice(0, 14)
            .map((cl) => {
              const mf = FATES[cl.mine];
              const tf = FATES[cl.theirs];
              return `
                <div class="clash-card">
                  <div class="clash-left">
                    <img class="mini-portrait" src="${esc(cl.char.avatar)}" alt="${esc(cl.char.name)}" />
                    <strong>${esc(cl.char.name)}</strong>
                  </div>
                  <span class="clash-picks">
                    <strong style="color:${mf.color}">${icon(mf.icon, { size: 12 })} ${mf.shortLabel}</strong>
                    <span style="opacity:0.5">vs</span>
                    <strong style="color:${tf.color}">${icon(tf.icon, { size: 12 })} ${tf.shortLabel}</strong>
                  </span>
                </div>
              `;
            })
            .join('')
        : '<div class="clash-card">100% aligned on every character fate!</div>';

    tabBodyHtml = `
      <div class="match-hero">
        <div class="match-ring" style="--pct: ${comparison.agreementPct}">
          <div class="match-ring-inner">${comparison.agreementPct}%</div>
        </div>
        <div class="persona-strip-title">${esc(comparison.verdict)}</div>
        <div class="persona-strip-sub">vs. @${esc(rival.handle)} (${comparison.matches}/${comparison.totalCompared} aligned)</div>
      </div>

      <div class="receipt-meta-row" style="margin: 10px 0 12px">
        <span style="color: var(--receipt-muted)">COMPARE WITH</span>
        <select id="rival-select" class="inline-select">
          ${appState.incomingChallenge ? `<option value="incoming" ${appState.activeRivalKey === 'incoming' ? 'selected' : ''}>@${esc(appState.incomingChallenge.handle)} (Friend)</option>` : ''}
          <option value="feige" ${appState.activeRivalKey === 'feige' ? 'selected' : ''}>@KEVIN_FEIGE_BURNER</option>
          <option value="doombot" ${appState.activeRivalKey === 'doombot' ? 'selected' : ''}>@DOOM_BOT_616</option>
        </select>
      </div>

      <div style="font-size:10px; font-weight:800; color:var(--receipt-muted); margin-bottom:8px">HEAD-TO-HEAD CLASHES</div>
      ${clashesHtml}
    `;
  } else if (appState.receiptTab === 'crowd') {
    const crowdRowsHtml = answeredChars
      .map((c) => {
        const myFateKey = state.fates[c.id];
        const myFate = FATES[myFateKey];
        const o = c.crowdOdds;
        return `
          <div class="crowd-row">
            <div class="receipt-item">
              <div class="receipt-item-left">
                <img class="mini-portrait" src="${esc(c.avatar)}" alt="${esc(c.name)}" />
                <span class="receipt-item-name">${esc(c.name)}</span>
              </div>
              <span class="receipt-item-fate" style="color:${myFate.color}">YOU: ${icon(myFate.icon, { size: 12 })} ${o[myFateKey]}%</span>
            </div>
            <div class="crowd-bar" title="Survive ${o.survive}% • Die ${o.die}% • Kneel ${o.doom}% • Variant ${o.variant}%">
              <div style="width:${o.survive}%; background:var(--fate-survive)"></div>
              <div style="width:${o.die}%; background:var(--fate-die)"></div>
              <div style="width:${o.doom}%; background:var(--fate-doom)"></div>
              <div style="width:${o.variant}%; background:var(--fate-variant)"></div>
            </div>
          </div>
        `;
      })
      .join('');

    tabBodyHtml = `
      <div class="persona-strip">
        <div class="persona-strip-title">${icon('flame', { size: 16 })} <span>Spice Index: ${stats.spiceScore} / 99</span></div>
        <div class="persona-strip-sub">
          ${
            stats.boldestPick
              ? `Boldest Take: ${esc(stats.boldestPick.char.name)} -> ${FATES[stats.boldestPick.fate].shortLabel} (only ${stats.boldestPick.pct}% agree)`
              : 'Swipe more characters to rank your contrarian takes.'
          }
        </div>
      </div>
      ${crowdRowsHtml}
    `;
  } else {
    tabBodyHtml = `
      ${
        grade
          ? `<div class="persona-strip" style="text-align:center; border-color: var(--accent)">
              <div class="persona-strip-title" style="justify-content:center">${icon('award', { size: 16 })} <span>DEC 18 GRADE: ${grade.accuracyPct}% (${esc(grade.rank)})</span></div>
              <div class="persona-strip-sub">${grade.charHits}/${grade.charTotal} Fates • ${grade.theoryHits}/${grade.theoryTotal} Theories</div>
            </div>`
          : ''
      }
      <div class="receipt-list">${itemsHtml}</div>
      ${
        theoriesHtml
          ? `<hr class="receipt-divider" />
             <div style="font-size:10px; font-weight:800; color:var(--receipt-muted); margin-bottom:7px">PARLAY THEORIES</div>
             ${theoriesHtml}`
          : ''
      }
    `;
  }

  return `
    ${
      appState.viewingFriendOnly
        ? `<div class="challenge-pill">
            <div class="challenge-pill-text">
              <strong>${icon('eye', { size: 14 })} @${esc(state.handle)}'s Receipt</strong>
              <span>Swipe yours to compare Head-to-Head</span>
            </div>
            <button type="button" class="mini-pill-btn" id="swipe-my-own-btn">Swipe Mine</button>
          </div>`
        : ''
    }

    <div class="segmented" role="tablist">
      <button type="button" class="seg-btn ${appState.receiptTab === 'receipt' ? 'is-active' : ''}" data-receipt-tab="receipt">${icon('receipt', { size: 14 })} <span>Receipt</span></button>
      <button type="button" class="seg-btn ${appState.receiptTab === 'diff' ? 'is-active' : ''}" data-receipt-tab="diff">${icon('swords', { size: 14 })} <span>vs. Friend</span></button>
      <button type="button" class="seg-btn ${appState.receiptTab === 'crowd' ? 'is-active' : ''}" data-receipt-tab="crowd">${icon('bar-chart-3', { size: 14 })} <span>Crowd</span></button>
    </div>

    <div class="receipt-toolbar">
      <div class="theme-pills" role="group" aria-label="Receipt Theme">
        <button type="button" class="theme-btn ${appState.theme === 'doom' ? 'is-active' : ''}" data-theme-choice="doom">Doom</button>
        <button type="button" class="theme-btn ${appState.theme === 'tva' ? 'is-active' : ''}" data-theme-choice="tva">TVA</button>
        <button type="button" class="theme-btn ${appState.theme === 'classic' ? 'is-active' : ''}" data-theme-choice="classic">Paper</button>
      </div>
      <button type="button" class="text-action-btn" id="restart-btn">${icon('rotate-ccw', { size: 13 })} <span>Reswipe</span></button>
    </div>

    <div class="receipt-wrapper">
      <div class="serrated-edge"></div>
      <div class="receipt-paper">
        <div class="receipt-header">
          <div class="receipt-badge">${esc(themeMeta.badge)}</div>
          <h1 class="receipt-title">THE DOOMSDAY RECEIPT</h1>
        </div>

        <hr class="receipt-divider" />

        <div class="receipt-meta-row">
          <span style="color:var(--receipt-muted)">OPERATIVE</span>
          ${
            appState.viewingFriendOnly
              ? `<strong>@${esc((state.handle || 'ANONYMOUS').toUpperCase())}</strong>`
              : `<input id="receipt-handle-input" class="inline-edit-input" type="text" maxlength="20" value="${esc(appState.handle)}" aria-label="Edit Handle" />`
          }
        </div>
        <div class="receipt-meta-row">
          <span style="color:var(--receipt-muted)">SHOWTIME</span>
          ${
            appState.viewingFriendOnly
              ? `<strong>${esc(state.format)}</strong>`
              : `<select id="receipt-format-select" class="inline-select" aria-label="Opening Night Format">${formatOptionsHtml}</select>`
          }
        </div>

        <div class="persona-strip">
          <div class="persona-strip-title">${icon(stats.persona.badge, { size: 16 })} <span>${esc(stats.persona.title)}</span></div>
          <div class="persona-strip-sub">BLOODBATH ${stats.bloodbathPct}% • SPICE ${stats.spiceScore}/99 • ${stats.totalAnswered} PICKS</div>
        </div>

        ${tabBodyHtml}

        <hr class="receipt-divider" />

        <div class="receipt-footer-row">
          <div>
            <div style="font-size:9.5px; color:var(--receipt-muted)">ANTI-CHEAT LOCK</div>
            <div class="lock-code">${esc(stats.lockStamp)}</div>
          </div>
          ${generateMatrixSealSvg(stats.lockStamp)}
        </div>
      </div>
      <div class="serrated-edge bottom"></div>
    </div>

    <div style="display:flex; justify-content:center; margin-top: 14px;">
      <label class="mini-pill-btn" style="display:inline-flex; align-items:center; gap:8px; padding: 8px 14px;">
        <input type="checkbox" id="sim-grade-toggle" ${appState.gradingSimulated ? 'checked' : ''} />
        ${icon('sparkles', { size: 13 })}
        <span>Simulate Dec 18 Grading</span>
      </label>
    </div>

    <div class="bottom-dock">
      <div class="bottom-dock-inner">
        <button type="button" class="btn btn-primary" id="open-share-sheet-btn">
          ${icon('share-2', { size: 16 })} <span>Share &amp; Challenge</span>
        </button>
        <button type="button" class="btn btn-secondary" id="quick-save-png-btn">
          ${icon('download', { size: 16 })} <span>Story PNG</span>
        </button>
      </div>
    </div>
  `;
}

function renderShareSheet() {
  if (!appState.shareSheetOpen || appState.view !== 'receipt') {
    sheetRootEl.innerHTML = '';
    return;
  }

  const state = getActiveReceiptState();
  const payload = buildSharePayload(state, window.location.href);
  const encodedText = encodeURIComponent(payload.spicyText);
  const encodedUrl = encodeURIComponent(payload.url);

  sheetRootEl.innerHTML = `
    <div class="sheet-backdrop" id="sheet-backdrop">
      <div class="share-sheet" role="dialog" aria-modal="true" aria-label="Share Doomsday Receipt">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3>Share Your Receipt</h3>
          <button type="button" class="icon-btn" id="close-sheet-btn" aria-label="Close">${icon('x', { size: 16 })}</button>
        </div>
        <p class="minimal-sub" style="font-size: 13px">
          Challenge friends Head-to-Head or drop your 9:16 Story card before Dec 18.
        </p>

        <div class="social-grid">
          <button type="button" class="social-tile" id="native-share-btn">
            <span class="social-tile-icon">${icon('share', { size: 18 })}</span>
            <span>Native Share</span>
          </button>
          <button type="button" class="social-tile" id="sheet-save-png-btn">
            <span class="social-tile-icon">${icon('image-down', { size: 18 })}</span>
            <span>Save 9:16 Story</span>
          </button>
          <a
            class="social-tile"
            href="https://twitter.com/intent/tweet?text=${encodedText}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="social-tile-icon">${icon('x-brand', { size: 17 })}</span>
            <span>Post on X</span>
          </a>
          <a
            class="social-tile"
            href="https://wa.me/?text=${encodedText}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="social-tile-icon">${icon('message-circle', { size: 18 })}</span>
            <span>WhatsApp</span>
          </a>
          <a
            class="social-tile"
            href="sms:?&body=${encodedText}"
          >
            <span class="social-tile-icon">${icon('send', { size: 18 })}</span>
            <span>iMessage / SMS</span>
          </a>
          <button type="button" class="social-tile" id="sheet-copy-link-btn">
            <span class="social-tile-icon">${icon('link', { size: 18 })}</span>
            <span>Copy Link</span>
          </button>
        </div>

        <button type="button" class="btn btn-secondary" id="sheet-copy-spicy-btn" style="width:100%">
          ${icon('flame', { size: 16 })} <span>Copy Group-Chat Trash Talk + Link</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById('sheet-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'sheet-backdrop') {
      appState.shareSheetOpen = false;
      renderShareSheet();
    }
  });
  document.getElementById('close-sheet-btn')?.addEventListener('click', () => {
    appState.shareSheetOpen = false;
    renderShareSheet();
  });
  document.getElementById('native-share-btn')?.addEventListener('click', () => exportAndShareReceipt(true));
  document.getElementById('sheet-save-png-btn')?.addEventListener('click', () => exportAndShareReceipt(false));
  document.getElementById('sheet-copy-link-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(decodeURIComponent(encodedUrl));
      sound.playTick();
      showToast('Challenge link copied!', 'link');
    } catch {
      showToast('Copy link from your address bar!', 'link');
    }
  });
  document.getElementById('sheet-copy-spicy-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(payload.spicyText);
      sound.playStamp();
      showToast('Trash talk + link copied!', 'flame');
    } catch {
      showToast('Clipboard unavailable', 'x-circle');
    }
  });
}

async function exportAndShareReceipt(preferNativeShare = false) {
  const state = getActiveReceiptState();
  const rival = getActiveRivalState();
  const rivalComparison =
    appState.receiptTab === 'diff'
      ? { ...compareReceipts(state, rival), rivalHandle: rival.handle }
      : null;

  showToast('Rendering 9:16 Story PNG...', 'printer');
  const { blob, dataUrl } = await renderReceiptCanvas(state, {
    gradingActive: appState.gradingSimulated,
    rivalComparison,
    siteLabel: window.location.host || 'DOOMSDAYRECEIPT.APP',
  });

  const filename = `doomsday-receipt-${(state.handle || 'agent').toLowerCase().replace(/[^a-z0-9_-]/g, '')}.png`;
  const payload = buildSharePayload(state, window.location.href);

  if (preferNativeShare && navigator.share) {
    try {
      if (blob && navigator.canShare && typeof File !== 'undefined') {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Avengers: Doomsday Receipt',
            text: payload.spicyText,
          });
          sound.playStamp();
          return;
        }
      }
      await navigator.share({
        title: 'My Avengers: Doomsday Receipt',
        text: payload.spicyText,
        url: payload.url,
      });
      sound.playStamp();
      return;
    } catch {
      // User dismissed or unsupported file share -> fall back to download
    }
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  sound.playStamp();
  showToast('9:16 Story PNG saved!', 'check-circle-2');
}

/* ==================== SWIPE GESTURES ==================== */

function attachSwipeGestures() {
  const card = document.getElementById('active-swipe-card');
  const stamp = document.getElementById('swipe-stamp');
  if (!card || !stamp) return;

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let dragging = false;
  let lockedOut = false;

  const detectDirection = (dx, dy) => {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 20 && absY < 20) return null;
    if (absX >= absY) {
      return dx > 0 ? FATES.survive : FATES.die;
    }
    return dy < 0 ? FATES.doom : FATES.variant;
  };

  const onPointerDown = (e) => {
    if (lockedOut) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = 0;
    currentY = 0;
    card.classList.add('is-dragging');
    card.style.transition = 'none';
    card.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging || lockedOut) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    card.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${currentX * 0.05}deg)`;

    const dirFate = detectDirection(currentX, currentY);
    const dist = Math.max(Math.abs(currentX), Math.abs(currentY));
    if (dirFate && dist > 24) {
      stamp.innerHTML = `${icon(dirFate.icon, { size: 22, strokeWidth: 2.5 })} <span>${esc(dirFate.stamp)}</span>`;
      stamp.style.color = dirFate.color;
      stamp.style.opacity = String(Math.min(1, (dist - 24) / 68));
      card.style.borderColor = dirFate.color;
    } else {
      stamp.style.opacity = '0';
      card.style.borderColor = '';
    }
  };

  const onPointerUp = () => {
    if (!dragging || lockedOut) return;
    dragging = false;
    card.classList.remove('is-dragging');

    const dirFate = detectDirection(currentX, currentY);
    const dist = Math.max(Math.abs(currentX), Math.abs(currentY));

    if (dirFate && dist > 72) {
      lockedOut = true;
      const flyX = dirFate.direction === 'right' ? 480 : dirFate.direction === 'left' ? -480 : currentX * 1.5;
      const flyY = dirFate.direction === 'up' ? -440 : dirFate.direction === 'down' ? 440 : currentY * 1.4;
      card.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      card.style.transform = `translate3d(${flyX}px, ${flyY}px, 0) rotate(${flyX * 0.04}deg)`;
      card.style.opacity = '0';
      setTimeout(() => recordCardFate(dirFate.key), 170);
    } else {
      card.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s';
      card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      card.style.borderColor = '';
      stamp.style.opacity = '0';
    }
  };

  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerUp);
}

/* ==================== MAIN RENDER & BINDINGS ==================== */

function render() {
  if (appState.view === 'swipe') {
    rootEl.innerHTML = renderSwipe();
    attachSwipeGestures();
  } else if (appState.view === 'pitstop') {
    rootEl.innerHTML = renderPitstop();
  } else if (appState.view === 'theories') {
    rootEl.innerHTML = renderTheories();
  } else if (appState.view === 'receipt') {
    rootEl.innerHTML = renderReceipt();
    if (!appState.viewingFriendOnly) {
      const payload = buildSharePayload(getActiveReceiptState(), window.location.href);
      try {
        window.history.replaceState(null, '', `?${payload.url.split('?')[1]}`);
      } catch {
        // Ignore
      }
    }
  }
  renderShareSheet();
  bindEvents();
}

function bindEvents() {
  // Challenge pill
  document.getElementById('peek-rival-btn')?.addEventListener('click', () => {
    appState.viewingFriendOnly = true;
    appState.receiptTab = 'receipt';
    appState.view = 'receipt';
    sound.playPrintReceipt();
    render();
  });

  document.getElementById('dismiss-challenge-btn')?.addEventListener('click', () => {
    appState.challengeDismissed = true;
    sound.playTick();
    render();
  });

  // Tier switcher pills
  document.querySelectorAll('[data-tier-switch]').forEach((btn) => {
    btn.addEventListener('click', () => switchTierMidRun(btn.dataset.tierSwitch));
  });

  // Swipe actions
  document.getElementById('undo-btn')?.addEventListener('click', undoLastCard);
  document.getElementById('skip-to-receipt-btn')?.addEventListener('click', () => {
    if (Object.keys(appState.fates).length > 0) {
      finishToReceipt();
    } else {
      appState.view = 'theories';
      appState.theoryIndex = 0;
      sound.playTick();
      render();
    }
  });

  document.querySelectorAll('.thumb-btn').forEach((btn) => {
    btn.addEventListener('click', () => recordCardFate(btn.dataset.fate));
  });

  // Pitstop
  document.getElementById('pitstop-theories-btn')?.addEventListener('click', () => {
    appState.view = 'theories';
    appState.theoryIndex = 0;
    sound.playTick();
    render();
  });
  document.getElementById('pitstop-skip-receipt-btn')?.addEventListener('click', finishToReceipt);
  document.getElementById('expand-confirmed-btn')?.addEventListener('click', () => switchTierMidRun('confirmed'));
  document.getElementById('expand-classified-btn')?.addEventListener('click', () => switchTierMidRun('classified'));

  // Theories
  document.getElementById('skip-theories-btn')?.addEventListener('click', finishToReceipt);
  document.querySelectorAll('[data-theory-opt]').forEach((btn) => {
    btn.addEventListener('click', () => selectTheoryAnswer(btn.dataset.theoryOpt));
  });

  // Receipt controls
  document.getElementById('swipe-my-own-btn')?.addEventListener('click', () => {
    startSwipeDeck(appState.incomingChallenge?.tier || 'core');
  });

  document.querySelectorAll('[data-receipt-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.receiptTab = btn.dataset.receiptTab;
      sound.playTick();
      render();
    });
  });

  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeChoice);
      sound.playTick();
      render();
    });
  });

  document.getElementById('receipt-handle-input')?.addEventListener('input', (e) => {
    appState.handle = e.target.value.trim() || 'ANONYMOUS';
    const stats = analyzeReceipt(getActiveReceiptState());
    const lockEl = document.querySelector('.lock-code');
    if (lockEl) lockEl.textContent = stats.lockStamp;
  });

  document.getElementById('receipt-format-select')?.addEventListener('change', (e) => {
    appState.format = e.target.value;
    sound.playTick();
    render();
  });

  document.getElementById('rival-select')?.addEventListener('change', (e) => {
    appState.activeRivalKey = e.target.value;
    sound.playTick();
    render();
  });

  document.getElementById('sim-grade-toggle')?.addEventListener('change', (e) => {
    appState.gradingSimulated = e.target.checked;
    sound.playStamp();
    render();
  });

  document.getElementById('restart-btn')?.addEventListener('click', () => {
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // Ignore
    }
    startSwipeDeck(appState.tier);
  });

  document.getElementById('open-share-sheet-btn')?.addEventListener('click', () => {
    appState.shareSheetOpen = true;
    sound.playTick();
    renderShareSheet();
  });

  document.getElementById('quick-save-png-btn')?.addEventListener('click', () => exportAndShareReceipt(false));
}

/* ==================== GLOBAL LISTENERS & INIT ==================== */

muteBtn?.addEventListener('click', () => {
  const nextMuted = !sound.isMuted();
  sound.setMuted(nextMuted);
  muteBtn.innerHTML = icon(nextMuted ? 'volume-x' : 'volume-2', { size: 16 });
  if (!nextMuted) sound.playTick();
});

homeBtn?.addEventListener('click', () => {
  appState.shareSheetOpen = false;
  appState.view = 'swipe';
  if (appState.cardIndex >= appState.deck.length) {
    appState.cardIndex = 0;
  }
  sound.playTick();
  render();
});

window.addEventListener('keydown', (e) => {
  if (appState.view !== 'swipe') return;
  const activeTag = document.activeElement?.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    recordCardFate('survive');
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    recordCardFate('die');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    recordCardFate('doom');
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    recordCardFate('variant');
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    undoLastCard();
  }
});

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get('t');
  setTheme(themeParam && THEMES[themeParam] ? themeParam : 'doom');

  const rParam = params.get('r');
  const nParam = params.get('n');
  if (rParam) {
    const decoded = decodeReceipt(rParam, {
      handle: nParam || 'FRIEND_616',
      theme: themeParam || 'doom',
    });
    if (decoded) {
      appState.incomingChallenge = decoded;
      appState.activeRivalKey = 'incoming';
      appState.tier = decoded.tier || 'core';
      appState.deck = getCharactersForTier(appState.tier);
    }
  }
}

initFromUrl();
updateCountdown();
setInterval(updateCountdown, 60000);
render();
