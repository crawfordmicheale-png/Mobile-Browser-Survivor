/* ============================================================================
   EMBER — a mobile survivor bullet-hell
   A single dying spark holds back the dark. Simple theme, deep meta-progression.
   Pure canvas + vanilla JS. No dependencies.
   ========================================================================== */
(() => {
'use strict';

/* ------------------------------------------------------------------ helpers */
const TAU = Math.PI * 2;
const rand  = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const pick  = arr => arr[randi(0, arr.length - 1)];
const now   = () => performance.now();
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ------------------------------------------------------------------- canvas */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/* =====================================================================
   META-PROGRESSION  (persistent, saved to localStorage)
   ===================================================================== */
const SAVE_KEY = 'ember_save_v2';

const FORGE = [
  { id:'vitality',    name:'Vitality',     icon:'❤',  max:8, base:40,  desc:r=>`+${20*r} max life`,                       eff:(p,r)=>{ p.maxHP += 20*r; } },
  { id:'might',       name:'Might',        icon:'🔥', max:8, base:50,  desc:r=>`+${8*r}% damage`,                          eff:(p,r)=>{ p.damageMult *= 1 + .08*r; } },
  { id:'haste',       name:'Haste',        icon:'⚡', max:8, base:50,  desc:r=>`+${6*r}% attack speed`,                    eff:(p,r)=>{ p.fireRateMult *= 1 + .06*r; } },
  { id:'swiftness',   name:'Swiftness',    icon:'👣', max:6, base:45,  desc:r=>`+${5*r}% move speed`,                      eff:(p,r)=>{ p.speed *= 1 + .05*r; } },
  { id:'precision',   name:'Precision',    icon:'🎯', max:6, base:55,  desc:r=>`+${4*r}% crit chance`,                     eff:(p,r)=>{ p.critChance += .04*r; } },
  { id:'ferocity',    name:'Ferocity',     icon:'💢', max:5, base:60,  desc:r=>`+${20*r}% crit damage`,                    eff:(p,r)=>{ p.critMult += .20*r; } },
  { id:'magnetism',   name:'Magnetism',    icon:'🧲', max:6, base:40,  desc:r=>`+${18*r}% pickup range`,                   eff:(p,r)=>{ p.pickupRadius *= 1 + .18*r; } },
  { id:'wisdom',      name:'Wisdom',       icon:'✨', max:6, base:55,  desc:r=>`+${8*r}% experience`,                      eff:(p,r)=>{ p.xpMult *= 1 + .08*r; } },
  { id:'greed',       name:'Greed',        icon:'✦',  max:6, base:50,  desc:r=>`+${10*r}% cinders earned`,                 eff:(p,r)=>{ p.greedMult *= 1 + .10*r; } },
  { id:'fortune',     name:'Fortune',      icon:'🍀', max:5, base:70,  desc:r=>`+${r} luck (better upgrades)`,             eff:(p,r)=>{ p.luck += r; } },
  { id:'regen',       name:'Regeneration', icon:'🌿', max:6, base:60,  desc:r=>`+${(0.25*r).toFixed(2)} life / sec`,       eff:(p,r)=>{ p.regen += .25*r; } },
  { id:'resilience',  name:'Resilience',   icon:'🛡', max:6, base:55,  desc:r=>`-${r} damage taken`,                       eff:(p,r)=>{ p.armor += r; } },
  { id:'multiplicity',name:'Multiplicity', icon:'❖',  max:3, base:120, desc:r=>`+${r} projectile${r>1?'s':''}`,            eff:(p,r)=>{ p.extraProjectiles += r; } },
  { id:'momentum',    name:'Momentum',     icon:'📈', max:5, base:80,  desc:r=>`+${2*r}% damage per minute survived`,      eff:(p,r)=>{ p.momentumRate += .02*r; } },
  { id:'rebirth',     name:'Rebirth',      icon:'♻', max:3, base:150, desc:r=>`revive ${r} time${r>1?'s':''} per run`,    eff:(p,r)=>{ p.revives += r; } },
  { id:'headstart',   name:'Head Start',   icon:'🚀', max:5, base:90,  desc:r=>`begin with weapon at Lv ${1+r}`,           eff:(p,r)=>{ p.headStart += r; } },
];
const forgeCost = (f, rank) => Math.floor(f.base * Math.pow(1.7, rank));

const EMBERS = [
  { id:'spark',   name:'The Spark',   icon:'✦', color:'#ff9a3c', weapon:'spark', unlock:{type:'free'},
    blurb:'Balanced. The first light.', mods:p=>{} },
  { id:'nova',    name:'The Nova',    icon:'✹', color:'#ffd479', weapon:'nova', unlock:{type:'cinders', cost:300},
    blurb:'Bursts outward. +15% area, +20 life.', mods:p=>{ p.areaMult*=1.15; p.maxHP+=20; } },
  { id:'warden',  name:'The Warden',  icon:'❂', color:'#8ad0ff', weapon:'orbit', unlock:{type:'cinders', cost:700},
    blurb:'Stalwart. +60 life, +2 armor, −10% speed.', mods:p=>{ p.maxHP+=60; p.armor+=2; p.speed*=.9; } },
  { id:'hunter',  name:'The Hunter',  icon:'➹', color:'#ff6b6b', weapon:'beam', unlock:{type:'achievement', id:'level20', label:'Reach Lv 20 in a run'},
    blurb:'Piercing. +15% crit, +15% damage, −25 life.', mods:p=>{ p.critChance+=.15; p.damageMult*=1.15; p.maxHP-=25; } },
  { id:'storm',   name:'The Storm',   icon:'ϟ', color:'#c9a6ff', weapon:'chain', unlock:{type:'achievement', id:'survivor10', label:'Survive 10:00'},
    blurb:'Arcing. +15% attack speed, +1 luck.', mods:p=>{ p.fireRateMult*=1.15; p.luck+=1; } },
  { id:'glutton', name:'The Glutton', icon:'◉', color:'#7be07b', weapon:'aura', unlock:{type:'cinders', cost:1200},
    blurb:'Hungry. +30% XP, +30% cinders, −15% damage.', mods:p=>{ p.xpMult*=1.3; p.greedMult*=1.3; p.damageMult*=.85; } },
];

const ACHIEVEMENTS = [
  { id:'firstBlood', label:'First Blood — 100 kills in a run' },
  { id:'survivor5',  label:'Kindled — survive 5:00' },
  { id:'survivor10', label:'Steadfast — survive 10:00' },
  { id:'survivor15', label:'Unyielding — survive 15:00' },
  { id:'level20',    label:'Ascendant — reach Lv 20' },
  { id:'slayer',     label:'Slayer — 2000 lifetime kills' },
  { id:'warden',     label:'Dawnbringer — survive to 20:00' },
];

function freshSave() {
  const forge = {}; FORGE.forEach(f => forge[f.id] = 0);
  return {
    cinders: 0, forge, selectedEmber:'spark',
    embers: { spark:true },
    ascension: 0,
    best: { time:0, level:0, kills:0 },
    totals: { runs:0, kills:0, time:0, cinders:0 },
    achievements: {},
  };
}
let save;
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    save = raw ? Object.assign(freshSave(), JSON.parse(raw)) : freshSave();
    // heal missing sub-objects
    const f = freshSave();
    save.forge = Object.assign(f.forge, save.forge);
    save.embers = Object.assign(f.embers, save.embers);
    save.best = Object.assign(f.best, save.best);
    save.totals = Object.assign(f.totals, save.totals);
    save.achievements = save.achievements || {};
  } catch (e) { save = freshSave(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
load();

function totalForgeRanks() { return FORGE.reduce((s, f) => s + (save.forge[f.id] || 0), 0); }
const ascMult = () => 1 + 0.06 * save.ascension;

function grantAchievement(id) {
  if (save.achievements[id]) return false;
  save.achievements[id] = true;
  // ember unlocks tied to achievements
  EMBERS.forEach(e => {
    if (e.unlock.type === 'achievement' && e.unlock.id === id && !save.embers[e.id]) {
      save.embers[e.id] = true;
      runUnlocks.push('New Ember unlocked: ' + e.name);
    }
  });
  const a = ACHIEVEMENTS.find(a => a.id === id);
  if (a) runUnlocks.push('Achievement: ' + a.label);
  return true;
}

/* =====================================================================
   WEAPONS  (in-run). Stats derived from level.
   ===================================================================== */
const WEAPONS = [
  { id:'spark', name:'Spark', icon:'✦', maxLevel:8, weight:10,
    desc:'A bolt to the nearest foe.',
    cd:l=>Math.max(.3, .7 - (l-1)*.05), dmg:l=>12 + (l-1)*6, count:l=>1 + Math.floor(l/2),
    speed:540, pierce:l=>l>=6?1:0 },
  { id:'nova', name:'Nova', icon:'✹', maxLevel:8, weight:8,
    desc:'A ring of sparks bursts outward.',
    cd:l=>Math.max(1.5, 3.2 - (l-1)*.16), count:l=>8 + (l-1)*2, dmg:l=>8 + (l-1)*3, speed:300 },
  { id:'orbit', name:'Orbit', icon:'❂', maxLevel:8, weight:8,
    desc:'Guardian flames circle you.',
    orbs:l=>2 + Math.ceil((l-1)/2), dps:l=>18 + (l-1)*8, radius:l=>72 + (l-1)*6, orbR:14 },
  { id:'beam', name:'Lance', icon:'➹', maxLevel:8, weight:7,
    desc:'A piercing lance skewers all in a line.',
    cd:l=>Math.max(.5, 1.4 - (l-1)*.09), dmg:l=>16 + (l-1)*8, count:l=>1 + Math.floor((l-1)/3), speed:920 },
  { id:'chain', name:'Arc', icon:'ϟ', maxLevel:8, weight:7,
    desc:'Lightning that leaps between foes.',
    cd:l=>Math.max(.6, 1.6 - (l-1)*.1), dmg:l=>12 + (l-1)*6, jumps:l=>2 + Math.ceil((l-1)/2), range:210 },
  { id:'aura', name:'Pyre Aura', icon:'◉', maxLevel:8, weight:6,
    desc:'A searing field burns everything near.',
    dps:l=>14 + (l-1)*7, radius:l=>62 + (l-1)*9 },
  { id:'pyre', name:'Cinder Field', icon:'🔥', maxLevel:8, weight:6,
    desc:'Drop burning ground that lingers.',
    cd:l=>Math.max(1, 2.2 - (l-1)*.12), dps:l=>16 + (l-1)*8, radius:l=>50 + (l-1)*6, life:3.2 },
];
const weaponById = id => WEAPONS.find(w => w.id === id);
const MAX_WEAPONS = 6;

const PASSIVES = [
  { id:'p_damage',  name:'Kindling',   icon:'🔥', rar:'common', weight:9, desc:'+12% damage',        eff:p=>p.damageMult*=1.12 },
  { id:'p_fire',    name:'Frenzy',     icon:'⚡', rar:'common', weight:9, desc:'+10% attack speed',  eff:p=>p.fireRateMult*=1.10 },
  { id:'p_move',    name:'Fleetness',  icon:'👣', rar:'common', weight:7, desc:'+8% move speed',     eff:p=>p.speed*=1.08 },
  { id:'p_hp',      name:'Fortitude',  icon:'❤', rar:'common', weight:8, desc:'+25 max life, heal', eff:p=>{p.maxHP+=25; p.hp=Math.min(p.maxHP,p.hp+25);} },
  { id:'p_pickup',  name:'Draw',       icon:'🧲', rar:'common', weight:6, desc:'+25% pickup range',  eff:p=>p.pickupRadius*=1.25 },
  { id:'p_xp',      name:'Insight',    icon:'✨', rar:'common', weight:6, desc:'+12% experience',    eff:p=>p.xpMult*=1.12 },
  { id:'p_regen',   name:'Renewal',    icon:'🌿', rar:'rare',   weight:5, desc:'+0.5 life / sec',    eff:p=>p.regen+=0.5 },
  { id:'p_crit',    name:'Focus',      icon:'🎯', rar:'rare',   weight:5, desc:'+6% crit chance',    eff:p=>p.critChance+=0.06 },
  { id:'p_area',    name:'Expanse',    icon:'◎',  rar:'rare',   weight:5, desc:'+15% area',          eff:p=>p.areaMult*=1.15 },
  { id:'p_pspeed',  name:'Velocity',   icon:'➤',  rar:'rare',   weight:4, desc:'+18% projectile speed', eff:p=>p.projSpeedMult*=1.18 },
  { id:'p_armor',   name:'Ward',       icon:'🛡', rar:'rare',   weight:4, desc:'-1 damage taken',    eff:p=>p.armor+=1 },
  { id:'p_proj',    name:'Split',      icon:'❖',  rar:'epic',   weight:3, desc:'+1 projectile',      eff:p=>p.extraProjectiles+=1 },
];
const passiveById = id => PASSIVES.find(p => p.id === id);

/* =====================================================================
   RUN STATE
   ===================================================================== */
let state = 'menu';               // menu|forge|embers|how|playing|levelup|pause|over
let player = null;
let enemies = [], shots = [], foeShots = [], motes = [], zones = [], parts = [], fx = [], drops = [];
let cam = { x:0, y:0 };
let runTime = 0, spawnTimer = 0, bossTimer = 0, killCount = 0, bossKills = 0;
let shake = 0, levelQueue = 0, runCinders = 0, hasWon = false;
let runUnlocks = [];
let lastTimerSec = -1;

function baseStats() {
  return {
    x:0, y:0, r:16,
    maxHP:120, hp:120, speed:182,
    damageMult:1, fireRateMult:1, critChance:.05, critMult:1.6,
    pickupRadius:82, xpMult:1, greedMult:1,
    armor:0, regen:0, extraProjectiles:0, areaMult:1, projSpeedMult:1,
    luck:0, momentumRate:0, revives:0, headStart:0,
    invuln:0, level:1, xp:0, xpNext:6, rerolls:2, dmgFlash:0,
    weapons:{},
  };
}
function xpNeeded(level) { return Math.floor(4 + (level - 1) * 4 + Math.pow(level, 1.7)); }

function startRun() {
  const ember = EMBERS.find(e => e.id === save.selectedEmber) || EMBERS[0];
  player = baseStats();
  // apply forge
  const a = ascMult();
  FORGE.forEach(f => { const r = save.forge[f.id] || 0; if (r > 0) f.eff(player, r); });
  // ascension global boost
  player.damageMult *= a; player.maxHP = Math.floor(player.maxHP * a); player.greedMult *= a;
  // ember
  ember.mods(player);
  player.maxHP = Math.max(30, Math.floor(player.maxHP));
  player.hp = player.maxHP;
  player.xpNext = xpNeeded(player.level);
  player.ember = ember;
  // starting weapon (+ head start levels)
  const startLvl = 1 + player.headStart;
  const w = weaponById(ember.weapon);
  player.weapons[ember.weapon] = { level: Math.min(w.maxLevel, startLvl), cd: 0, angle: 0 };

  enemies = []; shots = []; foeShots = []; motes = []; zones = []; parts = []; fx = []; drops = [];
  cam.x = 0; cam.y = 0;
  runTime = 0; spawnTimer = .3; bossTimer = 180; killCount = 0; bossKills = 0;
  shake = 0; levelQueue = 0; runCinders = 0; hasWon = false; runUnlocks = []; lastTimerSec = -1;
  // opening cluster so the swarm is on you quickly
  const r0 = Math.min(W, H) * 0.42 + 30;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + rand(-.3, .3); spawnEnemy('drifter', player.x + Math.cos(a) * r0, player.y + Math.sin(a) * r0, 1); }
  setState('playing');
}

/* =====================================================================
   INPUT — floating joystick (touch) + mouse + keyboard
   ===================================================================== */
const input = { active:false, sx:0, sy:0, dx:0, dy:0, mag:0 };
const keys = {};
function pointerStart(x, y) { input.active = true; input.sx = x; input.sy = y; input.dx = 0; input.dy = 0; input.mag = 0; }
function pointerMove(x, y) {
  if (!input.active) return;
  let dx = x - input.sx, dy = y - input.sy;
  const d = Math.hypot(dx, dy), max = 60;
  if (d > max) { input.sx = x - dx / d * max; input.sy = y - dy / d * max; dx = x - input.sx; dy = y - input.sy; }
  input.dx = dx; input.dy = dy; input.mag = clamp(Math.hypot(dx, dy) / max, 0, 1);
}
function pointerEnd() { input.active = false; input.dx = input.dy = input.mag = 0; }

canvas.addEventListener('pointerdown', e => { if (state === 'playing') { pointerStart(e.clientX, e.clientY); } });
canvas.addEventListener('pointermove', e => { if (state === 'playing') pointerMove(e.clientX, e.clientY); });
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function moveVector() {
  let vx = 0, vy = 0;
  if (input.active && input.mag > 0.06) { vx = input.dx; vy = input.dy; }
  let kx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  let ky = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
  if (kx || ky) { vx = kx; vy = ky; }
  const d = Math.hypot(vx, vy);
  if (d < 0.001) return { x:0, y:0, m:0 };
  const m = input.active && !kx && !ky ? input.mag : 1;
  return { x: vx / d, y: vy / d, m };
}

/* =====================================================================
   AUDIO — tiny WebAudio blips (no assets)
   ===================================================================== */
let ac = null, muted = false;
function actx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ac; }
function beep(freq, dur, type = 'sine', vol = 0.06) {
  if (muted) return; const c = actx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(c.destination);
  const t = c.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  level: () => { beep(523, .09, 'triangle', .07); setTimeout(() => beep(784, .12, 'triangle', .07), 80); },
  hit:   () => beep(180, .05, 'square', .03),
  pick:  () => beep(660, .04, 'sine', .025),
  boss:  () => beep(90, .5, 'sawtooth', .08),
  die:   () => { beep(200, .3, 'sawtooth', .08); setTimeout(() => beep(120, .5, 'sawtooth', .07), 120); },
  buy:   () => { beep(440, .07, 'triangle', .07); setTimeout(() => beep(660, .1, 'triangle', .07), 70); },
};

/* =====================================================================
   PARTICLES / FX
   ===================================================================== */
function burst(x, y, color, n, spd = 120, life = .5) {
  if (parts.length > 220) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(spd * .3, spd);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, r: rand(1.5, 3.5) });
  }
}

/* =====================================================================
   ENEMIES
   ===================================================================== */
function enemyTypesForTime(min) {
  const t = ['drifter'];
  if (min >= 0.5) t.push('swarm');
  if (min >= 1.5) t.push('brute');
  if (min >= 2.5) t.push('shooter');
  if (min >= 4)   t.push('splitter');
  if (min >= 6)   t.push('orbiter');
  return t;
}
function spawnEnemy(type, x, y, scale) {
  const base = {
    drifter:  { hp:16, r:14, speed:74, dmg:6,  color:'#c65b8a', xp:1, kind:'chase' },
    swarm:    { hp:8,  r:9,  speed:118,dmg:5,  color:'#e0714f', xp:1, kind:'chase' },
    brute:    { hp:120,r:26, speed:42, dmg:14, color:'#8a4bd0', xp:4, kind:'chase' },
    shooter:  { hp:34, r:15, speed:52, dmg:9,  color:'#4fb0e0', xp:3, kind:'shooter', fireCd:2.2 },
    splitter: { hp:44, r:18, speed:60, dmg:10, color:'#7be07b', xp:3, kind:'split' },
    orbiter:  { hp:80, r:17, speed:80, dmg:12, color:'#c9a6ff', xp:6, kind:'orbiter', fireCd:1.6, orbA:rand(0,TAU) },
    mini:     { hp:16, r:10, speed:86, dmg:6,  color:'#a9e07b', xp:1, kind:'chase' },
  }[type];
  const e = Object.assign({}, base, {
    type, x, y, maxHP: Math.floor(base.hp * scale), touchCd: 0, fireT: (base.fireCd || 0) * Math.random(),
    hitFlash: 0, knock: 0,
  });
  e.hp = e.maxHP;
  enemies.push(e);
  return e;
}
function spawnRadius() { return Math.hypot(W, H) * 0.5 + 45; }
function doSpawn() {
  const min = runTime / 60;
  const scale = 1 + min * 0.55 + save.ascension * 0.15;
  const types = enemyTypesForTime(min);
  const rad = spawnRadius();
  const batch = 1 + Math.floor(min * 0.9);
  if (enemies.length > 230) return;
  // swarm packs
  if (min >= 1 && Math.random() < 0.25) {
    const a = rand(0, TAU), cx = player.x + Math.cos(a) * rad, cy = player.y + Math.sin(a) * rad;
    for (let i = 0; i < 5 + Math.floor(min); i++)
      spawnEnemy('swarm', cx + rand(-40, 40), cy + rand(-40, 40), scale);
    return;
  }
  for (let i = 0; i < batch; i++) {
    const a = rand(0, TAU);
    spawnEnemy(pick(types), player.x + Math.cos(a) * rad, player.y + Math.sin(a) * rad, scale);
  }
}
function spawnBoss() {
  const min = runTime / 60;
  const scale = 1 + min * 0.55 + save.ascension * 0.15;
  const a = rand(0, TAU), rad = Math.max(W, H) * 0.55;
  const b = {
    type:'boss', kind:'boss', x: player.x + Math.cos(a) * rad, y: player.y + Math.sin(a) * rad,
    r:44, speed:40, dmg:22, color:'#ff5b6a', xp:40,
    maxHP: Math.floor((900 + min * 320) * (1 + save.ascension * 0.2)),
    touchCd:0, fireT:1.5, spiralA:0, hitFlash:0, knock:0, isBoss:true,
  };
  b.hp = b.maxHP;
  enemies.push(b);
  shake = Math.max(shake, 14); sfx.boss();
  toast('A Warden rises');
}

function foeBullet(x, y, ang, spd, dmg) {
  foeShots.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 6, dmg, life: 6 });
}

/* =====================================================================
   DAMAGE + XP
   ===================================================================== */
function critRoll(base) {
  if (Math.random() < player.critChance) return { d: base * player.critMult, crit: true };
  return { d: base, crit: false };
}
function momentumMult() { return 1 + player.momentumRate * (runTime / 60); }

function hurtEnemy(e, dmg, crit, kbx, kby) {
  e.hp -= dmg; e.hitFlash = 0.08;
  if (kbx !== undefined && !e.isBoss) { e.x += kbx; e.y += kby; }
  if (e.hp <= 0) killEnemy(e);
  else if (crit) burst(e.x, e.y, '#fff', 4, 140, .3);
}
function killEnemy(e) {
  e.dead = true;
  killCount++;
  burst(e.x, e.y, e.color, e.isBoss ? 40 : 8, e.isBoss ? 260 : 150, e.isBoss ? .9 : .5);
  // splitter
  if (e.kind === 'split') {
    const scale = 1 + (runTime / 60) * 0.55;
    for (let i = 0; i < 2; i++) spawnEnemy('mini', e.x + rand(-14, 14), e.y + rand(-14, 14), scale * 0.7);
  }
  // motes
  const val = e.xp || 1;
  if (e.isBoss) {
    for (let i = 0; i < 14; i++) dropMote(e.x + rand(-30, 30), e.y + rand(-30, 30), 4);
    drops.push({ x: e.x, y: e.y, r: 12, type: 'heart', bob: 0 });
    bossKills++;
    shake = Math.max(shake, 10);
    toast('Warden felled  ✦');
  } else {
    dropMote(e.x, e.y, val);
    if (Math.random() < 0.012) drops.push({ x: e.x, y: e.y, r: 11, type: 'heart', bob: 0 });
  }
}
function dropMote(x, y, value) {
  motes.push({ x, y, value, r: value >= 4 ? 6 : 4, big: value >= 4, vx: rand(-30, 30), vy: rand(-30, 30), life: 26 });
}
function gainXP(v) {
  player.xp += v * player.xpMult;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = xpNeeded(player.level);
    levelQueue++;
  }
  if (levelQueue > 0 && state === 'playing') openLevelUp();
}
function hurtPlayer(dmg) {
  if (player.invuln > 0) return;
  const real = Math.max(1, dmg - player.armor);
  player.hp -= real; player.invuln = 0.6; player.dmgFlash = 0.35;
  shake = Math.max(shake, 6); sfx.hit();
  if (player.hp <= 0) {
    if (player.revives > 0) {
      player.revives--; player.hp = player.maxHP * 0.6; player.invuln = 2.5;
      // clear nearby threats
      enemies.forEach(en => { if (dist2(en.x, en.y, player.x, player.y) < 260 * 260 && !en.isBoss) { en.hp = 0; killEnemy(en); } });
      burst(player.x, player.y, '#ffd479', 40, 300, 1); shake = 16; toast('Rekindled!');
    } else {
      endRun();
    }
  }
}

/* =====================================================================
   WEAPON FIRING
   ===================================================================== */
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD ? maxD * maxD : Infinity;
  for (const e of enemies) { const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function spawnShot(x, y, ang, spd, dmg, r, pierce, color, crit) {
  shots.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, r, pierce, color, crit, life: 2.4, hit: null });
}
function updateWeapons(dt) {
  const dm = player.damageMult * momentumMult();
  for (const id in player.weapons) {
    const st = player.weapons[id]; const w = weaponById(id); const l = st.level;
    st.cd -= dt;
    if (id === 'spark') {
      if (st.cd <= 0) {
        const t = nearestEnemy(player.x, player.y);
        if (t) {
          st.cd = w.cd(l) / player.fireRateMult;
          const n = w.count(l) + player.extraProjectiles;
          const baseA = Math.atan2(t.y - player.y, t.x - player.x);
          for (let i = 0; i < n; i++) {
            const off = (i - (n - 1) / 2) * 0.12;
            const c = critRoll(w.dmg(l) * dm);
            spawnShot(player.x, player.y, baseA + off, w.speed * player.projSpeedMult, c.d, 6 * player.areaMult, w.pierce(l), '#ffd479', c.crit);
          }
        }
      }
    } else if (id === 'nova') {
      if (st.cd <= 0) {
        st.cd = w.cd(l) / player.fireRateMult;
        const n = w.count(l) + player.extraProjectiles;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          const c = critRoll(w.dmg(l) * dm);
          spawnShot(player.x, player.y, a, w.speed * player.projSpeedMult, c.d, 6 * player.areaMult, 0, '#ff9a3c', c.crit);
        }
      }
    } else if (id === 'beam') {
      if (st.cd <= 0) {
        const t = nearestEnemy(player.x, player.y);
        if (t) {
          st.cd = w.cd(l) / player.fireRateMult;
          const n = w.count(l) + player.extraProjectiles;
          const baseA = Math.atan2(t.y - player.y, t.x - player.x);
          for (let i = 0; i < n; i++) {
            const off = (i - (n - 1) / 2) * 0.16;
            const c = critRoll(w.dmg(l) * dm);
            const s = { x: player.x, y: player.y, vx: Math.cos(baseA + off) * w.speed * player.projSpeedMult, vy: Math.sin(baseA + off) * w.speed * player.projSpeedMult, dmg: c.d, r: 5 * player.areaMult, pierce: 999, color: '#8ad0ff', crit: c.crit, life: 1.1, hit: new Set(), beam: true };
            shots.push(s);
          }
        }
      }
    } else if (id === 'chain') {
      if (st.cd <= 0) {
        const t = nearestEnemy(player.x, player.y, 360);
        if (t) {
          st.cd = w.cd(l) / player.fireRateMult;
          let from = { x: player.x, y: player.y }, cur = t;
          const hitSet = new Set(); const jumps = w.jumps(l) + player.extraProjectiles;
          for (let j = 0; j < jumps && cur; j++) {
            const c = critRoll(w.dmg(l) * dm);
            hurtEnemy(cur, c.d, c.crit);
            hitSet.add(cur);
            fx.push({ type: 'line', x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, life: 0.14, color: '#c9a6ff' });
            from = { x: cur.x, y: cur.y };
            // next nearest unhit within range
            let nx = null, nd = w.range * w.range;
            for (const e of enemies) { if (hitSet.has(e) || e.dead) continue; const d = dist2(from.x, from.y, e.x, e.y); if (d < nd) { nd = d; nx = e; } }
            cur = nx;
          }
        }
      }
    } else if (id === 'pyre') {
      if (st.cd <= 0) {
        st.cd = w.cd(l) / player.fireRateMult;
        zones.push({ x: player.x, y: player.y, r: w.radius(l) * player.areaMult, dps: w.dps(l) * dm, life: w.life, max: w.life, color: '#ff6a2b' });
      }
    }
    // 'orbit' and 'aura' handled continuously below
  }
  // ORBIT (contact DoT)
  const orb = player.weapons['orbit'];
  if (orb) {
    const w = weaponById('orbit'), l = orb.level;
    orb.angle = (orb.angle || 0) + dt * 2.6;
    const n = w.orbs(l) + player.extraProjectiles, R = w.radius(l) * player.areaMult, orbR = w.orbR * player.areaMult;
    const dps = w.dps(l) * dm;
    orb._pts = [];
    for (let i = 0; i < n; i++) {
      const a = orb.angle + (i / n) * TAU;
      const ox = player.x + Math.cos(a) * R, oy = player.y + Math.sin(a) * R;
      orb._pts.push({ x: ox, y: oy, r: orbR });
      for (const e of enemies) { if (dist2(ox, oy, e.x, e.y) < (orbR + e.r) ** 2) hurtEnemy(e, dps * dt, false); }
    }
  }
  // AURA (field DoT)
  const au = player.weapons['aura'];
  if (au) {
    const w = weaponById('aura'), l = au.level;
    const R = w.radius(l) * player.areaMult, dps = w.dps(l) * dm;
    au._r = R;
    for (const e of enemies) { if (dist2(player.x, player.y, e.x, e.y) < (R + e.r) ** 2) hurtEnemy(e, dps * dt, false); }
  }
  // ZONES (pyre)
  for (const z of zones) {
    z.life -= dt;
    for (const e of enemies) { if (dist2(z.x, z.y, e.x, e.y) < (z.r + e.r) ** 2) hurtEnemy(e, z.dps * dt, false); }
  }
  zones = zones.filter(z => z.life > 0);
}

/* =====================================================================
   UPDATE LOOP
   ===================================================================== */
function update(dt) {
  runTime += dt;
  // achievements by time
  if (runTime >= 300) grantAchievement('survivor5');
  if (runTime >= 600) grantAchievement('survivor10');
  if (runTime >= 900) grantAchievement('survivor15');
  if (runTime >= 1200 && !hasWon) { hasWon = true; grantAchievement('warden'); toast('You have held back the dark — but it is not done'); }
  if (player.level >= 20) grantAchievement('level20');
  if (killCount >= 100) grantAchievement('firstBlood');

  // movement
  const mv = moveVector();
  player.x += mv.x * player.speed * mv.m * dt;
  player.y += mv.y * player.speed * mv.m * dt;
  cam.x = player.x; cam.y = player.y;

  player.invuln = Math.max(0, player.invuln - dt);
  player.dmgFlash = Math.max(0, player.dmgFlash - dt);
  if (player.regen > 0 && player.hp < player.maxHP) player.hp = Math.min(player.maxHP, player.hp + player.regen * dt);

  // spawning
  spawnTimer -= dt;
  const min = runTime / 60;
  const interval = clamp(1.0 - min * 0.09, 0.2, 1.0);
  if (spawnTimer <= 0) { spawnTimer = interval; doSpawn(); }
  bossTimer -= dt;
  if (bossTimer <= 0) { bossTimer = 180; spawnBoss(); }

  updateWeapons(dt);

  // enemies
  const halfDiag = Math.max(W, H);
  for (const e of enemies) {
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.touchCd = Math.max(0, e.touchCd - dt);
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    if (e.kind === 'shooter') {
      // approach to a range, then fire
      if (d > 260) { e.x += Math.cos(ang) * e.speed * dt; e.y += Math.sin(ang) * e.speed * dt; }
      else { e.x -= Math.cos(ang) * e.speed * 0.3 * dt; e.y -= Math.sin(ang) * e.speed * 0.3 * dt; }
      e.fireT -= dt; if (e.fireT <= 0) { e.fireT = e.fireCd; foeBullet(e.x, e.y, ang, 150, e.dmg); }
    } else if (e.kind === 'orbiter') {
      e.orbA += dt * 1.2;
      const tx = player.x + Math.cos(e.orbA) * 200, ty = player.y + Math.sin(e.orbA) * 200;
      const oa = Math.atan2(ty - e.y, tx - e.x);
      e.x += Math.cos(oa) * e.speed * dt; e.y += Math.sin(oa) * e.speed * dt;
      e.fireT -= dt; if (e.fireT <= 0) { e.fireT = e.fireCd; for (let k = 0; k < 3; k++) foeBullet(e.x, e.y, ang + (k - 1) * 0.4, 140, e.dmg); }
    } else if (e.kind === 'boss') {
      e.x += Math.cos(ang) * e.speed * dt; e.y += Math.sin(ang) * e.speed * dt;
      e.fireT -= dt; e.spiralA += dt * 2.2;
      if (e.fireT <= 0) { e.fireT = 0.28; for (let k = 0; k < 3; k++) foeBullet(e.x, e.y, e.spiralA + (k / 3) * TAU, 165, e.dmg); }
    } else {
      e.x += Math.cos(ang) * e.speed * dt; e.y += Math.sin(ang) * e.speed * dt;
    }
    // contact damage
    if (d < e.r + player.r) {
      // separate a touch
      if (e.touchCd <= 0) { hurtPlayer(e.dmg); e.touchCd = 0.7; }
    }
    // cull far strays (rare, keeps arena tight)
    if (dist2(e.x, e.y, player.x, player.y) > (halfDiag * 2.2) ** 2) e.dead = true;
  }
  enemies = enemies.filter(e => !e.dead);

  // player shots
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    for (const e of enemies) {
      if (s.hit && s.hit.has && s.hit.has(e)) continue;
      if (dist2(s.x, s.y, e.x, e.y) < (s.r + e.r) ** 2) {
        const kb = s.beam ? 0 : 6;
        hurtEnemy(e, s.dmg, s.crit, Math.cos(Math.atan2(s.vy, s.vx)) * kb, Math.sin(Math.atan2(s.vy, s.vx)) * kb);
        burst(s.x, s.y, s.color, 2, 90, .25);
        if (s.pierce === 999) { if (s.hit) s.hit.add(e); }
        else if (s.pierce > 0) { s.pierce--; }
        else { s.dead = true; break; }
      }
    }
  }
  shots = shots.filter(s => !s.dead && s.life > 0);

  // foe bullets
  for (const b of foeShots) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (dist2(b.x, b.y, player.x, player.y) < (b.r + player.r) ** 2) { hurtPlayer(b.dmg); b.dead = true; }
  }
  foeShots = foeShots.filter(b => !b.dead && b.life > 0);

  // motes
  const pr2 = player.pickupRadius * player.pickupRadius;
  for (const m of motes) {
    m.life -= dt;
    const d = dist2(m.x, m.y, player.x, player.y);
    if (d < pr2 || m.pull) {
      m.pull = true;
      const a = Math.atan2(player.y - m.y, player.x - m.x);
      const sp = 320;
      m.x += Math.cos(a) * sp * dt; m.y += Math.sin(a) * sp * dt;
    } else {
      m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.9; m.vy *= 0.9;
    }
    if (d < (player.r + m.r + 4) ** 2) { gainXP(m.value); m.dead = true; sfx.pick(); }
  }
  motes = motes.filter(m => !m.dead && m.life > 0);

  // drops (hearts)
  for (const dp of drops) {
    dp.bob += dt;
    if (dist2(dp.x, dp.y, player.x, player.y) < (player.r + dp.r + 6) ** 2) {
      if (dp.type === 'heart') { player.hp = Math.min(player.maxHP, player.hp + player.maxHP * 0.3); toast('+life'); }
      dp.dead = true;
    }
  }
  drops = drops.filter(d => !d.dead);

  // particles / fx
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const f of fx) f.life -= dt;
  fx = fx.filter(f => f.life > 0);

  shake = Math.max(0, shake - dt * 24);
}

/* =====================================================================
   RENDER
   ===================================================================== */
function draw() {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  let ox = cx - cam.x, oy = cy - cam.y;
  if (shake > 0.2) { ox += rand(-shake, shake); oy += rand(-shake, shake); }

  // background parallax dot field
  drawBackground(ox, oy);

  ctx.save();
  ctx.translate(ox, oy);

  if (player) {
    // zones (pyre) under everything
    for (const z of zones) {
      const a = clamp(z.life / z.max, 0, 1);
      ctx.globalAlpha = 0.22 * a + 0.08;
      ctx.fillStyle = z.color;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // aura
    const au = player.weapons['aura'];
    if (au && au._r) {
      const g = ctx.createRadialGradient(player.x, player.y, au._r * 0.3, player.x, player.y, au._r);
      g.addColorStop(0, 'rgba(255,120,50,0.16)'); g.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(player.x, player.y, au._r, 0, TAU); ctx.fill();
    }

    // motes
    ctx.fillStyle = '#5ec8ff';
    for (const m of motes) {
      if (m.life < 4 && Math.floor(m.life * 6) % 2 === 0) continue; // blink out
      ctx.globalAlpha = m.big ? 1 : 0.9;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // drops
    for (const dp of drops) {
      ctx.fillStyle = '#ff6b8a';
      const s = 1 + Math.sin(dp.bob * 4) * 0.12;
      drawHeart(dp.x, dp.y, dp.r * s);
    }

    // enemies
    for (const e of enemies) drawEnemy(e);

    // foe bullets
    for (const b of foeShots) {
      ctx.fillStyle = '#ff7a9c';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,180,200,.4)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.fill();
    }

    // orbit orbs
    const orb = player.weapons['orbit'];
    if (orb && orb._pts) {
      for (const p of orb._pts) {
        ctx.fillStyle = '#ffd479';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,150,60,.35)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 4, 0, TAU); ctx.fill();
      }
    }

    // player shots
    for (const s of shots) {
      ctx.fillStyle = s.crit ? '#ffffff' : s.color;
      if (s.beam) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.fillRect(-10, -s.r, 20, s.r * 2); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      }
    }

    // chain fx
    for (const f of fx) {
      if (f.type === 'line') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.globalAlpha = clamp(f.life / 0.14, 0, 1);
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
      }
    }

    // particles
    for (const p of parts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // player (the ember)
    drawPlayer();
  }

  ctx.restore();

  // joystick
  if (input.active && state === 'playing') {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(255,220,150,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(input.sx, input.sy, 60, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,180,90,.5)';
    ctx.beginPath(); ctx.arc(input.sx + input.dx, input.sy + input.dy, 26, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  // low-hp vignette
  if (player && player.hp / player.maxHP < 0.3 && state === 'playing') {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + (0.35 * (1 - player.hp / player.maxHP)).toFixed(2) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (player && player.dmgFlash > 0) { ctx.fillStyle = 'rgba(255,60,60,' + (player.dmgFlash * 0.4).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
}

function drawBackground(ox, oy) {
  const sp = 64;
  const startX = ((ox % sp) + sp) % sp - sp;
  const startY = ((oy % sp) + sp) % sp - sp;
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let x = startX; x < W + sp; x += sp)
    for (let y = startY; y < H + sp; y += sp) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
}
function drawPlayer() {
  const p = player;
  const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * 2.6);
  g.addColorStop(0, '#fff2d0'); g.addColorStop(0.4, p.ember.color); g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = p.invuln > 0 && Math.floor(runTime * 20) % 2 ? '#ffffff' : '#fff6e0';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  ctx.fillStyle = p.ember.color;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, TAU); ctx.fill();
}
function drawEnemy(e) {
  ctx.save(); ctx.translate(e.x, e.y);
  const col = e.hitFlash > 0 ? '#ffffff' : e.color;
  if (e.isBoss) {
    ctx.fillStyle = 'rgba(255,60,80,.18)';
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.5, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = col;
  ctx.beginPath();
  if (e.type === 'brute' || e.isBoss) {
    // hexagon
    const sides = e.isBoss ? 8 : 6;
    for (let i = 0; i < sides; i++) { const a = (i / sides) * TAU + runTime * 0.4; const px = Math.cos(a) * e.r, py = Math.sin(a) * e.r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else if (e.type === 'shooter') {
    // triangle
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU - Math.PI / 2; const px = Math.cos(a) * e.r, py = Math.sin(a) * e.r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else if (e.type === 'splitter') {
    ctx.rect(-e.r * 0.8, -e.r * 0.8, e.r * 1.6, e.r * 1.6);
  } else {
    ctx.arc(0, 0, e.r, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.arc(0, 0, e.r * 0.35, 0, TAU); ctx.fill();
  ctx.restore();
  // boss hp bar
  if (e.isBoss) {
    const w = 70, h = 6;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w, h);
    ctx.fillStyle = '#ff5b6a'; ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w * clamp(e.hp / e.maxHP, 0, 1), h);
  }
}
function drawHeart(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 12, s / 12);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(0, 0, -6, -2, -6, -6);
  ctx.bezierCurveTo(-6, -10, 0, -10, 0, -6);
  ctx.bezierCurveTo(0, -10, 6, -10, 6, -6);
  ctx.bezierCurveTo(6, -2, 0, 0, 0, 4);
  ctx.fill(); ctx.restore();
}

/* =====================================================================
   HUD
   ===================================================================== */
const el = id => document.getElementById(id);
function updateHUD() {
  if (!player) return;
  const sec = Math.floor(runTime);
  if (sec !== lastTimerSec) { el('timer').textContent = fmtTime(runTime); lastTimerSec = sec; }
  el('kills').textContent = '☠ ' + killCount;
  runCinders = computeCinders();
  el('run-cinders').textContent = '✦ ' + runCinders;
  el('xpfill').style.width = clamp(player.xp / player.xpNext * 100, 0, 100) + '%';
  el('lvl').textContent = 'Lv ' + player.level;
  const hpp = clamp(player.hp / player.maxHP, 0, 1);
  el('hpfill').style.width = hpp * 100 + '%';
  el('hptext').textContent = Math.ceil(Math.max(0, player.hp)) + ' / ' + player.maxHP;
}
function computeCinders() {
  const base = runTime * 0.6 + killCount * 0.45 + player.level * 5 + bossKills * 45;
  return Math.floor(base * player.greedMult);
}

/* =====================================================================
   MAIN LOOP
   ===================================================================== */
let lastT = now();
function frame() {
  const t = now();
  let dt = (t - lastT) / 1000; lastT = t;
  dt = Math.min(dt, 0.05); // clamp big jumps
  if (state === 'playing') { update(dt); updateHUD(); }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* =====================================================================
   LEVEL-UP
   ===================================================================== */
let currentChoices = [];
function ownedWeaponCount() { return Object.keys(player.weapons).length; }
function rollChoices() {
  const pool = [];
  for (const w of WEAPONS) {
    const cur = player.weapons[w.id]; const lvl = cur ? cur.level : 0;
    if (lvl === 0) { if (ownedWeaponCount() < MAX_WEAPONS) pool.push({ kind: 'weapon', id: w.id, isNew: true, rar: 'new', weight: w.weight }); }
    else if (lvl < w.maxLevel) pool.push({ kind: 'weapon', id: w.id, isNew: false, rar: 'rare', weight: w.weight + 3, lvl });
  }
  for (const p of PASSIVES) pool.push({ kind: 'passive', id: p.id, rar: p.rar, weight: p.weight });
  // luck boosts rare/epic/new weights
  const luckB = 1 + player.luck * 0.14;
  for (const o of pool) { if (o.rar === 'rare') o.w = o.weight * luckB; else if (o.rar === 'epic' || o.rar === 'new') o.w = o.weight * luckB * 1.15; else o.w = o.weight; }
  const chosen = []; const n = Math.min(pool.length, player.luck >= 4 ? 4 : 3);
  const work = pool.slice();
  for (let k = 0; k < n && work.length; k++) {
    let total = work.reduce((s, o) => s + o.w, 0), r = Math.random() * total, idx = 0;
    for (let i = 0; i < work.length; i++) { r -= work[i].w; if (r <= 0) { idx = i; break; } }
    chosen.push(work.splice(idx, 1)[0]);
  }
  return chosen;
}
function choiceView(o) {
  if (o.kind === 'weapon') {
    const w = weaponById(o.id);
    if (o.isNew) return { icon: w.icon, name: 'New — ' + w.name, tag: '', desc: w.desc, rar: 'new' };
    return { icon: w.icon, name: w.name, tag: 'Lv ' + o.lvl + ' → ' + (o.lvl + 1), desc: w.desc, rar: 'rare' };
  }
  const p = passiveById(o.id);
  return { icon: p.icon, name: p.name, tag: '', desc: p.desc, rar: p.rar };
}
function openLevelUp() {
  currentChoices = rollChoices();
  const box = el('levelup-cards'); box.innerHTML = '';
  currentChoices.forEach((o, i) => {
    const v = choiceView(o);
    const d = document.createElement('button');
    d.className = 'up-card rar-' + v.rar;
    d.innerHTML = `<div class="uc-ic">${v.icon}</div><div class="uc-body">
      <div class="uc-name">${v.name}${v.tag ? `<span class="lvltag">${v.tag}</span>` : ''}</div>
      <div class="uc-desc">${v.desc}</div>
      <div class="uc-rar">${v.rar === 'new' ? 'New weapon' : v.rar}</div></div>`;
    d.onclick = () => applyChoice(o);
    box.appendChild(d);
  });
  // reroll
  const rr = document.createElement('button');
  rr.className = 'reroll'; rr.textContent = `↻ Reroll (${player.rerolls})`;
  rr.disabled = player.rerolls <= 0;
  rr.onclick = () => { if (player.rerolls > 0) { player.rerolls--; openLevelUp(); } };
  box.appendChild(rr);
  setState('levelup'); sfx.level();
}
function applyChoice(o) {
  if (o.kind === 'weapon') {
    const cur = player.weapons[o.id];
    if (cur) cur.level++;
    else player.weapons[o.id] = { level: 1, cd: 0, angle: 0 };
  } else {
    passiveById(o.id).eff(player);
  }
  levelQueue--;
  if (levelQueue > 0) openLevelUp();
  else setState('playing');
}

/* =====================================================================
   END RUN
   ===================================================================== */
function endRun() {
  sfx.die();
  const earned = computeCinders();
  save.cinders += earned;
  save.totals.runs++; save.totals.kills += killCount; save.totals.time += runTime; save.totals.cinders += earned;
  if (runTime > save.best.time) save.best.time = runTime;
  if (player.level > save.best.level) save.best.level = player.level;
  if (killCount > save.best.kills) save.best.kills = killCount;
  if (save.totals.kills >= 2000) grantAchievement('slayer');
  persist();
  showGameOver(earned);
  setState('over');
}

/* =====================================================================
   SCREENS / UI
   ===================================================================== */
const screens = { menu:'screen-menu', forge:'screen-forge', embers:'screen-embers', how:'screen-how', levelup:'screen-levelup', pause:'screen-pause', over:'screen-over' };
function setState(s) {
  state = s;
  Object.values(screens).forEach(id => el(id).classList.add('hidden'));
  if (screens[s]) el(screens[s]).classList.remove('hidden');
  const hudVisible = (s === 'playing' || s === 'levelup' || s === 'pause');
  el('hud').classList.toggle('hidden', !hudVisible);
}

let toastT = null;
function toast(msg) {
  const t = el('toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 1800);
}

function renderMenuStats() {
  const s = save;
  el('menu-stats').innerHTML =
    `<div>Best: <b>${fmtTime(s.best.time)}</b></div>
     <div>Cinders: <b>${s.cinders}</b></div>
     <div>Runs: <b>${s.totals.runs}</b></div>
     ${s.ascension > 0 ? `<div>Ascension: <b>${s.ascension}</b></div>` : ''}`;
}

function renderForge() {
  el('forge-cinders').textContent = save.cinders;
  const list = el('forge-list'); list.innerHTML = '';
  FORGE.forEach(f => {
    const rank = save.forge[f.id] || 0;
    const maxed = rank >= f.max;
    const cost = maxed ? 0 : forgeCost(f, rank);
    const pips = Array.from({ length: f.max }, (_, i) => `<span class="pip ${i < rank ? 'on' : ''}"></span>`).join('');
    const div = document.createElement('div');
    div.className = 'card-item' + (maxed ? ' maxed' : '');
    div.innerHTML = `
      <div class="ci-head"><div class="ci-name"><span class="ic">${f.icon}</span>${f.name}</div>
        <div class="ci-rank">${rank}/${f.max}</div></div>
      <div class="pips">${pips}</div>
      <div class="ci-desc">${f.desc(Math.min(rank + 1, f.max))}</div>
      <button class="ci-buy" ${maxed || save.cinders < cost ? 'disabled' : ''}>${maxed ? 'MAXED' : '✦ ' + cost}</button>`;
    if (!maxed) div.querySelector('.ci-buy').onclick = () => {
      if (save.cinders >= cost) { save.cinders -= cost; save.forge[f.id] = rank + 1; persist(); sfx.buy(); renderForge(); }
    };
    list.appendChild(div);
  });
  renderAscend();
}
function renderAscend() {
  const wrap = el('ascend-wrap'); wrap.innerHTML = '';
  const ranks = totalForgeRanks();
  const req = 30;
  const box = document.createElement('div'); box.className = 'ascend-box';
  if (ranks >= req) {
    box.innerHTML = `<h3>◆ Ascend ◆</h3>
      <p>Return every forge upgrade and all cinders to ash — and be reborn brighter. Each ascension grants a permanent <b>+6% to damage, life & cinders</b>. Current: <b>${save.ascension}</b>.</p>
      <button class="btn" id="do-ascend">Ascend (+1)</button>`;
    wrap.appendChild(box);
    el('do-ascend').onclick = () => {
      if (!confirm('Ascend? All forge ranks and cinders reset. You gain +1 permanent Ascension.')) return;
      save.ascension++; FORGE.forEach(f => save.forge[f.id] = 0); save.cinders = 0; persist();
      sfx.level(); toast('Ascended to ' + save.ascension); renderForge();
    };
  } else {
    box.innerHTML = `<h3>◆ Ascension ◆</h3><p>Purchase <b>${req - ranks}</b> more forge ranks to unlock rebirth — a permanent power multiplier that resets the forge. ${save.ascension > 0 ? `Current ascension: <b>${save.ascension}</b>.` : ''}</p>`;
    wrap.appendChild(box);
  }
}

function renderEmbers() {
  el('embers-cinders').textContent = save.cinders;
  const list = el('embers-list'); list.innerHTML = '';
  EMBERS.forEach(e => {
    const owned = !!save.embers[e.id];
    const selected = save.selectedEmber === e.id;
    const w = weaponById(e.weapon);
    const div = document.createElement('div');
    div.className = 'card-item ember-card' + (selected ? ' selected' : '') + (owned ? '' : ' locked');
    let tag, action = '';
    if (selected) tag = `<span class="ci-tag tag-selected">Selected</span>`;
    else if (owned) tag = `<span class="ci-tag tag-owned">Owned — tap to select</span>`;
    else if (e.unlock.type === 'cinders') { tag = `<span class="ci-tag tag-locked">Locked</span>`; action = `<button class="ci-buy">Unlock ✦ ${e.unlock.cost}</button>`; }
    else tag = `<span class="ci-tag tag-locked">${e.unlock.label}</span>`;
    div.innerHTML = `
      <div class="ci-head"><div class="ci-name"><span class="ic" style="color:${e.color}">${e.icon}</span>${e.name}</div></div>
      ${tag}
      <div class="ci-desc">${e.blurb}<br><span style="color:#8a806f">Weapon: ${w.icon} ${w.name}</span></div>
      ${action}`;
    if (owned) div.onclick = () => { save.selectedEmber = e.id; persist(); renderEmbers(); toast(e.name + ' selected'); };
    if (!owned && e.unlock.type === 'cinders') {
      div.querySelector('.ci-buy').onclick = ev => {
        ev.stopPropagation();
        if (save.cinders >= e.unlock.cost) { save.cinders -= e.unlock.cost; save.embers[e.id] = true; save.selectedEmber = e.id; persist(); sfx.buy(); renderEmbers(); toast('Unlocked ' + e.name); }
        else toast('Not enough cinders');
      };
    }
    list.appendChild(div);
  });
}

function showGameOver(earned) {
  const won = hasWon;
  el('over-title').textContent = won ? 'You held back the dark' : 'The ember fades';
  el('over-title').classList.toggle('win', won);
  el('over-summary').innerHTML = `
    <div class="rs-row"><span>Survived</span><b>${fmtTime(runTime)}</b></div>
    <div class="rs-row"><span>Level</span><b>${player.level}</b></div>
    <div class="rs-row"><span>Kills</span><b>${killCount}</b></div>
    <div class="rs-row"><span>Wardens felled</span><b>${bossKills}</b></div>
    <div class="rs-row"><span>Cinders earned</span><b>✦ ${earned}</b></div>
    <div class="rs-row"><span>Total cinders</span><b>✦ ${save.cinders}</b></div>`;
  const uw = el('over-unlocks'); uw.innerHTML = '';
  const seen = new Set();
  runUnlocks.forEach(u => { if (seen.has(u)) return; seen.add(u); const d = document.createElement('div'); d.className = 'unlock-line'; d.textContent = '★ ' + u; uw.appendChild(d); });
}

function showPause() {
  el('pause-stats').innerHTML = `
    <div class="rs-row"><span>Time</span><b>${fmtTime(runTime)}</b></div>
    <div class="rs-row"><span>Level</span><b>${player.level}</b></div>
    <div class="rs-row"><span>Kills</span><b>${killCount}</b></div>
    <div class="rs-row"><span>Cinders so far</span><b>✦ ${computeCinders()}</b></div>`;
}

/* --------------------------------------------------------------- wiring */
el('btn-play').onclick = () => { actx(); startRun(); };
el('btn-forge').onclick = () => { renderForge(); setState('forge'); };
el('btn-embers').onclick = () => { renderEmbers(); setState('embers'); };
el('btn-how').onclick = () => setState('how');
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { renderMenuStats(); setState('menu'); });

el('pause-btn').onclick = () => { if (state === 'playing') { showPause(); setState('pause'); } };
el('btn-resume').onclick = () => { lastT = now(); setState('playing'); };
el('btn-quit').onclick = () => { endRun(); };

el('btn-again').onclick = () => startRun();
el('btn-forge2').onclick = () => { renderForge(); setState('forge'); };
el('btn-menu').onclick = () => { renderMenuStats(); setState('menu'); };

// pause when tab hidden
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') { showPause(); setState('pause'); } });

// boot
renderMenuStats();
setState('menu');

})();
