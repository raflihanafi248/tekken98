'use strict';
// ---------------------------------------------------------------------------
// Konstanta global & fungsi bantu
// ---------------------------------------------------------------------------
const W = 384;            // resolusi internal (pixel art)
const H = 216;
const GROUND = 196;       // garis lantai di layar
const STAGE_W = 640;      // lebar arena
const GRAVITY = 0.32;
const DEG = Math.PI / 180;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// kotak: {x, y, w, h} dengan y = tinggi dari lantai (ke atas)
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return c;
}

function hex2rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(r, g, b) {
  const c = (v) => clamp(Math.round(v), 0, 255);
  return '#' + ((1 << 24) | (c(r) << 16) | (c(g) << 8) | c(b)).toString(16).slice(1);
}
function shade(hex, f) {
  const [r, g, b] = hex2rgb(hex);
  return rgb2hex(r * f, g * f, b * f);
}
function mix(h1, h2, t) {
  const a = hex2rgb(h1), b = hex2rgb(h2);
  return rgb2hex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}
const _packCache = new Map();
function pack(hex) {
  let v = _packCache.get(hex);
  if (v === undefined) {
    const [r, g, b] = hex2rgb(hex);
    v = (0xFF000000 | (b << 16) | (g << 8) | r) >>> 0;
    _packCache.set(hex, v);
  }
  return v;
}

// Penyimpanan lokal yang aman (bisa gagal di mode privat)
const Store = {
  get(key, def) {
    try {
      const v = localStorage.getItem('tekken98_' + key);
      return v === null ? def : JSON.parse(v);
    } catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('tekken98_' + key, JSON.stringify(val)); } catch (e) { /* abaikan */ }
  },
};

const Settings = Object.assign({
  sfx: 8,          // 0..10
  music: 6,        // 0..10
  voice: true,     // suara announcer
  difficulty: 1,   // 0 mudah, 1 normal, 2 sulit
  roundTime: 99,
  rounds: 2,       // ronde untuk menang
}, Store.get('settings', {}));
function saveSettings() { Store.set('settings', Settings); }
