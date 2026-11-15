import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FATES,
  OFFICIAL_RESULTS,
  RIVAL_PRESETS,
  ROSTER,
  THEATER_FORMATS,
  THEORY_QUESTIONS,
} from './src/data/roster.js';
import { icon, ICONS } from './src/utils/icons.js';
import {
  analyzeReceipt,
  buildSharePayload,
  compareReceipts,
  computeLockStamp,
  decodeReceipt,
  encodeReceipt,
  getCharactersForTier,
  scoreReceipt,
} from './src/utils/codec.js';
import { createServer } from './server.mjs';

let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`✅ ${name}`);
}

async function testAsync(name, fn) {
  await fn();
  passed += 1;
  console.log(`✅ ${name}`);
}

test('Roster has exact 42 characters across 3 tiers (16 core, 14 confirmed, 12 classified)', () => {
  assert.equal(ROSTER.length, 42);
  const core = ROSTER.filter((c) => c.tier === 'core');
  const confirmed = ROSTER.filter((c) => c.tier === 'confirmed');
  const classified = ROSTER.filter((c) => c.tier === 'classified');

  assert.equal(core.length, 16);
  assert.equal(confirmed.length, 14);
  assert.equal(classified.length, 12);

  assert.equal(getCharactersForTier('core').length, 16);
  assert.equal(getCharactersForTier('confirmed').length, 30);
  assert.equal(getCharactersForTier('classified').length, 42);

  const ids = new Set(ROSTER.map((c) => c.id));
  assert.equal(ids.size, 42, 'Character IDs must be unique');
});

test('Every character crowdOdds sums strictly to 100%', () => {
  for (const char of ROSTER) {
    const sum =
      char.crowdOdds.survive +
      char.crowdOdds.die +
      char.crowdOdds.doom +
      char.crowdOdds.variant;
    assert.equal(sum, 100, `crowdOdds mismatch for ${char.id}: ${sum}`);
  }
});

test('URL Codec round-trip preserves all 42 character fates, 5 theory picks, tier & format', () => {
  const fateCycle = ['survive', 'die', 'doom', 'variant'];
  const fullFates = {};
  ROSTER.forEach((char, idx) => {
    fullFates[char.id] = fateCycle[idx % 4];
  });

  const sampleState = {
    handle: 'JAYVIC_616',
    theme: 'tva',
    tier: 'classified',
    format: THEATER_FORMATS[1],
    timestamp: '2026-12-11T15:00:00.000Z',
    fates: fullFates,
    theories: {
      rdj_identity: 'C',
      act1_bloodbath: 'B',
      first_earth: 'A',
      doom_traitor: 'D',
      final_frame: 'C',
    },
  };

  const token = encodeReceipt(sampleState);
  assert.ok(token.length < 36, `Token unexpectedly long: ${token.length}`);

  const decoded = decodeReceipt(token, { handle: 'JAYVIC_616', theme: 'tva' });
  assert.ok(decoded, 'Decoded state must not be null');
  assert.equal(decoded.tier, 'classified');
  assert.equal(decoded.format, THEATER_FORMATS[1]);
  assert.equal(decoded.timestamp, '2026-12-11T15:00:00.000Z');
  assert.deepEqual(decoded.fates, fullFates);
  assert.deepEqual(decoded.theories, sampleState.theories);
});

test('URL Codec preserves partial 16-card core deck without phantom answers', () => {
  const coreChars = getCharactersForTier('core');
  const partialFates = {};
  coreChars.forEach((c, idx) => {
    partialFates[c.id] = idx % 2 === 0 ? 'survive' : 'die';
  });

  const token = encodeReceipt({
    tier: 'core',
    format: THEATER_FORMATS[0],
    timestamp: '2026-12-12T10:00:00.000Z',
    fates: partialFates,
    theories: { rdj_identity: 'A' },
  });

  const decoded = decodeReceipt(token);
  assert.equal(Object.keys(decoded.fates).length, 16);
  assert.deepEqual(decoded.fates, partialFates);
  assert.deepEqual(decoded.theories, { rdj_identity: 'A' });
});

test('Anti-cheat lock stamp is deterministic and sensitive to tampering', () => {
  const base = {
    handle: 'TESTER',
    tier: 'core',
    format: THEATER_FORMATS[0],
    timestamp: '2026-12-11T12:00:00.000Z',
    fates: { thor: 'die', doom: 'survive' },
    theories: { rdj_identity: 'A' },
  };
  const stamp1 = computeLockStamp(base);
  const stamp2 = computeLockStamp({ ...base });
  const tampered = computeLockStamp({ ...base, fates: { thor: 'survive', doom: 'survive' } });

  assert.match(stamp1, /^DOOM-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(stamp1, stamp2);
  assert.notEqual(stamp1, tampered);
});

test('Head-to-Head comparison accurately computes agreement % and clashes', () => {
  const mine = {
    ...RIVAL_PRESETS.feige,
    fates: {
      ...RIVAL_PRESETS.feige.fates,
      thor: 'survive', // differs from feige ('die')
      gambit: 'die', // differs from feige ('survive')
    },
  };

  const diff = compareReceipts(mine, RIVAL_PRESETS.feige);
  assert.equal(diff.totalCompared, 21); // 16 core chars + 5 theories
  assert.equal(diff.matches, 19);
  assert.equal(diff.clashes.length, 2);
  assert.equal(diff.agreementPct, 90);
  assert.equal(diff.verdict, 'NEXUS TWINS');
});

test('Post-Premiere scoring accurately computes Prophet Score against OFFICIAL_RESULTS', () => {
  const perfectState = {
    fates: { ...OFFICIAL_RESULTS.fates },
    theories: { ...OFFICIAL_RESULTS.theories },
  };
  const perfectGrade = scoreReceipt(perfectState, OFFICIAL_RESULTS);
  assert.equal(perfectGrade.charHits, 42);
  assert.equal(perfectGrade.theoryHits, 5);
  assert.equal(perfectGrade.accuracyPct, 100);
  assert.equal(perfectGrade.rank, 'SUPREME SORCERER PROPHET');

  const zeroState = {
    fates: { thor: 'survive' }, // official is 'die'
    theories: { rdj_identity: 'A' }, // official is 'C'
  };
  const zeroGrade = scoreReceipt(zeroState, OFFICIAL_RESULTS);
  assert.equal(zeroGrade.charHits, 0);
  assert.equal(zeroGrade.theoryHits, 0);
  assert.equal(zeroGrade.accuracyPct, 0);
});

test('Every character has a dedicated JPEG portrait file on disk (>5000 bytes)', () => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  for (const char of ROSTER) {
    assert.equal(char.avatar, `/public/portraits/${char.id}.jpg`);
    const filePath = path.join(rootDir, char.avatar.replace(/^\/+/, ''));
    assert.ok(fs.existsSync(filePath), `Missing portrait JPG for ${char.id}`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 5000, `Portrait JPG too small for ${char.id}: ${stat.size} bytes`);
  }
});

test('Lucide SVG icon library renders cleanly and app files contain zero emojis', () => {
  for (const name of Object.keys(ICONS)) {
    const svg = icon(name, { size: 16 });
    assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), `Invalid SVG output for icon "${name}"`);
  }
  for (const fate of Object.values(FATES)) {
    assert.ok(ICONS[fate.icon], `Missing Lucide icon "${fate.icon}" for fate "${fate.key}"`);
    const svg = icon(fate.icon, { size: 16 });
    assert.ok(svg.includes('<svg'), `Fate icon "${fate.icon}" failed to render`);
  }

  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const filesToCheck = [
    'index.html',
    'src/app.js',
    'src/data/roster.js',
    'src/utils/codec.js',
    'src/utils/receiptCanvas.js',
    'src/utils/icons.js',
  ];
  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    const match = content.match(/\p{Extended_Pictographic}/u);
    assert.equal(match, null, `Found leftover emoji "${match?.[0]}" in ${rel}`);
  }
});

test('Share payload and analytics build cleanly', () => {
  const payload = buildSharePayload(RIVAL_PRESETS.feige, 'https://doomsdayreceipt.app/');
  assert.ok(payload.url.includes('?r='));
  assert.ok(payload.spicyText.includes('#AvengersDoomsday'));
  const stats = analyzeReceipt(RIVAL_PRESETS.feige);
  assert.equal(stats.totalAnswered, 16);
});

await testAsync('HTTP server serves index.html, src/app.js, and src/styles.css with 200 OK', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const fetchStatus = (reqPath) =>
    new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}${reqPath}`, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        })
        .on('error', reject);
    });

  try {
    const home = await fetchStatus('/');
    assert.equal(home.status, 200);
    assert.match(home.headers['content-type'], /text\/html/);
    assert.ok(home.body.includes('THE DOOMSDAY RECEIPT'));

    const appJs = await fetchStatus('/src/app.js');
    assert.equal(appJs.status, 200);
    assert.match(appJs.headers['content-type'], /javascript/);

    const css = await fetchStatus('/src/styles.css');
    assert.equal(css.status, 200);
    assert.match(css.headers['content-type'], /text\/css/);

    const doomPortrait = await fetchStatus('/public/portraits/doom.jpg');
    assert.equal(doomPortrait.status, 200);
    assert.match(doomPortrait.headers['content-type'], /image\/jpeg/);
    assert.ok(doomPortrait.body.length > 5000, `Unexpected small portrait response: ${doomPortrait.body.length}`);

    const missing = await fetchStatus('/nonexistent.png');
    assert.equal(missing.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

console.log(`\n🎉 All ${passed} checks passed!`);
