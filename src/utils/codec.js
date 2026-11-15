import {
  FATES,
  OFFICIAL_RESULTS,
  ROSTER,
  THEATER_FORMATS,
  THEORY_QUESTIONS,
  TIERS,
} from '../data/roster.js';

const FATE_KEYS = ['survive', 'die', 'doom', 'variant'];
const TIER_KEYS = ['core', 'confirmed', 'classified'];
const EPOCH_MS = Date.parse('2026-11-01T00:00:00Z');

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

/**
 * Deterministic 64-bit mixing hash (synchronous, works in Browser and Node).
 */
export function computeLockStamp(state) {
  const canonical = JSON.stringify({
    h: (state.handle || 'ANONYMOUS').toUpperCase(),
    t: state.tier || 'core',
    fmt: state.format || THEATER_FORMATS[0],
    ts: state.timestamp || '',
    f: ROSTER.map((c) => state.fates?.[c.id] || ''),
    q: THEORY_QUESTIONS.map((q) => state.theories?.[q.id] || ''),
  });

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b1;
  for (let i = 0; i < canonical.length; i += 1) {
    const ch = canonical.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= ch + (i << 1);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }

  const p1 = h1.toString(16).toUpperCase().padStart(8, '0');
  const p2 = h2.toString(16).toUpperCase().padStart(8, '0');
  return `DOOM-${p1.slice(0, 4)}-${p2.slice(0, 4)}-${p1.slice(4, 6)}${p2.slice(4, 6)}`;
}

/**
 * Optional full SHA-256 digest via Web Crypto when available.
 */
export async function computeSha256Hex(state) {
  const canonical = JSON.stringify({
    h: (state.handle || 'ANONYMOUS').toUpperCase(),
    t: state.tier || 'core',
    ts: state.timestamp || '',
    f: ROSTER.map((c) => state.fates?.[c.id] || ''),
    q: THEORY_QUESTIONS.map((q) => state.theories?.[q.id] || ''),
  });
  if (globalThis.crypto?.subtle && typeof TextEncoder !== 'undefined') {
    const data = new TextEncoder().encode(canonical);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  return computeLockStamp(state);
}

/**
 * Encode receipt state into a tiny ~27-character URL-safe token.
 */
export function encodeReceipt(state) {
  const bytes = new Uint8Array(20);
  bytes[0] = 0x01; // Version 1

  const tierIdx = Math.max(0, TIER_KEYS.indexOf(state.tier || 'core'));
  const formatIdx = Math.max(0, THEATER_FORMATS.indexOf(state.format || THEATER_FORMATS[0]));
  bytes[1] = ((tierIdx & 0x0f) << 4) | (formatIdx & 0x0f);

  const tsMs = state.timestamp ? Date.parse(state.timestamp) : Date.now();
  const hours = Math.max(0, Math.min(65535, Math.floor((tsMs - EPOCH_MS) / 3600000)));
  bytes[2] = (hours >> 8) & 0xff;
  bytes[3] = hours & 0xff;

  const qVal = (id) => {
    const ans = state.theories?.[id];
    if (!ans) return 0;
    const idx = ['A', 'B', 'C', 'D'].indexOf(ans);
    return idx >= 0 ? idx + 1 : 0;
  };
  const q0 = qVal(THEORY_QUESTIONS[0].id);
  const q1 = qVal(THEORY_QUESTIONS[1].id);
  const q2 = qVal(THEORY_QUESTIONS[2].id);
  const q3 = qVal(THEORY_QUESTIONS[3].id);
  const q4 = qVal(THEORY_QUESTIONS[4].id);
  bytes[4] = q0 + q1 * 5 + q2 * 25;
  bytes[5] = q3 + q4 * 5;

  // Pack 42 characters in groups of 3 using base-5 (14 bytes: indices 6..19)
  for (let i = 0; i < 14; i += 1) {
    let acc = 0;
    let mult = 1;
    for (let j = 0; j < 3; j += 1) {
      const charIdx = i * 3 + j;
      const charObj = ROSTER[charIdx];
      const fateKey = charObj ? state.fates?.[charObj.id] : undefined;
      const fateNum = fateKey ? FATE_KEYS.indexOf(fateKey) + 1 : 0;
      acc += (fateNum >= 0 ? fateNum : 0) * mult;
      mult *= 5;
    }
    bytes[6 + i] = acc;
  }

  return bytesToBase64Url(bytes);
}

/**
 * Decode a compact receipt token back into state. Returns null if malformed.
 */
export function decodeReceipt(token, extra = {}) {
  if (!token || typeof token !== 'string') return null;
  try {
    const bytes = base64UrlToBytes(token.trim());
    if (bytes.length !== 20 || bytes[0] !== 0x01) return null;

    const tierIdx = (bytes[1] >> 4) & 0x0f;
    const formatIdx = bytes[1] & 0x0f;
    const tier = TIER_KEYS[tierIdx] || 'core';
    const format = THEATER_FORMATS[formatIdx] || THEATER_FORMATS[0];

    const hours = (bytes[2] << 8) | bytes[3];
    const timestamp = new Date(EPOCH_MS + hours * 3600000).toISOString();

    const optChar = (val) => (val >= 1 && val <= 4 ? ['A', 'B', 'C', 'D'][val - 1] : undefined);
    const theories = {};
    const q0 = bytes[4] % 5;
    const q1 = Math.floor(bytes[4] / 5) % 5;
    const q2 = Math.floor(bytes[4] / 25) % 5;
    const q3 = bytes[5] % 5;
    const q4 = Math.floor(bytes[5] / 5) % 5;

    [q0, q1, q2, q3, q4].forEach((val, idx) => {
      const letter = optChar(val);
      if (letter && THEORY_QUESTIONS[idx]) {
        theories[THEORY_QUESTIONS[idx].id] = letter;
      }
    });

    const fates = {};
    for (let i = 0; i < 14; i += 1) {
      let rem = bytes[6 + i];
      for (let j = 0; j < 3; j += 1) {
        const charIdx = i * 3 + j;
        const digit = rem % 5;
        rem = Math.floor(rem / 5);
        const charObj = ROSTER[charIdx];
        if (charObj && digit >= 1 && digit <= 4) {
          fates[charObj.id] = FATE_KEYS[digit - 1];
        }
      }
    }

    return {
      handle: extra.handle || 'ANONYMOUS',
      theme: extra.theme || 'doom',
      tier,
      format,
      timestamp,
      fates,
      theories,
    };
  } catch {
    return null;
  }
}

/**
 * Filter roster by tier.
 */
export function getCharactersForTier(tierId) {
  if (tierId === 'classified') return ROSTER;
  if (tierId === 'confirmed') return ROSTER.filter((c) => c.tier === 'core' || c.tier === 'confirmed');
  return ROSTER.filter((c) => c.tier === 'core');
}

/**
 * Compute Receipt Analytics: Bloodbath %, Spice/Contrarian Score, Persona Title, Stats.
 */
export function analyzeReceipt(state) {
  const fates = state.fates || {};
  const theories = state.theories || {};
  const answeredIds = Object.keys(fates).filter((id) => Boolean(fates[id]));
  const total = answeredIds.length || 1;

  const counts = { survive: 0, die: 0, doom: 0, variant: 0 };
  let contrarianPoints = 0;
  let boldestPick = null;

  for (const id of answeredIds) {
    const fate = fates[id];
    if (counts[fate] !== undefined) counts[fate] += 1;
    const char = ROSTER.find((c) => c.id === id);
    if (char && char.crowdOdds?.[fate] !== undefined) {
      const pct = char.crowdOdds[fate];
      const rarity = 100 - pct;
      contrarianPoints += rarity;
      if (!boldestPick || rarity > boldestPick.rarity) {
        boldestPick = { char, fate, pct, rarity };
      }
    }
  }

  let theorySpice = 0;
  let theoryCount = 0;
  for (const q of THEORY_QUESTIONS) {
    const pick = theories[q.id];
    const opt = q.options.find((o) => o.id === pick);
    if (opt) {
      theorySpice += opt.contrarian;
      theoryCount += 1;
    }
  }

  const bloodbathPct = Math.round(((counts.die + counts.doom * 0.5) / total) * 100);
  const casualtyPct = Math.round((counts.die / total) * 100);
  const survivalPct = Math.round((counts.survive / total) * 100);
  const avgCharRarity = contrarianPoints / total;
  const avgTheoryRarity = theoryCount > 0 ? theorySpice / theoryCount : 30;
  const spiceScore = Math.min(99, Math.max(5, Math.round(avgCharRarity * 0.65 + avgTheoryRarity * 0.35)));

  let persona = { title: 'MULTIVERSE REALIST', badge: 'scale', summary: 'Balanced bets between tragedy and hope.' };
  if (counts.die / total >= 0.55) {
    persona = {
      title: 'RUTHLESS BEYONDER',
      badge: 'skull',
      summary: 'You expect an opening-act bloodbath worthy of Infinity War.',
    };
  } else if (counts.doom / total >= 0.35) {
    persona = {
      title: 'LATVERIAN LOYALIST',
      badge: 'crown',
      summary: 'You know all hope lies in Doom. Kneel before Battleworld.',
    };
  } else if (counts.variant / total >= 0.3) {
    persona = {
      title: 'TIMELINE CHAOS AGENT',
      badge: 'orbit',
      summary: 'Trust no one. Every familiar face is hiding a variant twist.',
    };
  } else if (counts.survive / total >= 0.72) {
    persona = {
      title: 'HOPELESS 616 OPTIMIST',
      badge: 'shield-check',
      summary: 'Saving seats on Reed’s Lifeboat for almost everybody.',
    };
  } else if (spiceScore >= 65) {
    persona = {
      title: 'CONTRARIAN ORACLE',
      badge: 'flame',
      summary: 'Fading the consensus on almost every major MCU fate.',
    };
  }

  return {
    totalAnswered: answeredIds.length,
    counts,
    bloodbathPct,
    casualtyPct,
    survivalPct,
    spiceScore,
    boldestPick,
    persona,
    lockStamp: computeLockStamp(state),
  };
}

/**
 * Compute Head-to-Head Diff between the user's receipt and a friend's receipt.
 */
export function compareReceipts(myState, friendState) {
  const myFates = myState.fates || {};
  const friendFates = friendState.fates || {};
  const sharedChars = ROSTER.filter((c) => myFates[c.id] && friendFates[c.id]);

  let matches = 0;
  const clashes = [];
  const agreements = [];

  for (const char of sharedChars) {
    const mine = myFates[char.id];
    const theirs = friendFates[char.id];
    if (mine === theirs) {
      matches += 1;
      agreements.push({ char, fate: mine });
    } else {
      clashes.push({ char, mine, theirs });
    }
  }

  const theoryMatches = [];
  const theoryClashes = [];
  for (const q of THEORY_QUESTIONS) {
    const m = myState.theories?.[q.id];
    const t = friendState.theories?.[q.id];
    if (m && t) {
      if (m === t) {
        matches += 1;
        theoryMatches.push({ question: q, pick: m });
      } else {
        theoryClashes.push({ question: q, mine: m, theirs: t });
      }
    }
  }

  const totalCompared = sharedChars.length + theoryMatches.length + theoryClashes.length;
  const agreementPct = totalCompared > 0 ? Math.round((matches / totalCompared) * 100) : 0;

  let verdict = 'TIMELINE RIVALS';
  if (agreementPct >= 80) verdict = 'NEXUS TWINS';
  else if (agreementPct >= 60) verdict = 'UNEASY ALLIES';
  else if (agreementPct <= 35) verdict = 'INCURSION ENEMIES';

  return {
    totalCompared,
    matches,
    agreementPct,
    verdict,
    clashes,
    agreements,
    theoryMatches,
    theoryClashes,
  };
}

/**
 * Grade a receipt against OFFICIAL_RESULTS (or simulated Dec 18 outcomes).
 */
export function scoreReceipt(state, official = OFFICIAL_RESULTS) {
  const charGrades = [];
  let charHits = 0;
  let charTotal = 0;

  for (const char of ROSTER) {
    const picked = state.fates?.[char.id];
    const actual = official.fates?.[char.id];
    if (picked && actual) {
      charTotal += 1;
      const hit = picked === actual;
      if (hit) charHits += 1;
      charGrades.push({ char, picked, actual, hit });
    }
  }

  const theoryGrades = [];
  let theoryHits = 0;
  let theoryTotal = 0;
  for (const q of THEORY_QUESTIONS) {
    const picked = state.theories?.[q.id];
    const actual = official.theories?.[q.id];
    if (picked && actual) {
      theoryTotal += 1;
      const hit = picked === actual;
      if (hit) theoryHits += 1;
      theoryGrades.push({ question: q, picked, actual, hit });
    }
  }

  // Weight theories 2x for Prophet Score
  const earnedPoints = charHits + theoryHits * 2;
  const maxPoints = charTotal + theoryTotal * 2;
  const accuracyPct = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  let rank = 'TIMELINE CASUALTY';
  if (accuracyPct >= 85) rank = 'SUPREME SORCERER PROPHET';
  else if (accuracyPct >= 70) rank = 'TVA MASTER ANALYST';
  else if (accuracyPct >= 50) rank = 'SURVIVOR OF BATTLEWORLD';

  return {
    charHits,
    charTotal,
    theoryHits,
    theoryTotal,
    earnedPoints,
    maxPoints,
    accuracyPct,
    rank,
    charGrades,
    theoryGrades,
  };
}

/**
 * Build shareable challenge URL and spicy group-chat copy.
 */
export function buildSharePayload(state, baseUrl = '') {
  const token = encodeReceipt(state);
  const params = new URLSearchParams();
  params.set('r', token);
  if (state.handle && state.handle !== 'ANONYMOUS') {
    params.set('n', state.handle);
  }
  if (state.theme && state.theme !== 'doom') {
    params.set('t', state.theme);
  }
  const cleanBase = baseUrl.split('?')[0];
  const url = `${cleanBase}?${params.toString()}`;
  const stats = analyzeReceipt(state);

  const callouts = [];
  if (state.fates?.thor === 'die') callouts.push('Thor DIES');
  if (state.fates?.strange === 'doom') callouts.push('Doctor Strange KNEELS to Doom');
  if (state.fates?.loki === 'die') callouts.push('Loki falls');
  if (state.fates?.steve === 'variant') callouts.push('Chris Evans is an evil variant');
  if (callouts.length === 0 && stats.boldestPick) {
    const f = FATES[stats.boldestPick.fate];
    callouts.push(`${stats.boldestPick.char.name} -> ${f.shortLabel} (only ${stats.boldestPick.pct}% agree)`);
  }

  const spicyText = [
    `My #AvengersDoomsday Receipt is LOCKED [${stats.lockStamp}]`,
    `Persona: ${stats.persona.title} | Bloodbath: ${stats.bloodbathPct}% | Spice: ${stats.spiceScore}/99`,
    `Hot Take: ${callouts.slice(0, 2).join(' & ')}.`,
    `Think you can beat my picks before Dec 18? Print yours & compare Head-to-Head:`,
    url,
  ].join('\n');

  return { token, url, spicyText, stats };
}
