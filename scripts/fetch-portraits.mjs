import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'portraits');

const HEADERS = {
  'User-Agent': 'DoomsdayReceiptBot/1.0 (https://github.com/jayvicsanantonio/doomsday-receipt)',
  Accept: 'application/json, image/*;q=0.9',
};

const WIKIS = {
  mcu: 'https://marvelcinematicuniverse.fandom.com/api.php',
  mcuPage: 'https://marvelcinematicuniverse.fandom.com/wiki/',
  xmen: 'https://xmenmovies.fandom.com/api.php',
  xmenPage: 'https://xmenmovies.fandom.com/wiki/',
  marvel: 'https://marvel.fandom.com/api.php',
  wiki: 'https://en.wikipedia.org/w/api.php',
};

/**
 * Prioritized lookup targets per character ID:
 * Each entry tries MCU Wiki / X-Men Movies Wiki / Wikipedia / Marvel Wiki in order.
 */
const CHARACTER_SOURCES = {
  doom: [
    { source: 'mcu', title: 'Doctor Doom' },
    { source: 'mcu', title: 'Victor von Doom' },
    { source: 'marvel', title: 'Victor von Doom (Earth-616)' },
    { source: 'wiki', title: 'Robert Downey Jr.' },
  ],
  thor: [
    { source: 'mcu', title: 'Thor' },
    { source: 'wiki', title: 'Thor (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Chris Hemsworth' },
  ],
  'sam-cap': [
    { source: 'mcu', title: 'Sam Wilson' },
    { source: 'wiki', title: 'Sam Wilson (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Anthony Mackie' },
  ],
  reed: [
    { source: 'mcu', title: 'Mister Fantastic' },
    { source: 'mcu', title: 'Reed Richards' },
    { source: 'wiki', title: 'Pedro Pascal' },
  ],
  sue: [
    { source: 'mcu', title: 'Invisible Woman' },
    { source: 'mcu', title: 'Sue Storm' },
    { source: 'wiki', title: 'Vanessa Kirby' },
  ],
  strange: [
    { source: 'mcu', title: 'Doctor Strange' },
    { source: 'wiki', title: 'Stephen Strange (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Benedict Cumberbatch' },
  ],
  loki: [
    { source: 'mcu', title: 'Loki' },
    { source: 'wiki', title: 'Loki (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Tom Hiddleston' },
  ],
  steve: [
    { source: 'mcu', title: 'Steve Rogers' },
    { source: 'wiki', title: 'Steve Rogers (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Chris Evans' },
  ],
  xavier: [
    { source: 'mcu', title: 'Professor X' },
    { source: 'xmen', title: 'Charles Xavier (Original Timeline)' },
    { source: 'wiki', title: 'Patrick Stewart' },
  ],
  magneto: [
    { source: 'mcu', title: 'Magneto' },
    { source: 'xmen', title: 'Erik Lehnsherr (Original Timeline)' },
    { source: 'wiki', title: 'Ian McKellen' },
  ],
  cyclops: [
    { source: 'mcu', title: 'Cyclops' },
    { source: 'xmen', title: 'Scott Summers (Original Timeline)' },
    { source: 'wiki', title: 'James Marsden' },
  ],
  yelena: [
    { source: 'mcu', title: 'Yelena Belova' },
    { source: 'wiki', title: 'Yelena Belova (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Florence Pugh' },
  ],
  sentry: [
    { source: 'mcu', title: 'Sentry' },
    { source: 'mcu', title: 'Bob Reynolds' },
    { source: 'wiki', title: 'Lewis Pullman' },
  ],
  shuri: [
    { source: 'mcu', title: 'Shuri' },
    { source: 'wiki', title: 'Shuri (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Letitia Wright' },
  ],
  johnny: [
    { source: 'mcu', title: 'Human Torch' },
    { source: 'mcu', title: 'Johnny Storm' },
    { source: 'wiki', title: 'Joseph Quinn' },
  ],
  gambit: [
    { source: 'mcu', title: 'Gambit' },
    { source: 'xmen', title: 'Remy LeBeau' },
    { source: 'wiki', title: 'Channing Tatum' },
  ],
  bucky: [
    { source: 'mcu', title: 'Bucky Barnes' },
    { source: 'wiki', title: 'Bucky Barnes (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Sebastian Stan' },
  ],
  antman: [
    { source: 'mcu', title: 'Ant-Man' },
    { source: 'mcu', title: 'Scott Lang' },
    { source: 'wiki', title: 'Paul Rudd' },
  ],
  ben: [
    { source: 'mcu', title: 'The Thing' },
    { source: 'mcu', title: 'Ben Grimm' },
    { source: 'wiki', title: 'Ebon Moss-Bachrach' },
  ],
  shangchi: [
    { source: 'mcu', title: 'Shang-Chi' },
    { source: 'wiki', title: 'Simu Liu' },
  ],
  namor: [
    { source: 'mcu', title: 'Namor' },
    { source: 'wiki', title: 'Tenoch Huerta' },
  ],
  beast: [
    { source: 'mcu', title: 'Beast' },
    { source: 'xmen', title: 'Hank McCoy' },
    { source: 'wiki', title: 'Kelsey Grammer' },
  ],
  nightcrawler: [
    { source: 'xmen', title: 'Kurt Wagner' },
    { source: 'xmen', title: 'Nightcrawler' },
    { source: 'wiki', title: 'Alan Cumming' },
  ],
  mystique: [
    { source: 'mcu', title: 'Mystique' },
    { source: 'xmen', title: 'Raven Darkhölme (Original Timeline)' },
    { source: 'wiki', title: 'Rebecca Romijn' },
  ],
  redguardian: [
    { source: 'mcu', title: 'Red Guardian' },
    { source: 'mcu', title: 'Alexei Shostakov' },
    { source: 'wiki', title: 'David Harbour' },
  ],
  usagent: [
    { source: 'mcu', title: 'U.S. Agent' },
    { source: 'mcu', title: 'John Walker' },
    { source: 'wiki', title: 'Wyatt Russell' },
  ],
  falcon: [
    { source: 'mcu', title: 'Falcon' },
    { source: 'mcu', title: 'Joaquin Torres' },
    { source: 'wiki', title: 'Danny Ramirez' },
  ],
  mbaku: [
    { source: 'mcu', title: "M'Baku" },
    { source: 'wiki', title: 'Winston Duke' },
  ],
  ghost: [
    { source: 'mcu', title: 'Ghost' },
    { source: 'mcu', title: 'Ava Starr' },
    { source: 'wiki', title: 'Hannah John-Kamen' },
  ],
  peggy: [
    { source: 'mcu', title: 'Peggy Carter' },
    { source: 'wiki', title: 'Peggy Carter (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Hayley Atwell' },
  ],
  spiderman: [
    { source: 'mcu', title: 'Spider-Man' },
    { source: 'wiki', title: 'Peter Parker (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Tom Holland' },
  ],
  wanda: [
    { source: 'mcu', title: 'Scarlet Witch' },
    { source: 'wiki', title: 'Wanda Maximoff (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Elizabeth Olsen' },
  ],
  wolverine: [
    { source: 'mcu', title: 'Wolverine' },
    { source: 'xmen', title: 'Logan' },
    { source: 'wiki', title: 'Hugh Jackman' },
  ],
  deadpool: [
    { source: 'mcu', title: 'Deadpool' },
    { source: 'xmen', title: 'Wade Wilson' },
    { source: 'wiki', title: 'Ryan Reynolds' },
  ],
  franklin: [
    { source: 'mcu', title: 'Franklin Richards' },
    { source: 'marvel', title: 'Franklin Richards (Earth-616)' },
    { source: 'wiki', title: 'Franklin Richards' },
  ],
  monica: [
    { source: 'mcu', title: 'Monica Rambeau' },
    { source: 'wiki', title: 'Teyonah Parris' },
  ],
  starlord: [
    { source: 'mcu', title: 'Star-Lord' },
    { source: 'wiki', title: 'Peter Quill (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Chris Pratt' },
  ],
  vision: [
    { source: 'mcu', title: 'Vision' },
    { source: 'wiki', title: 'Vision (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Paul Bettany' },
  ],
  clea: [
    { source: 'mcu', title: 'Clea' },
    { source: 'wiki', title: 'Charlize Theron' },
  ],
  hulk: [
    { source: 'mcu', title: 'Hulk' },
    { source: 'wiki', title: 'Bruce Banner (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Mark Ruffalo' },
  ],
  captainmarvel: [
    { source: 'mcu', title: 'Captain Marvel' },
    { source: 'wiki', title: 'Carol Danvers (Marvel Cinematic Universe)' },
    { source: 'wiki', title: 'Brie Larson' },
  ],
  jeangrey: [
    { source: 'xmen', title: 'Jean Grey' },
    { source: 'wiki', title: 'Famke Janssen' },
  ],
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) return null;
  return res.json();
}

async function resolvePageImageApi(apiBase, title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'pageimages',
    piprop: 'thumbnail|original',
    pithumbsize: '700',
    redirects: '1',
    format: 'json',
  });
  const data = await fetchJson(`${apiBase}?${params.toString()}`);
  const pages = data?.query?.pages;
  if (!pages) return null;
  for (const page of Object.values(pages)) {
    if (page.missing !== undefined) continue;
    const url = page.thumbnail?.source || page.original?.source;
    if (url && !/placeholder|no_image|default/i.test(url)) {
      return url;
    }
  }
  return null;
}

async function resolveFandomOgImage(pageBase, title) {
  const slug = encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(`${pageBase}${slug}`, { headers: { ...HEADERS, Accept: 'text/html' }, redirect: 'follow' });
  if (!res.ok) return null;
  const html = await res.text();
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (!match) return null;
  let url = match[1].replace(/&amp;/g, '&');
  if (/Site-community-image|Fandom_logo|wikia_logo/i.test(url)) return null;
  // Normalize wikia image URL to a crisp 700px width
  if (url.includes('static.wikia.nocookie.net') && url.includes('/revision/latest')) {
    url = url.replace(/\/revision\/latest.*$/, '/revision/latest/scale-to-width-down/700');
  }
  return url;
}

async function resolveCandidateUrl(candidate) {
  if (candidate.source === 'wiki') {
    return resolvePageImageApi(WIKIS.wiki, candidate.title);
  }
  if (candidate.source === 'marvel') {
    const api = await resolvePageImageApi(WIKIS.marvel, candidate.title);
    if (api) return api;
    return resolveFandomOgImage('https://marvel.fandom.com/wiki/', candidate.title);
  }
  if (candidate.source === 'xmen') {
    const api = await resolvePageImageApi(WIKIS.xmen, candidate.title);
    if (api) return api;
    return resolveFandomOgImage(WIKIS.xmenPage, candidate.title);
  }
  // mcu
  const api = await resolvePageImageApi(WIKIS.mcu, candidate.title);
  if (api) return api;
  return resolveFandomOgImage(WIKIS.mcuPage, candidate.title);
}

function isJpeg(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function isPng(buf) {
  return buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

function isWebp(buf) {
  return buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
}

async function downloadAndSaveJpg(url, destPath) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': HEADERS['User-Agent'],
      Accept: 'image/jpeg,image/png,image/*;q=0.8',
    },
    redirect: 'follow',
  });
  if (!res.ok) return false;
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  if (buf.length < 4000) return false;

  if (isJpeg(buf)) {
    fs.writeFileSync(destPath, buf);
    return true;
  }

  if (isPng(buf) || isWebp(buf)) {
    const tmpPath = `${destPath}.tmp`;
    fs.writeFileSync(tmpPath, buf);
    try {
      execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', tmpPath, '--out', destPath], {
        stdio: 'ignore',
      });
      fs.unlinkSync(tmpPath);
      return fs.existsSync(destPath) && fs.statSync(destPath).size > 4000;
    } catch {
      fs.renameSync(tmpPath, destPath);
      return true;
    }
  }

  return false;
}

async function fetchOne(id, candidates) {
  const destPath = path.join(OUT_DIR, `${id}.jpg`);
  for (const cand of candidates) {
    try {
      const imgUrl = await resolveCandidateUrl(cand);
      if (!imgUrl) continue;
      const ok = await downloadAndSaveJpg(imgUrl, destPath);
      if (ok) {
        const sizeKb = Math.round(fs.statSync(destPath).size / 1024);
        console.log(`✅ ${id.padEnd(14)} <- [${cand.source}:${cand.title}] (${sizeKb} KB)`);
        return { id, ok: true, source: cand.source, title: cand.title, url: imgUrl };
      }
    } catch (err) {
      // Try next fallback candidate
    }
  }
  console.error(`❌ ${id.padEnd(14)} FAILED across all candidates`);
  return { id, ok: false };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const filter = new Set(process.argv.slice(2));
  const entries = Object.entries(CHARACTER_SOURCES).filter(([id]) => filter.size === 0 || filter.has(id));
  const results = [];

  // Process in batches of 4 to be polite to APIs
  for (let i = 0; i < entries.length; i += 4) {
    const batch = entries.slice(i, i + 4);
    const batchRes = await Promise.all(batch.map(([id, cands]) => fetchOne(id, cands)));
    results.push(...batchRes);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nDownloaded ${results.length - failed.length}/${results.length} portraits.`);
  if (failed.length > 0) {
    console.error('Missing portraits:', failed.map((f) => f.id).join(', '));
    process.exitCode = 1;
  }
}

main();
