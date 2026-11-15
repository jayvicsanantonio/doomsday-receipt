# THE DOOMSDAY RECEIPT

Pre-premiere *Avengers: Doomsday* (December 18, 2026) survival prediction deck, theory parlay, and cryptographically stamped social receipt web app built with zero runtime dependencies.

## Features

- **Minimalist Mobile-First Swipe Deck (`max-width: 430px`)**: Full-bleed photographic character cards across 42 MCU, Fantastic Four, and Fox X-Men characters organized into 3 switchable tiers (`16 Core`, `30 Cast`, `42 All`).
- **4-Way Fate Predictions**: Swipe or tap to assign `Lives` (`LIFEBOAT`), `Dies` (`PRUNED / KIA`), `Kneels` (`DOOM'S COURT`), or `Variant` (`VARIANT TWIST`) with Web Audio + haptic feedback.
- **5 Multiverse Theory Parlays**: Quick-tap spoiler bets (with one-tap skip straight to the receipt).
- **Compact 27-Character URL Codec**: Encodes up to 42 character fates, 5 theory locks, tier, showtime format, and timestamp into a single `~27`-character URL parameter (`?r=...`) for backendless Head-to-Head challenges.
- **Anti-Cheat Lock & Matrix Seal**: Deterministic lock hash (`DOOM-XXXX-XXXX-XXXX`) and vector matrix seal anchored to predictions, handle, and timestamp.
- **3-Tab Social Receipt (`Receipt` | `vs. Friend` | `Crowd`)**:
  - Switch between `Doom`, `TVA`, and `Paper` thermal receipt themes and edit handle/showtime inline.
  - Compare Head-to-Head agreement percentage and clashes against friends or built-in rivals (`@KEVIN_FEIGE_BURNER`, `@DOOM_BOT_616`).
  - Inspect Spice Index and crowd consensus odds bars, or preview post-premiere scoring with the `Simulate Dec 18 Grading` toggle.
- **Native Social Share Sheet & 9:16 Story PNG**: Exports a 1080x1920 vertical Story receipt PNG on `<canvas>` with circular clipped character portraits and vector glyphs, plus one-tap Native Web Share, X, WhatsApp, iMessage/SMS, Link Copy, and Trash Talk copy.
- **Lucide Vector Icon System**: Crisp inline SVGs and 2D `<canvas>` vector icons with zero emojis across UI and exported Story cards.

## Project Structure

- `index.html` — Minimalist single-column phone shell entry point
- `server.mjs` — Zero-dependency static HTTP dev server (`127.0.0.1:4173`)
- `src/app.js` — Swipe gestures, state, 3-tab receipt view, and social share sheet
- `src/styles.css` — Dark glassmorphic mobile-first styling and thermal receipt skins
- `src/data/roster.js` — 42-character cast roster, fate definitions, 5 theories, and grading presets
- `src/utils/codec.js` — Base-5 bitpacked URL codec, lock stamp hash, Head-to-Head diff, and scoring
- `src/utils/icons.js` — Local Lucide-style SVG icon library and 2D canvas vector glyph renderer
- `src/utils/receiptCanvas.js` — 1080x1920 vertical Story PNG receipt generator
- `src/utils/sound.js` — Web Audio synthesizer and mobile haptic feedback
- `public/portraits/` — 42 real MCU/X-Men/F4 character portrait JPEGs
- `scripts/fetch-portraits.mjs` — Script used to fetch and normalize character portrait JPEGs
- `test.mjs` — Verification test suite

## Running Locally

```bash
npm start
```

Then open `http://127.0.0.1:4173/` (best previewed in mobile device mode or on your phone).

## Running Tests

```bash
npm test
```
