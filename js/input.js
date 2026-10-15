'use strict';
// ---------------------------------------------------------------------------
// Input: keyboard + gamepad, riwayat arah untuk membaca gerakan spesial
// ---------------------------------------------------------------------------
const KEYMAP = {
  p1: {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    lp: ['KeyU'], hp: ['KeyI'], lk: ['KeyJ'], hk: ['KeyK'],
  },
  p2: {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    lp: ['Numpad4', 'BracketLeft'], hp: ['Numpad5', 'BracketRight'], lk: ['Numpad1', 'Semicolon'], hk: ['Numpad2', 'Quote'],
  },
};
const BUTTONS = ['lp', 'hp', 'lk', 'hk'];
const CONFIRM_KEYS = ['Enter', 'Space', 'KeyU', 'Numpad4', 'BracketLeft', 'NumpadEnter'];
const BACK_KEYS = ['Escape', 'Backspace', 'KeyK', 'Numpad2', 'Quote'];

const Input = {
  down: new Set(),
  queue: new Set(),
  pressed: new Set(),
  pads: [null, null],
  padPrev: [{}, {}],
  padPressed: [{}, {}],
  repeat: {},
  anyKeyHandlers: [],

  init() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Quote', 'Slash', 'Semicolon', 'BracketLeft', 'BracketRight'].includes(e.code) || e.code.startsWith('Numpad')) e.preventDefault();
      if (!e.repeat) this.queue.add(e.code);
      this.down.add(e.code);
      for (const h of this.anyKeyHandlers) h(e);
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
    window.addEventListener('blur', () => { this.down.clear(); });
    window.addEventListener('pointerdown', () => { for (const h of this.anyKeyHandlers) h(null); });
  },

  // dipanggil sekali tiap frame logika
  update() {
    this.pressed = this.queue;
    this.queue = new Set();
    const pads = (navigator.getGamepads ? navigator.getGamepads() : []) || [];
    let n = 0;
    const found = [null, null];
    for (const p of pads) { if (p && p.connected && n < 2) found[n++] = p; }
    for (let i = 0; i < 2; i++) {
      const p = found[i];
      const st = {};
      if (p) {
        const b = (k) => !!(p.buttons[k] && p.buttons[k].pressed);
        const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
        st.left = b(14) || ax < -0.5; st.right = b(15) || ax > 0.5;
        st.up = b(12) || ay < -0.5; st.down = b(13) || ay > 0.5;
        st.lp = b(2); st.hp = b(3); st.lk = b(0); st.hk = b(1);
        st.lphp = b(5); st.lplk = b(4);
        st.start = b(9); st.select = b(8);
      }
      const pressed = {};
      for (const k in st) pressed[k] = st[k] && !this.padPrev[i][k];
      this.padPressed[i] = pressed;
      this.padPrev[i] = st;
      this.pads[i] = p ? st : null;
    }
  },

  isDown(codes) { for (const c of codes) if (this.down.has(c)) return true; return false; },
  wasPressed(codes) { for (const c of codes) if (this.pressed.has(c)) return true; return false; },

  // keadaan mentah pemain: maps = ['p1'] atau ['p1','p2'], pad = indeks gamepad
  raw(maps, pads) {
    const r = { left: false, right: false, up: false, down: false, hold: {}, press: {} };
    for (const m of maps) {
      const km = KEYMAP[m];
      r.left = r.left || this.isDown(km.left);
      r.right = r.right || this.isDown(km.right);
      r.up = r.up || this.isDown(km.up);
      r.down = r.down || this.isDown(km.down);
      for (const b of BUTTONS) {
        r.hold[b] = r.hold[b] || this.isDown(km[b]);
        r.press[b] = r.press[b] || this.wasPressed(km[b]);
      }
    }
    for (const i of pads) {
      const st = this.pads[i], pr = this.padPressed[i];
      if (!st) continue;
      r.left = r.left || st.left; r.right = r.right || st.right;
      r.up = r.up || st.up; r.down = r.down || st.down;
      for (const b of BUTTONS) { r.hold[b] = r.hold[b] || st[b]; r.press[b] = r.press[b] || pr[b]; }
      if (pr.lphp) { r.press.lp = r.press.hp = true; }
      if (pr.lplk) { r.press.lp = r.press.lk = true; }
    }
    return r;
  },

  // --- navigasi menu (semua pemain) dengan auto-repeat ---
  _menuDir(name, keys, padKey, only) {
    let held = this.isDown(keys);
    let pressed = this.wasPressed(keys);
    const padIdx = only === 'p1' ? [0] : only === 'p2' ? [1] : [0, 1];
    for (const i of padIdx) {
      if (this.pads[i]) { held = held || this.pads[i][padKey]; pressed = pressed || this.padPressed[i][padKey]; }
    }
    if (!held) { this.repeat[name] = 0; return pressed; }
    this.repeat[name] = (this.repeat[name] || 0) + 1;
    const t = this.repeat[name];
    return pressed || (t > 20 && t % 5 === 0);
  },
  menuUp(only) { return this._menuDir('u' + (only || ''), only ? KEYMAP[only].up : ['KeyW', 'ArrowUp'], 'up', only); },
  menuDown(only) { return this._menuDir('d' + (only || ''), only ? KEYMAP[only].down : ['KeyS', 'ArrowDown'], 'down', only); },
  menuLeft(only) { return this._menuDir('l' + (only || ''), only ? KEYMAP[only].left : ['KeyA', 'ArrowLeft'], 'left', only); },
  menuRight(only) { return this._menuDir('r' + (only || ''), only ? KEYMAP[only].right : ['KeyD', 'ArrowRight'], 'right', only); },
  confirm() {
    return this.wasPressed(CONFIRM_KEYS) || [0, 1].some((i) => this.padPressed[i].lp || this.padPressed[i].lk || this.padPressed[i].start);
  },
  back() {
    return this.wasPressed(BACK_KEYS) || [0, 1].some((i) => this.padPressed[i].hk || this.padPressed[i].select);
  },
  pause() {
    return this.wasPressed(['Escape', 'Enter', 'KeyP']) || [0, 1].some((i) => this.padPressed[i].start);
  },
  // konfirmasi per pemain (untuk layar pilih karakter 2 pemain)
  confirmP(p) {
    const km = KEYMAP[p];
    const pad = p === 'p1' ? 0 : 1;
    const extra = p === 'p1' ? ['Enter', 'Space'] : ['NumpadEnter'];
    return this.wasPressed(km.lp) || this.wasPressed(extra) || !!this.padPressed[pad].lp || !!this.padPressed[pad].lk || !!this.padPressed[pad].start;
  },
  backP(p) {
    const km = KEYMAP[p];
    const pad = p === 'p1' ? 0 : 1;
    const extra = p === 'p1' ? ['Escape', 'Backspace'] : [];
    return this.wasPressed(km.hk) || this.wasPressed(extra) || !!this.padPressed[pad].hk;
  },
};

// ---------------------------------------------------------------------------
// Controller: menghasilkan "InputFrame" untuk petarung tiap frame.
// Arah numpad: 1 2 3 = bawah-belakang, bawah, bawah-depan; 4 5 6; 7 8 9
// ---------------------------------------------------------------------------
const MOTIONS = {
  qcf2: { seq: [[2], [6, 3], [2], [6]], win: 34 },
  dp: { seq: [[6], [2, 1], [3]], win: 18 },
  qcf: { seq: [[2], [3], [6]], win: 16 },
  qcb: { seq: [[2], [1], [4]], win: 16 },
};

class Controller {
  constructor() {
    this.hist = [];            // riwayat arah absolut {x, y}
    this.age = { lp: 99, hp: 99, lk: 99, hk: 99 };
    this.log = [];             // riwayat input untuk mode latihan
  }

  numpad(i, facing) {
    const d = this.hist[i];
    if (!d) return 5;
    return 5 + d.x * facing + (d.y === 1 ? -3 : d.y === -1 ? 3 : 0);
  }

  match(seq, win, facing) {
    const n = Math.min(win, this.hist.length);
    let k = seq.length - 1;
    const fin = seq[k];
    let i = 0, found = false;
    for (; i < Math.min(5, n); i++) {
      const d = this.numpad(i, facing);
      if (fin.includes(d)) { found = true; break; }
      if (d !== 5) return false;
    }
    if (!found) return false;
    k--; i++;
    for (; i < n && k >= 0; i++) if (seq[k].includes(this.numpad(i, facing))) k--;
    return k < 0;
  }

  detectMotions(facing) {
    const m = new Set();
    for (const name in MOTIONS) if (this.match(MOTIONS[name].seq, MOTIONS[name].win, facing)) m.add(name);
    return m;
  }

  // dash: dua kali tekan depan/belakang
  detectDash(facing) {
    const now = this.numpad(0, facing), prev = this.numpad(1, facing);
    if (now === 6 && prev !== 6 && this.match([[6], [5], [6]], 14, facing)) return 1;
    if (now === 4 && prev !== 4 && this.match([[4], [5], [4]], 14, facing)) return -1;
    return 0;
  }

  // r: {left,right,up,down,press,hold}
  build(r, facing, forcedMotions) {
    const x = (r.right ? 1 : 0) - (r.left ? 1 : 0);
    const y = r.down ? 1 : (r.up ? -1 : 0);
    this.hist.unshift({ x, y });
    if (this.hist.length > 40) this.hist.pop();
    for (const b of BUTTONS) this.age[b] = r.press[b] ? 0 : this.age[b] + 1;
    const anyPress = BUTTONS.some((b) => r.press[b]);
    const motions = anyPress ? (forcedMotions || this.detectMotions(facing)) : new Set();
    const f = {
      x, y,
      up: y === -1, down: y === 1,
      fwd: x === facing, back: x === -facing,
      press: r.press, hold: r.hold, anyPress, motions,
      dash: forcedMotions ? 0 : this.detectDash(facing),
      lphp: anyPress && this.age.lp <= 3 && this.age.hp <= 3,
      lplk: anyPress && this.age.lp <= 3 && this.age.lk <= 3,
      numpad: this.numpad(0, facing),
    };
    // log untuk tampilan input mode latihan
    const last = this.log[0];
    const btns = BUTTONS.filter((b) => r.press[b]);
    if (!last || last.dir !== f.numpad || btns.length) {
      if (last && last.dir === f.numpad && !btns.length) last.n++;
      else this.log.unshift({ dir: f.numpad, btns, n: 1 });
      if (this.log.length > 14) this.log.pop();
    } else last.n++;
    return f;
  }
}

class HumanController extends Controller {
  constructor(maps, pads) { super(); this.maps = maps; this.pads = pads; this.human = true; }
  poll(facing) { return this.build(Input.raw(this.maps, this.pads), facing); }
}

// Controller kosong (dummy latihan atau saat demo)
class NullController extends Controller {
  constructor() { super(); this.cmd = { left: false, right: false, up: false, down: false, press: {}, hold: {} }; }
  poll(facing) { return this.build(this.cmd, facing); }
}
