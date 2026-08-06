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

For GitHub Pages: enable Pages on this branch/root and the game is live.

### Controls
- **Move** — touch and drag anywhere; a floating stick appears under your thumb.
  Desktop: mouse drag, or `WASD` / arrow keys.
- **Attack** — fully automatic. You only steer.
- **Motes** — the blue sparks are experience. Collect them to level up and pick
  an upgrade from three (four with enough Fortune) cards. Limited rerolls.

## The loop

1. **Descend.** Survive waves that thicken every minute; a **Warden** (boss with
   spiral bullet patterns) arrives every 3 minutes.
2. **Level up** mid-run — gain new weapons or stack passive upgrades.
3. **Fall** (or hold to 20:00 and win). Every descent earns **cinders** whether
   you win or die.
4. **Spend** cinders in the **Forge** and unlock **Embers**, then descend stronger.

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

## Weapons (in-run)

Spark (homing bolts), Nova (radial burst), Orbit (guardian flames), Lance
(piercing beam), Arc (chain lightning), Pyre Aura (burning field), and Cinder
Field (lingering ground). Each scales through 8 levels; carry up to 6 at once.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup: canvas, HUD, and all menu/overlay screens |
| `style.css`  | Mobile-first, theme-aware styling with safe-area insets |
| `game.js`    | The whole engine: loop, entities, weapons, meta-progression, UI |

## Design notes

- Rendering is kept cheap for phones: flat shapes with sparing glow, capped
  particle/entity counts, DPR-aware canvas, and a `dt`-clamped fixed-ish loop.
- Menus are DOM overlays (crisp, touch-friendly, responsive); only the action is
  drawn to canvas.
- The game auto-pauses when the tab is backgrounded.
