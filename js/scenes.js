'use strict';
// ---------------------------------------------------------------------------
// Layar-layar game: judul, menu, pilih karakter, arena, VS, hasil, arcade...
// ---------------------------------------------------------------------------
function drawFigure(ctx, renderer, def, pal, pose, x, y, scale, facing, time, outline) {
  const cv = renderer.render(def, pal, pose, { time, outline });
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * scale, scale);
  ctx.drawImage(cv, -renderer.ox, -renderer.oy);
  ctx.restore();
}

function isUnlocked(cid) { return !CHARACTERS[cid].boss || Store.get('unlockDevil', false); }

const DIFF_NAMES = ['MUDAH', 'NORMAL', 'SULIT'];

function humanCtrl(slot, twoPlayer) {
  if (!twoPlayer) return new HumanController(['p1', 'p2'], [0, 1]);
  return slot === 0 ? new HumanController(['p1'], [0]) : new HumanController(['p2'], [1]);
}

// Latar menu bersama (arena abyss bergeser pelan)
const MenuBG = {
  stage: null,
  frame: 0,
  draw(ctx, dim = 0.55) {
    if (!this.stage) this.stage = new Stage('abyss');
    this.frame++;
    this.stage.update(this.frame);
    const cam = (STAGE_W - W) / 2 + Math.sin(this.frame * 0.003) * 100;
    this.stage.draw(ctx, cam, this.frame);
    this.stage.drawFront(ctx, cam);
    ctx.fillStyle = `rgba(4,4,10,${dim})`;
    ctx.fillRect(0, 0, W, H);
  },
};

function drawLogo(ctx, cx, y, scale = 5) {
  const white = ['#ffffff', '#ffffff', '#f0f0f8', '#d8d8e8', '#b8b8d0', '#9898b8', '#7878a0'];
  const red = ['#ff8080', '#ff4040', '#ff2020', '#e01010', '#c00808', '#a00000', '#800000'];
  const wT = textWidth('TEKKEN', scale), w9 = textWidth('98', scale + 2);
  const x0 = cx - (wT + w9 + scale * 2) / 2;
  drawText(ctx, 'TEKKEN', x0, y, { scale, color: white, outline: '#200008' });
  drawText(ctx, '98', x0 + wT + scale * 2, y - scale, { scale: scale + 2, color: red, outline: '#200008' });
}

// =============================== JUDUL ======================================
class TitleScene {
  constructor() {
    this.t = 0;
    this.rk = new FigureRenderer(); this.rj = new FigureRenderer();
    Sound.playSong('title');
  }
  update() {
    this.t++;
    if (this.t > 20 && (Input.confirm() || Input.pressed.size > 0)) {
      Sound.init(); Sound.play('select');
      Game.go(() => new MenuScene());
    }
  }
  draw(ctx) {
    MenuBG.draw(ctx, 0.15);
    // aura merah di belakang petarung
    const pulse = Math.sin(this.t * 0.05) * 3;
    ditherGlow(ctx, 150, 140, 70 + pulse, '#5a0a18');
    ditherGlow(ctx, 245, 140, 62 + pulse, '#3a0a30');
    const kz = CHARACTERS.kazuya, jn = CHARACTERS.jin;
    drawFigure(ctx, this.rk, kz, kz.palettes[0], getPose(kz, 'armsCrossed'), 150, 214, 2, -1, this.t, '#3a0010');
    drawFigure(ctx, this.rj, jn, jn.palettes[0], animPose(jn, ANIMS.idle.keys, this.t, true), 250, 214, 2, 1, this.t, '#2a0020');
    // bara
    for (let i = 0; i < 3; i++) {
      MenuBG.stage.add({ x: rand(0, STAGE_W), y: H + 4, vx: rand(-0.3, 0.3), vy: -rand(0.5, 1.4), life: 200, color: choice(['#ff3030', '#ff8040', '#ffd060']), size: 1, sway: 0.3, layer: 1, screenY: true });
    }
    drawLogo(ctx, W / 2, 16, 5);
    drawText(ctx, 'PIXEL FIGHTER', W / 2, 56, { align: 'center', color: '#ffd0d0', outline: '#200008' });
    if ((this.t >> 5) % 2 === 0) {
      rect(ctx, W / 2 - 74, 176, 148, 20, 'rgba(0,0,0,0.6)');
      drawText(ctx, 'TEKAN ENTER', W / 2, 179, { align: 'center', scale: 2, color: '#ffffff', outline: '#000000' });
    }
    drawText(ctx, 'FAN GAME TIDAK RESMI. TEKKEN (C) BANDAI NAMCO', W / 2, H - 10, { align: 'center', color: '#8080a0' });
  }
}

const _glowCache = new Map();
function ditherGlow(ctx, cx, cy, r, color) {
  r = Math.round(r);
  const key = r + color;
  let c = _glowCache.get(key);
  if (!c) {
    c = makeCanvas(r * 2, r * 2);
    const g = c.getContext('2d');
    ditherFill(g, 0, 0, r * 2, r * 2, (x, y, th) => {
      const d = Math.hypot(x - r, (y - r) * 1.15) / r;
      return d < 1 && (1 - d) * 0.9 > th ? color : null;
    });
    _glowCache.set(key, c);
  }
  ctx.drawImage(c, Math.round(cx - r), Math.round(cy - r));
}

// =============================== MENU UTAMA =================================
class MenuScene {
  constructor() {
    this.sel = 0;
    this.items = [
      ['ARCADE', 'LAWAN SEMUA PETARUNG HINGGA BOS TERAKHIR'],
      ['VS CPU', 'SATU PERTARUNGAN MELAWAN KOMPUTER'],
      ['VS PEMAIN 2', 'DUA PEMAIN DI SATU KEYBOARD / GAMEPAD'],
      ['LATIHAN', 'LATIH COMBO MELAWAN DUMMY'],
      ['DAFTAR JURUS', 'LIHAT SEMUA JURUS SETIAP KARAKTER'],
      ['KONTROL', 'TOMBOL KEYBOARD & GAMEPAD'],
      ['PENGATURAN', 'SUARA, KESULITAN, WAKTU, RONDE'],
    ];
    this.t = 0;
    Sound.playSong('title');
  }
  update() {
    this.t++;
    if (Input.menuUp()) { this.sel = (this.sel + this.items.length - 1) % this.items.length; Sound.play('cursor'); }
    if (Input.menuDown()) { this.sel = (this.sel + 1) % this.items.length; Sound.play('cursor'); }
    if (Input.back()) { Sound.play('back'); Game.go(() => new TitleScene()); return; }
    if (!Input.confirm()) return;
    Sound.play('select');
    const id = this.items[this.sel][0];
    if (id === 'ARCADE') Game.go(() => new SelectScene('arcade'));
    else if (id === 'VS CPU') Game.go(() => new SelectScene('cpu'));
    else if (id === 'VS PEMAIN 2') Game.go(() => new SelectScene('vs2p'));
    else if (id === 'LATIHAN') Game.go(() => new SelectScene('training'));
    else if (id === 'DAFTAR JURUS') Game.go(() => new MoveListScene());
    else if (id === 'KONTROL') Game.go(() => new ControlsScene());
    else if (id === 'PENGATURAN') Game.go(() => new OptionsScene());
  }
  draw(ctx) {
    MenuBG.draw(ctx, 0.6);
    drawLogo(ctx, W / 2, 18, 3);
    this.items.forEach(([name], i) => {
      const sel = i === this.sel;
      const y = 56 + i * 18;
      if (sel) {
        rect(ctx, W / 2 - 90, y - 4, 180, 15, '#5a0a14');
        rect(ctx, W / 2 - 90, y - 4, 3, 15, '#ff3040');
        rect(ctx, W / 2 + 87, y - 4, 3, 15, '#ff3040');
      }
      drawText(ctx, name, W / 2, y, { align: 'center', scale: 1, color: sel ? '#ffffff' : '#9090a8', outline: '#000000' });
    });
    drawText(ctx, this.items[this.sel][1], W / 2, H - 22, { align: 'center', color: '#ffd040', outline: '#000000' });
    drawText(ctx, '↑↓ PILIH   ENTER/F OK   ESC KEMBALI', W / 2, H - 10, { align: 'center', color: '#707088' });
  }
}

// =========================== PILIH KARAKTER =================================
class SelectScene {
  constructor(mode) {
    this.mode = mode;
    this.t = 0;
    this.slots = ROSTER;
    this.cur = [0, 1];
    this.done = [false, false];
    this.pal = [0, 0];
    // pemain kedua: manusia hanya di vs2p; lainnya P1 memilih lawan setelahnya
    this.stage2 = false;
    this.ren = [new FigureRenderer(), new FigureRenderer()];
    this.portraits = {};
    for (const cid of ROSTER) this.portraits[cid] = makePortrait(cid, 0);
    Sound.playSong('select');
  }
  get two() { return this.mode === 'vs2p'; }
  get needOpponent() { return this.mode === 'cpu' || this.mode === 'training'; }

  moveCursor(i, who) {
    let c = this.cur[i];
    const l = who ? Input.menuLeft(who) : Input.menuLeft();
    const r = who ? Input.menuRight(who) : Input.menuRight();
    if (l) { c = (c + this.slots.length - 1) % this.slots.length; Sound.play('cursor'); }
    if (r) { c = (c + 1) % this.slots.length; Sound.play('cursor'); }
    this.cur[i] = c;
  }

  pick(i, palIdx) {
    const cid = this.slots[this.cur[i]];
    if (!isUnlocked(cid)) { Sound.play('back'); return; }
    let p = palIdx;
    const j = 1 - i;
    if (this.done[j] && this.slots[this.cur[j]] === cid && this.pal[j] === p) p = 1 - p;
    this.pal[i] = p; this.done[i] = true;
    Sound.play('select');
  }

  update() {
    this.t++;
    if (this.two) {
      for (let i = 0; i < 2; i++) {
        const who = i === 0 ? 'p1' : 'p2';
        if (!this.done[i]) {
          this.moveCursor(i, who);
          const km = KEYMAP[who];
          if (Input.confirmP(who)) this.pick(i, 0);
          else if (Input.wasPressed(km.hp) || (Input.padPressed[i] && Input.padPressed[i].hp)) this.pick(i, 1);
          else if (Input.backP(who) && i === 0) { Sound.play('back'); Game.go(() => new MenuScene()); return; }
        } else if (Input.backP(who)) { this.done[i] = false; Sound.play('back'); }
      }
      if (this.done[0] && this.done[1]) this.finish();
      return;
    }
    const i = this.stage2 ? 1 : 0;
    this.moveCursor(i);
    if (Input.confirm()) this.pick(i, 0);
    else if (Input.wasPressed(['KeyG', 'KeyL'])) this.pick(i, 1);
    else if (Input.back()) {
      Sound.play('back');
      if (this.stage2) { this.stage2 = false; this.done[0] = false; }
      else { Game.go(() => new MenuScene()); return; }
    }
    if (this.done[i]) {
      if (this.needOpponent && !this.stage2) { this.stage2 = true; this.cur[1] = (this.cur[0] + 1) % 3; }
      else this.finish();
    }
  }

  finish() {
    const p1 = { cid: this.slots[this.cur[0]], pal: this.pal[0] };
    if (this.mode === 'arcade') { Game.go(() => startArcade(p1)); return; }
    const p2 = { cid: this.slots[this.cur[1]], pal: this.pal[1] };
    Game.go(() => new StageSelectScene(this.mode, p1, p2));
  }

  draw(ctx) {
    MenuBG.draw(ctx, 0.5);
    // panel kiri/kanan
    rect(ctx, 0, 0, W, 22, '#0a0810');
    rect(ctx, 0, 22, W, 1, '#c02030');
    const title = { arcade: 'ARCADE', cpu: 'VS CPU', vs2p: 'VS PEMAIN 2', training: 'LATIHAN' }[this.mode];
    drawText(ctx, 'PILIH KARAKTER - ' + title, W / 2, 8, { align: 'center', color: '#ffffff' });
    // pratinjau
    for (let i = 0; i < 2; i++) {
      const showSecond = i === 1 && (this.two || this.stage2 || (this.needOpponent && this.done[0]));
      if (i === 1 && !showSecond) {
        if (this.mode === 'arcade') drawText(ctx, '?', W - 70, 110, { align: 'center', scale: 6, color: '#30303c', outline: '#000000' });
        continue;
      }
      const cid = this.slots[this.cur[i]];
      const c = CHARACTERS[cid];
      const locked = !isUnlocked(cid);
      const x = i === 0 ? 70 : W - 70;
      const pal = this.done[i] ? this.pal[i] : 0;
      ditherGlow(ctx, x, 140, 56, i === 0 ? '#4a0a14' : '#0a1a4a');
      if (!locked) {
        const pose = this.done[i] ? animPose(c, c.win, Math.min(this.t, 60), false) : animPose(c, ANIMS.idle.keys, this.t, true);
        drawFigure(ctx, this.ren[i], c, c.palettes[pal], pose, x, 200, 2, i === 0 ? 1 : -1, this.t);
      } else drawText(ctx, '?', x, 100, { align: 'center', scale: 8, color: '#30303c', outline: '#000000' });
      const nm = locked ? '???' : c.full;
      drawText(ctx, nm, x, 168, { align: 'center', color: '#ffffff', outline: '#000000' });
      drawText(ctx, locked ? 'SELESAIKAN ARCADE' : c.style, x, 178, { align: 'center', color: '#ffb040', outline: '#000000' });
      const who = this.two ? (i === 0 ? 'P1' : 'P2') : (i === 0 ? 'P1' : 'CPU');
      drawText(ctx, who, x, 30, { align: 'center', scale: 2, color: i === 0 ? '#ff4050' : '#4080ff', outline: '#000000' });
      if (this.done[i]) drawText(ctx, 'SIAP!', x, 190, { align: 'center', color: '#40ff80', outline: '#000000' });
    }
    // grid potret
    const n = this.slots.length, size = 34, gap = 4;
    const gx = W / 2 - (n * (size + gap) - gap) / 2, gy = 60;
    this.slots.forEach((cid, k) => {
      const x = gx + k * (size + gap);
      rect(ctx, x - 1, gy - 1, size + 2, size + 2, '#000000');
      rect(ctx, x, gy, size, size, '#1a1424');
      if (isUnlocked(cid)) ctx.drawImage(this.portraits[cid], x + 1, gy + 1, size - 2, size - 2);
      else drawText(ctx, '?', x + size / 2, gy + 10, { align: 'center', scale: 2, color: '#60607a' });
      const blink = (this.t >> 3) % 2;
      for (let i = 0; i < 2; i++) {
        const active = i === 0 ? !this.stage2 || this.two : this.stage2 || this.two;
        if (this.cur[i] !== k || (!active && !this.done[i])) continue;
        if (i === 1 && !this.two && !this.stage2 && !this.done[1]) continue;
        const col = i === 0 ? '#ff3040' : '#3070ff';
        if (blink || this.done[i]) {
          ctx.strokeStyle = col; ctx.lineWidth = 2;
          ctx.strokeRect(x - 2 + i, gy - 2 + i, size + 4 - i * 2, size + 4 - i * 2);
        }
        drawText(ctx, i === 0 ? '1P' : (this.two ? '2P' : 'CPU'), x + size / 2, i === 0 ? gy - 10 : gy + size + 4, { align: 'center', color: col, outline: '#000000' });
      }
    });
    const hint = this.two ? 'P1: A/D + F   P2: ←/→ + K   (HP = WARNA KE-2)' : '← → PILIH   F/ENTER OK   G = WARNA KE-2   ESC KEMBALI';
    drawText(ctx, hint, W / 2, H - 10, { align: 'center', color: '#8888a0', outline: '#000000' });
    if (this.stage2) drawText(ctx, 'PILIH LAWAN', W / 2, 108, { align: 'center', scale: 2, color: '#4080ff', outline: '#000000' });
  }
}

function makePortrait(cid, pal) {
  const c = CHARACTERS[cid];
  const r = new FigureRenderer();
  r.render(c, c.palettes[pal], getPose(c, 'idle1'), {});
  const j = r.joints.N;
  const out = makeCanvas(22, 22);
  out.getContext('2d').drawImage(r.canvas, Math.round(j[0] - 10), Math.round(j[1] - 18), 22, 22, 0, 0, 22, 22);
  return out;
}

// ============================== PILIH ARENA =================================
class StageSelectScene {
  constructor(mode, p1, p2) {
    this.mode = mode; this.p1 = p1; this.p2 = p2;
    this.opts = [...STAGE_IDS, 'random'];
    this.sel = 0; this.t = 0;
    this.stages = {};
  }
  stage(id) { if (!this.stages[id]) this.stages[id] = new Stage(id); return this.stages[id]; }
  update() {
    this.t++;
    if (Input.menuLeft()) { this.sel = (this.sel + this.opts.length - 1) % this.opts.length; Sound.play('cursor'); }
    if (Input.menuRight()) { this.sel = (this.sel + 1) % this.opts.length; Sound.play('cursor'); }
    if (Input.back()) { Sound.play('back'); Game.go(() => new SelectScene(this.mode)); return; }
    if (Input.confirm()) {
      Sound.play('select');
      let id = this.opts[this.sel];
      if (id === 'random') id = choice(STAGE_IDS);
      const { mode, p1, p2 } = this;
      Game.go(() => new VsScene({ mode, p1, p2, stage: id }));
    }
  }
  draw(ctx) {
    const id = this.opts[this.sel];
    if (id === 'random') { MenuBG.draw(ctx, 0.5); drawText(ctx, '?', W / 2, 80, { align: 'center', scale: 8, color: '#ffffff', outline: '#000000' }); }
    else {
      const s = this.stage(id);
      s.update(this.t);
      s.draw(ctx, (STAGE_W - W) / 2 + Math.sin(this.t * 0.01) * 80, this.t);
      s.drawFront(ctx, (STAGE_W - W) / 2);
    }
    rect(ctx, 0, 0, W, 22, 'rgba(0,0,0,0.7)');
    drawText(ctx, 'PILIH ARENA', W / 2, 8, { align: 'center', color: '#ffffff' });
    const name = id === 'random' ? 'ACAK' : STAGES[id].name;
    rect(ctx, 0, H - 44, W, 26, 'rgba(0,0,0,0.7)');
    drawText(ctx, '←  ' + name + '  →', W / 2, H - 37, { align: 'center', scale: 2, color: '#ffd040', outline: '#000000' });
    drawText(ctx, 'ENTER OK   ESC KEMBALI', W / 2, H - 10, { align: 'center', color: '#c0c0d0', outline: '#000000' });
  }
}

// ================================= VS =======================================
class VsScene {
  // m: { mode, p1, p2, stage, arcade?, label? }
  constructor(m) {
    this.m = m; this.t = 0;
    this.ren = [new FigureRenderer(), new FigureRenderer()];
    Sound.stopSong();
    Sound.play('gong');
  }
  update() {
    this.t++;
    if (this.t > 150 || (this.t > 30 && Input.confirm())) Game.go(() => new FightScene(this.m));
  }
  draw(ctx) {
    const k = clamp(this.t / 20, 0, 1);
    rect(ctx, 0, 0, W, H, '#05040a');
    // dua sisi diagonal
    ctx.fillStyle = '#4a0810';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 30, 0); ctx.lineTo(W / 2 - 30, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#08104a';
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W / 2 + 34, 0); ctx.lineTo(W / 2 - 26, H); ctx.lineTo(W, H); ctx.fill();
    for (let i = 0; i < 20; i++) {
      const y = (i * 23 + this.t * 3) % H;
      rect(ctx, 0, y, W / 2 - 40, 1, 'rgba(255,60,80,0.15)');
      rect(ctx, W / 2 + 40, H - y, W / 2, 1, 'rgba(80,120,255,0.15)');
    }
    const ps = [this.m.p1, this.m.p2];
    for (let i = 0; i < 2; i++) {
      const c = CHARACTERS[ps[i].cid];
      const x = i === 0 ? lerp(-80, 90, k) : lerp(W + 80, W - 90, k);
      drawFigure(ctx, this.ren[i], c, c.palettes[ps[i].pal], animPose(c, c.intro, this.t, false), x, 206, 2.4, i === 0 ? 1 : -1, this.t);
      drawText(ctx, c.full, i === 0 ? 10 : W - 10, i === 0 ? 30 : H - 40, { align: i === 0 ? 'left' : 'right', scale: 2, color: '#ffffff', outline: '#000000' });
      drawText(ctx, c.style + ' / ' + c.country, i === 0 ? 10 : W - 10, i === 0 ? 48 : H - 22, { align: i === 0 ? 'left' : 'right', color: '#ffb040', outline: '#000000' });
    }
    const vs = this.t > 10 ? Math.max(4, Math.round(10 - this.t * 0.3)) : 0;
    if (vs) drawText(ctx, 'VS', W / 2 + 2, H / 2 - vs * 4, { align: 'center', scale: vs, color: ['#ffffff', '#ffe0a0', '#ffc040', '#ff9020', '#ff6010', '#e03010', '#a01008'], outline: '#000000' });
    if (this.m.label) drawText(ctx, this.m.label, W / 2, 8, { align: 'center', color: '#ffd040', outline: '#000000' });
    drawText(ctx, STAGES[this.m.stage].name, W / 2, H - 10, { align: 'center', color: '#c0c0d0', outline: '#000000' });
  }
}

// ============================= PERTARUNGAN ==================================
class FightScene {
  constructor(m) {
    this.m = m;
    const two = m.mode === 'vs2p';
    const c1 = humanCtrl(0, two);
    let c2;
    if (two) c2 = humanCtrl(1, true);
    else if (m.mode === 'training') c2 = new DummyController();
    else c2 = new AIController(m.level !== undefined ? m.level : [1, 2, 4][Settings.difficulty]);
    this.match = new Match({
      mode: m.mode, stage: m.stage,
      p1: { cid: m.p1.cid, pal: m.p1.pal, ctrl: c1 },
      p2: { cid: m.p2.cid, pal: m.p2.pal, ctrl: c2 },
      onEnd: (res) => this.onEnd(res),
      onQuit: () => { Arcade.run = null; Game.go(() => new MenuScene()); },
      onRestart: () => Game.go(() => new FightScene(this.m)),
    });
  }
  onEnd(res) {
    const m = this.m;
    if (m.mode === 'arcade') {
      if (res.winner === 0) Arcade.next();
      else Game.go(() => new ContinueScene());
      return;
    }
    Game.go(() => new ResultScene(m, res));
  }
  update() { this.match.update(); }
  draw(ctx) { this.match.draw(ctx); }
}

// ================================ HASIL =====================================
class ResultScene {
  constructor(m, res) {
    this.m = m; this.res = res; this.t = 0; this.sel = 0;
    this.w = res.winner === 0 ? m.p1 : m.p2;
    this.ren = new FigureRenderer();
    this.items = ['MAIN LAGI', 'PILIH KARAKTER', 'MENU UTAMA'];
  }
  update() {
    this.t++;
    if (Input.menuUp()) { this.sel = (this.sel + 2) % 3; Sound.play('cursor'); }
    if (Input.menuDown()) { this.sel = (this.sel + 1) % 3; Sound.play('cursor'); }
    if (this.t > 20 && Input.confirm()) {
      Sound.play('select');
      const m = this.m;
      if (this.sel === 0) Game.go(() => new VsScene(m));
      else if (this.sel === 1) Game.go(() => new SelectScene(m.mode));
      else Game.go(() => new MenuScene());
    }
  }
  draw(ctx) {
    MenuBG.draw(ctx, 0.55);
    const c = CHARACTERS[this.w.cid];
    ditherGlow(ctx, 100, 140, 70, '#5a3a08');
    drawFigure(ctx, this.ren, c, c.palettes[this.w.pal], animPose(c, c.win, this.t, false), 100, 206, 2.4, 1, this.t);
    const who = this.m.mode === 'vs2p' ? (this.res.winner === 0 ? 'P1' : 'P2') : (this.res.winner === 0 ? 'ANDA' : 'CPU');
    drawText(ctx, c.name + ' MENANG!', 250, 30, { align: 'center', scale: 2, color: '#ffd040', outline: '#000000' });
    drawText(ctx, '(' + who + ')  ' + this.res.wins[0] + ' - ' + this.res.wins[1], 250, 50, { align: 'center', color: '#ffffff', outline: '#000000' });
    wrapText(ctx, '"' + c.quote + '"', 250, 72, 30, '#e0e0f0');
    this.items.forEach((it, i) => {
      const sel = i === this.sel;
      drawText(ctx, (sel ? '> ' : '') + it, 250, 140 + i * 14, { align: 'center', color: sel ? '#ffffff' : '#8080a0', outline: '#000000' });
    });
  }
}

function wrapText(ctx, str, cx, y, maxChars, color) {
  const words = str.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      drawText(ctx, line.trim(), cx, yy, { align: 'center', color, outline: '#000000' });
      line = w; yy += 10;
    } else line += ' ' + w;
  }
  if (line.trim()) drawText(ctx, line.trim(), cx, yy, { align: 'center', color, outline: '#000000' });
  return yy;
}

// ================================ ARCADE ====================================
const Arcade = {
  run: null,
  start(p1) {
    const others = ROSTER.filter((c) => c !== p1.cid && !CHARACTERS[c].boss);
    for (let i = others.length - 1; i > 0; i--) { const j = randi(0, i); [others[i], others[j]] = [others[j], others[i]]; }
    const base = Settings.difficulty;
    const ladder = [];
    const stages = ['dojo', 'temple', choice(['dojo', 'temple'])];
    others.forEach((cid, i) => ladder.push({ cid, pal: 0, stage: stages[i] }));
    if (p1.cid !== 'devil') ladder.push({ cid: p1.cid, pal: 1 - p1.pal, stage: stages[2], label: 'BAYANGAN' });
    else ladder.push({ cid: 'jin', pal: 1, stage: stages[2] });
    ladder.push({ cid: p1.cid === 'devil' ? 'kazuya' : 'devil', pal: 0, stage: 'abyss', boss: true });
    ladder.forEach((s, i) => { s.level = clamp(base + i, 0, 5); });
    this.run = { p1, ladder, idx: 0 };
    return this.vs();
  },
  vs() {
    const r = this.run, s = r.ladder[r.idx];
    const label = s.boss ? 'PERTARUNGAN TERAKHIR' : 'PERTARUNGAN ' + (r.idx + 1) + ' / ' + r.ladder.length;
    return new VsScene({ mode: 'arcade', p1: r.p1, p2: { cid: s.cid, pal: s.pal }, stage: s.stage, level: s.level, label });
  },
  next() {
    const r = this.run;
    r.idx++;
    if (r.idx >= r.ladder.length) { Game.go(() => new EndingScene(r.p1)); this.run = null; }
    else Game.go(() => this.vs());
  },
};
function startArcade(p1) { return Arcade.start(p1); }

class ContinueScene {
  constructor() { this.t = 0; this.n = 9; Sound.stopSong(); }
  update() {
    this.t++;
    if (this.t % 60 === 0) { this.n--; Sound.play('tick'); }
    if (Input.confirm() && this.t > 15) { Sound.play('select'); Game.go(() => Arcade.vs()); return; }
    if (Input.back()) this.n = -1;
    if (this.n < 0) { Arcade.run = null; Game.go(() => new GameOverScene()); }
  }
  draw(ctx) {
    rect(ctx, 0, 0, W, H, '#05030a');
    drawText(ctx, 'LANJUTKAN?', W / 2, 50, { align: 'center', scale: 3, color: '#ffffff', outline: '#600010' });
    drawText(ctx, String(Math.max(0, this.n)), W / 2, 90, { align: 'center', scale: 7, color: '#ff3040', outline: '#000000' });
    drawText(ctx, 'TEKAN ENTER', W / 2, 170, { align: 'center', color: (this.t >> 4) % 2 ? '#ffffff' : '#808090' });
  }
}

class GameOverScene {
  constructor() { this.t = 0; }
  update() { this.t++; if (this.t > 180 || (this.t > 30 && Input.confirm())) Game.go(() => new TitleScene()); }
  draw(ctx) {
    rect(ctx, 0, 0, W, H, '#000000');
    drawText(ctx, 'GAME OVER', W / 2, H / 2 - 14, { align: 'center', scale: 4, color: '#a01020', outline: '#200000' });
  }
}

class EndingScene {
  constructor(p1) {
    this.p1 = p1; this.t = 0;
    this.c = CHARACTERS[p1.cid];
    this.ren = new FigureRenderer();
    this.unlocked = !Store.get('unlockDevil', false);
    Store.set('unlockDevil', true);
    Sound.playSong('title');
  }
  update() {
    this.t++;
    if (this.t > 120 && Input.confirm()) Game.go(() => new MenuScene());
  }
  draw(ctx) {
    MenuBG.draw(ctx, 0.7);
    ditherGlow(ctx, 80, 150, 60, '#4a0a14');
    drawFigure(ctx, this.ren, this.c, this.c.palettes[this.p1.pal], animPose(this.c, this.c.win, this.t, false), 80, 206, 2.2, 1, this.t);
    drawText(ctx, 'SELAMAT!', 250, 20, { align: 'center', scale: 2, color: '#ffd040', outline: '#000000' });
    const lines = this.c.ending;
    lines.forEach((l, i) => {
      if (this.t > 30 + i * 40) drawText(ctx, l, 250, 54 + i * 14, { align: 'center', color: '#ffffff', outline: '#000000' });
    });
    if (this.t > 260) {
      if (this.unlocked) drawText(ctx, 'DEVIL JIN TERBUKA!', 250, 150, { align: 'center', color: (this.t >> 3) % 2 ? '#ff4060' : '#ffffff', outline: '#000000' });
      drawText(ctx, 'TERIMA KASIH TELAH BERMAIN', 250, 170, { align: 'center', color: '#a0a0c0', outline: '#000000' });
      drawText(ctx, 'TEKAN ENTER', 250, 190, { align: 'center', color: '#808090' });
    }
  }
}

// =============================== PENGATURAN =================================
class OptionsScene {
  constructor() { this.sel = 0; }
  items() {
    return [
      ['VOLUME EFEK', Settings.sfx + ' / 10'],
      ['VOLUME MUSIK', Settings.music + ' / 10'],
      ['SUARA ANNOUNCER', Settings.voice ? 'ON' : 'OFF'],
      ['KESULITAN CPU', DIFF_NAMES[Settings.difficulty]],
      ['WAKTU RONDE', Settings.roundTime >= 999 ? 'TAK TERBATAS' : String(Settings.roundTime)],
      ['MENANG DENGAN', Settings.rounds + ' RONDE'],
      ['KEMBALI', ''],
    ];
  }
  change(i, d) {
    if (i === 0) Settings.sfx = clamp(Settings.sfx + d, 0, 10);
    else if (i === 1) Settings.music = clamp(Settings.music + d, 0, 10);
    else if (i === 2) Settings.voice = !Settings.voice;
    else if (i === 3) Settings.difficulty = (Settings.difficulty + d + 3) % 3;
    else if (i === 4) { const t = [60, 99, 999]; Settings.roundTime = t[(t.indexOf(Settings.roundTime) + d + 3) % 3]; }
    else if (i === 5) Settings.rounds = clamp(Settings.rounds + d, 1, 3);
    Sound.applyVolume(); saveSettings(); Sound.play('cursor');
  }
  update() {
    const n = this.items().length;
    if (Input.menuUp()) { this.sel = (this.sel + n - 1) % n; Sound.play('cursor'); }
    if (Input.menuDown()) { this.sel = (this.sel + 1) % n; Sound.play('cursor'); }
    if (Input.menuLeft()) this.change(this.sel, -1);
    if (Input.menuRight()) this.change(this.sel, 1);
    if (Input.back() || (Input.confirm() && this.sel === n - 1)) { Sound.play('back'); Game.go(() => new MenuScene()); return; }
    if (Input.confirm()) this.change(this.sel, 1);
  }
  draw(ctx) {
    MenuBG.draw(ctx, 0.7);
    drawText(ctx, 'PENGATURAN', W / 2, 20, { align: 'center', scale: 2, color: '#ffffff', outline: '#600010' });
    this.items().forEach(([k, v], i) => {
      const sel = i === this.sel, y = 56 + i * 18;
      if (sel) rect(ctx, 50, y - 4, W - 100, 15, '#3a0a14');
      drawText(ctx, k, 64, y, { color: sel ? '#ffffff' : '#9090a8' });
      if (v) drawText(ctx, '< ' + v + ' >', W - 64, y, { align: 'right', color: sel ? '#ffd040' : '#a08030' });
    });
    drawText(ctx, '← → UBAH   ESC KEMBALI', W / 2, H - 12, { align: 'center', color: '#707088' });
  }
}

// ================================ KONTROL ===================================
class ControlsScene {
  update() { if (Input.back() || Input.confirm()) { Sound.play('back'); Game.go(() => new MenuScene()); } }
  draw(ctx) {
    MenuBG.draw(ctx, 0.8);
    drawText(ctx, 'KONTROL', W / 2, 12, { align: 'center', scale: 2, color: '#ffffff', outline: '#600010' });
    const rows = [
      ['', 'PEMAIN 1', 'PEMAIN 2'],
      ['GERAK', 'W A S D', '↑ ← ↓ →'],
      ['LIGHT PUNCH (LP)', 'F', 'K / NUM4'],
      ['HEAVY PUNCH (HP)', 'G', 'L / NUM5'],
      ['LIGHT KICK (LK)', 'V', ', / NUM1'],
      ['HEAVY KICK (HK)', 'B', '. / NUM2'],
      ['LEMPAR', 'F + V', 'K + ,'],
      ['SUPER (METER PENUH)', 'F + G', 'K + L'],
      ['JEDA', 'ESC / ENTER', 'ESC / ENTER'],
    ];
    rows.forEach((r, i) => {
      const y = 38 + i * 13;
      const col = i === 0 ? '#ffd040' : '#ffffff';
      drawText(ctx, r[0], 20, y, { color: i === 0 ? col : '#c0c0d0' });
      drawText(ctx, r[1], 230, y, { align: 'center', color: col });
      drawText(ctx, r[2], 320, y, { align: 'center', color: col });
    });
    drawText(ctx, 'MODE 1 PEMAIN: KEDUA SET TOMBOL BISA DIPAKAI', W / 2, 160, { align: 'center', color: '#80d0ff' });
    drawText(ctx, 'GAMEPAD: X=LP Y=HP A=LK B=HK  LB=LEMPAR RB=SUPER', W / 2, 174, { align: 'center', color: '#80d0ff' });
    drawText(ctx, 'TAHAN ARAH MENJAUH UNTUK BLOK', W / 2, 188, { align: 'center', color: '#ffb040' });
    drawText(ctx, 'ESC KEMBALI', W / 2, H - 10, { align: 'center', color: '#707088' });
  }
}

class MoveListScene {
  constructor() { this.i = 0; }
  update() {
    const n = ROSTER.length;
    if (Input.menuLeft()) { this.i = (this.i + n - 1) % n; Sound.play('cursor'); }
    if (Input.menuRight()) { this.i = (this.i + 1) % n; Sound.play('cursor'); }
    if (Input.back() || Input.confirm()) { Sound.play('back'); Game.go(() => new MenuScene()); }
  }
  draw(ctx) {
    MenuBG.draw(ctx, 0.8);
    const cid = ROSTER[this.i];
    if (!isUnlocked(cid)) {
      drawText(ctx, '???', W / 2, 80, { align: 'center', scale: 4, color: '#606070' });
      drawText(ctx, 'SELESAIKAN ARCADE UNTUK MEMBUKA', W / 2, 130, { align: 'center', color: '#a0a0b0' });
      drawText(ctx, '← → GANTI KARAKTER', W / 2, H - 12, { align: 'center', color: '#707088' });
      return;
    }
    drawMoveListPanel(ctx, cid, 0);
    rect(ctx, 22, H - 36, W - 44, 12, '#0c0a14');
    drawText(ctx, '← → GANTI KARAKTER   ESC KEMBALI', W / 2, H - 34, { align: 'center', color: '#a0a0b0' });
  }
}
