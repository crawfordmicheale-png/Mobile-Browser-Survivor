# EMBER

A mobile-first **survivor bullet-hell** in the browser. A single dying spark of
light holds back the encroaching dark — burn brighter, or fade. Simple theme,
deep meta-progression.

No build step, no dependencies. Pure HTML + CSS + a single vanilla-JS canvas
engine. Runs from any static host or straight off the filesystem.

## Play

Open `index.html` in a browser (mobile or desktop), or serve the folder:

```bash
python3 -m http.server 8080   # then visit http://localhost:8080
```

### Deploying to GitHub Pages

This repo deploys via GitHub Actions (`.github/workflows/pages.yml`), which is
faster and more reliable than the legacy "build from a branch" path. One-time
setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After that, every push to `main` publishes automatically in about a minute (see
the run under the repo's **Actions** tab). A `.nojekyll` file keeps Pages from
running the files through Jekyll, and the service worker is network-first, so a
new deploy always shows up when you're online (no manual cache-clearing).

### Controls
- **Move** — touch and drag anywhere; a floating stick appears under your thumb.
  Desktop: mouse drag, or `WASD` / arrow keys.
- **Attack** — fully automatic. You only steer.
- **Motes** — the blue sparks are experience. Collect them to level up and pick
  an upgrade from three (four with enough Fortune) cards. Limited rerolls.

## The loop

1. **Descend.** Survive waves that thicken every minute. Foes escalate — husks,
   shard swarms, brutes, aiming Sentinels, charging **Lancers**, dividing cells,
   volatile **Igniters** (they burst into a ring of bolts on death), and circling
   Orbiters. Every three minutes a boss rises, alternating between the **Warden**
   (spiral fire) and the elite **Devourer** (aimed volleys + swarm summons).
2. **Level up** mid-run — gain new weapons or stack passive upgrades. Each card
   shows the weapon's live art.
3. **Chain kills** to build a streak — keep the combo alive for bonus cinders.
4. **Fall** (or hold to 20:00 and win). Every descent earns **cinders** whether
   you win or die.
5. **Spend** cinders in the **Forge** and unlock **Embers**, then descend stronger.

### Ways to play
- **Descend** — the standard endless run.
- **Trials** — optional curses (faster/tougher/more enemies, frailer you, harsher
  bosses). Each raises the run's cinder payout; stack them for bigger rewards.
- **Daily Trial** — a reproducible run seeded from the date, the same starting
  sequence for everyone that day, with its own saved best.

## Deep meta-progression (persistent, saved to `localStorage`)

- **The Forge** — 16 permanent upgrades, each with multiple ranks and rising cost:
  Vitality, Might, Haste, Swiftness, Precision, Ferocity, Magnetism, Wisdom,
  Greed, Fortune, Regeneration, Resilience, Multiplicity, Momentum, Rebirth,
  and Head Start.
- **Embers** — 6 unlockable characters, each with a different starting weapon and
  temperament (The Spark, Nova, Warden, Hunter, Storm, Glutton). Unlocked with
  cinders or by earning achievements.
- **Achievements** — survival, level, and lifetime-kill milestones that unlock
  Embers and are tracked across runs.
- **Ascension (prestige)** — once you've invested enough in the Forge, ascend to
  reset all forge ranks and cinders for a permanent stacking power multiplier.
- **Trials** — persistent per-run modifier toggles (curses) that trade difficulty
  for a cinder-gain bonus.

## Weapon evolutions

Take a weapon to its max level **and** pick up its matching passive, and a special
**Evolution** card appears at your next level-up — upgrading the weapon into a
far stronger, white-gold form (e.g. Spark → **Starfall**, Nova → **Supernova**,
Lance → **Sunlance**). Each weapon has one evolution; the Codex lists the pairings.

## Game feel

Combat is juiced: brief **hit-stop** on crits, boss kills, and taking damage;
**slow-motion and a screen flash** when a boss falls; floating **damage numbers**
on direct hits and **+cinder / streak popups**; comet **trails** on the XP motes
you vacuum up; a **kill-streak combo** that pays bonus cinders; plus screen shake,
particles, and a low-life vignette.

## Codex tracking

The Codex bestiary fills in as you play — foes you haven't met yet show as `???`
until first encountered, with a running **seen count**.

## Weapons (in-run)

Spark (diamond bolts), Nova (radial burst), Orbit (guardian flames), Lance
(piercing beam), Arc (chain lightning), Pyre Aura (burning field), and Cinder
Field (lingering ground). Each has its own neon projectile shape and motion
trail, scales through 8 levels, and you can carry up to 6 at once.

## Codex

An in-game **Codex** (from the main menu) is a living bestiary and armoury: every
foe and every weapon rendered with its actual in-game art and a short description,
so the hand-crafted neon shapes have a home in the menus.

## Sound & install

- **Audio** — chiptune-style SFX plus a slow, generated ambient soundtrack (a
  minor-pentatonic drift), all synthesised with the Web Audio API — no audio
  files. Toggle sound from the main menu (🔊) or the pause screen; the choice is
  saved.
- **Installable PWA** — a web app manifest, icons, and a service worker make
  EMBER installable to your home screen and playable offline once loaded. On iOS,
  use Safari's *Share → Add to Home Screen*; on Android/Chrome, *Install app*.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup: canvas, HUD, and all menu/overlay screens |
| `style.css`  | Mobile-first, theme-aware styling with safe-area insets |
| `game.js`    | The whole engine: loop, entities, weapons, meta-progression, UI |
| `manifest.webmanifest` · `sw.js` · `icon-*.png` | PWA: install + offline shell |

## Design notes

- **Hand-crafted neon art, drawn in code.** Every Ember and enemy is a distinct
  canvas-drawn silhouette in a shared neon-cyberpunk treatment (glass-tinted
  fill + bright outline + a signature accent) — no image assets. Embers: Spark
  (four-point star), Nova (rayed sun), Warden (segmented shield-hex), Hunter
  (arrowhead that turns to face movement), Storm (lightning ring), Glutton
  (pulsing maw). Enemies each read at a glance: husk, shard, armored hex, aiming
  turret, dividing cell, orbiting ring, and a spiked Warden boss with a rotating
  eye. Character portraits render the same art live in the Embers menu.
- Rendering is kept cheap for phones: flat shapes with sparing glow, capped
  particle/entity counts, DPR-aware canvas, and a `dt`-clamped fixed-ish loop.
- Menus are DOM overlays (crisp, touch-friendly, responsive); only the action is
  drawn to canvas.
- The game auto-pauses when the tab is backgrounded.
