'use strict';
// ---------------------------------------------------------------------------
// Match: dunia pertarungan — ronde, waktu, tabrakan, proyektil, kamera, HUD
// ---------------------------------------------------------------------------
class Match {
  // cfg: { mode, p1:{cid,pal,ctrl}, p2:{cid,pal,ctrl}, stage, onEnd, onQuit, onRestart, label }
  constructor(cfg) {
    this.cfg = cfg;
    this.mode = cfg.mode;
    this.training = cfg.mode === 'training';
    this.f = [
      new Fighter(cfg.p1.cid, cfg.p1.pal, 0, cfg.p1.ctrl),
      new Fighter(cfg.p2.cid, cfg.p2.pal, 1, cfg.p2.ctrl),
    ];
    this.stage = new Stage(cfg.stage);
    this.fx = new Effects();
    this.proj = [];
    this.round = 1; this.frame = 0;
    this.comboShow = [null, null];
    this.names = [null, null];
    this.texts = [];
    this.ann = null;
    this.hitstop = 0; this.freeze = 0; this.shakeT = 0; this.shakeA = 0; this.flashT = 0;
    this.paused = false; this.pauseSel = 0; this.subMenu = null;
    this.showBoxes = false; this.meterFull = false;
    this.adv = null; this.advText = '';
    this.ended = false;
    this.startRound(true);
    Sound.playSong(this.stage.def.song);
  }

  opponent(f) { return f === this.f[0] ? this.f[1] : this.f[0]; }

  startRound(first) {
    this.f[0].resetRound(STAGE_W / 2 - 70);
    this.f[1].resetRound(STAGE_W / 2 + 70);
    this.proj = [];
    this.camX = (STAGE_W - W) / 2;
    this.timer = Settings.roundTime; this.tf = 0;
    this.koVictim = null; this.koWinner = null; this.roundWinner = null; this.timeUpFlag = false;
    this.comboShow = [null, null];
    this.pt = 0;
    if (this.training) { this.phase = 'fight'; return; }
    if (first) { this.phase = 'intro'; for (const f of this.f) { f.state = 'intro'; f.t = 0; } }
    else this.phase = 'ready';
  }

  // ---------- layanan untuk Fighter ----------
  threatTo(me) {
    const o = this.opponent(me);
    if (o.state === 'attack' && o.move && !o.move.throw && Math.abs(o.x - me.x) < 150) return true;
    for (const p of this.proj) {
      if (p.owner === me || p.dead) continue;
      if (p.type === 'beam' || p.type === 'pillar' || Math.abs(p.x - me.x) < 170) return true;
    }
    return false;
  }
  shake(a) { this.shakeT = Math.max(this.shakeT, 10); this.shakeA = Math.max(this.shakeA, a); }
  announce(text, life = 60, color = '#ffffff', scale = 4) { this.ann = { text, t: 0, life, color, scale }; }
  popText(f, text, color) { this.texts.push({ x: f.x, y: f.y + 84, text, color: color || '#ffffff', t: 0 }); }
  moveName(f, name) { this.names[f.side] = { text: name, t: 70 }; }

  superFlash(A, m) {
    this.freeze = 40;
    this.cutin = { name: m.name, t: 0, side: A.side, f: A };
    Sound.play('super');
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      this.fx.part({ x: A.x + Math.cos(a) * 30, y: A.y + 40 + Math.sin(a) * 30, vx: -Math.cos(a) * 1.5, vy: -Math.sin(a) * 1.5, life: 20, color: choice(['#ffffff', '#ffe060', '#ff8030']), size: 2 });
    }
  }

  spawnProjectile(owner, s) {
    const d = owner.facing;
    this.proj.push({
      owner, type: s.type, spec: s, dir: d,
      x: owner.x + d * s.x, y: owner.y + s.y, vx: (s.vx || 0) * d,
      w: s.w || 20, h: s.h || 16, length: s.length || 0, color: s.color,
      t: 0, life: s.life || 400, hitCount: 0, lastHit: -99, dead: false,
    });
  }

  spawnPillar(owner, i, cfg) {
    const d = owner.facing;
    this.proj.push({
      owner, type: 'pillar', dir: d, x: owner.x + d * cfg.dx * (i + 1), y: 0, vx: 0, w: 28, h: 400,
      t: 0, warn: 6, life: 22, hitCount: 0, lastHit: -99, dead: false,
      spec: { dmg: cfg.dmg, chip: cfg.chip, hitstun: 30, blockstun: 14, push: 1, hitstop: 6, launch: { vx: 1, vy: 6.2, spin: 7 }, hits: 1 },
    });
  }

  // ---------- loop ----------
  update() {
    if (this.paused) { this.updatePause(); return; }
    if ((this.phase === 'fight' || this.phase === 'ready') && Input.pause()) { this.paused = true; this.pauseSel = 0; this.subMenu = null; Sound.play('select'); return; }

    this.frame++;
    this.stage.update(this.frame);
    this.fx.update();
    for (const t of this.texts) t.t++;
    this.texts = this.texts.filter((t) => t.t < 50);
    if (this.ann && ++this.ann.t > this.ann.life) this.ann = null;
    for (let i = 0; i < 2; i++) {
      const c = this.comboShow[i]; if (c && --c.t <= 0) this.comboShow[i] = null;
      const n = this.names[i]; if (n && --n.t <= 0) this.names[i] = null;
    }
    if (this.shakeT > 0) { this.shakeT--; if (!this.shakeT) this.shakeA = 0; }
    if (this.flashT > 0) this.flashT--;
    if (this.cutin) { this.cutin.t++; if (this.freeze <= 0) this.cutin = null; }

    const frozen = this.hitstop > 0 || this.freeze > 0;
    const control = this.phase === 'fight';
    for (const f of this.f) f.poll(this, frozen, control);

    if (this.freeze > 0) { this.freeze--; return; }
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.phase === 'ko' && this.pt < 60 && this.frame % 2 === 0) { this.pt++; return; }

    for (const f of this.f) f.update(this);
    for (const f of this.f) {
      if (f.hp < f.dispHp) { if (f.state !== 'hitstun' && f.state !== 'airHit') f.dispHp = Math.max(f.hp, f.dispHp - 4); }
      else f.dispHp = f.hp;
      if (f.rage && this.frame % 3 === 0) this.fx.aura(f);
      if (this.training && this.meterFull) f.meter = 1000;
    }
    this.resolvePush();
    this.updateCamera();
    this.clampFighters();
    this.resolvePush();
    this.clampFighters();
    this.updateProjectiles();
    this.checkHits();
    this.trackAdvantage();
    this.phaseUpdate();
  }

  resolvePush() {
    const [a, b] = this.f;
    if (a.state === 'thrown' || b.state === 'thrown') return;
    if (Math.abs(a.y - b.y) > 50) return;
    const min = a.pushWidth() + b.pushWidth();
    const dx = b.x - a.x;
    if (Math.abs(dx) < min) {
      const ov = min - Math.abs(dx);
      const dir = dx === 0 ? (a.side === 0 ? 1 : -1) : Math.sign(dx);
      a.x -= dir * ov / 2; b.x += dir * ov / 2;
    }
  }

  bounds() {
    return [Math.max(14, this.camX + 12), Math.min(STAGE_W - 14, this.camX + W - 12)];
  }

  updateCamera() {
    const mid = (this.f[0].x + this.f[1].x) / 2;
    const target = clamp(mid - W / 2, 0, STAGE_W - W);
    this.camX += (target - this.camX) * 0.5;
  }

  clampFighters() {
    const [lo, hi] = this.bounds();
    for (const f of this.f) { if (f.state !== 'thrown') f.x = clamp(f.x, lo, hi); }
  }

  atWall(f) {
    const [lo, hi] = this.bounds();
    return f.x <= lo + 1 || f.x >= hi - 1;
  }

  projBox(p) {
    if (p.type === 'beam') return { x: p.dir > 0 ? p.x : p.x - p.length, y: p.y - p.h / 2, w: p.length, h: p.h };
    if (p.type === 'pillar') return { x: p.x - p.w / 2, y: 0, w: p.w, h: p.h };
    return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
  }

  updateProjectiles() {
    for (const p of this.proj) {
      p.t++;
      if (p.type === 'beam') {
        const o = p.owner;
        if (o.state !== 'attack' || o.moveId !== 'super' || p.t >= p.life) { p.dead = true; continue; }
        p.dir = o.facing; p.x = o.x + o.facing * p.spec.x; p.y = o.y + p.spec.y;
        if (p.t % 6 === 0) this.shake(1);
      } else if (p.type === 'pillar') {
        if (p.t === p.warn) { Sound.play('thunder'); this.shake(3); }
        if (p.t >= p.life) p.dead = true;
      } else {
        p.x += p.vx;
        if (p.type === 'flame' && this.frame % 2 === 0) this.fx.part({ x: p.x - p.dir * 8, y: p.y + rand(-4, 4), vx: -p.dir * 0.3, vy: rand(-0.2, 0.4), life: 10, color: choice(['#ff4030', '#a01030', '#ff9a4a']), size: 2 });
        if (p.x < this.camX - 60 || p.x > this.camX + W + 60 || p.t > p.life) p.dead = true;
      }
    }
    // benturan proyektil
    for (let i = 0; i < this.proj.length; i++) {
      for (let j = i + 1; j < this.proj.length; j++) {
        const a = this.proj[i], b = this.proj[j];
        if (a.dead || b.dead || a.owner === b.owner || a.type === 'pillar' || b.type === 'pillar') continue;
        if (!overlap(this.projBox(a), this.projBox(b))) continue;
        if (a.type === 'beam' && b.type === 'beam') continue;
        if (a.type === 'beam') b.dead = true;
        else if (b.type === 'beam') a.dead = true;
        else { a.dead = true; b.dead = true; }
        this.fx.clash((a.x + b.x) / 2, (a.y + b.y) / 2);
        Sound.play('clash');
      }
    }
    for (const p of this.proj) {
      if (p.dead) continue;
      if (p.type === 'pillar' && p.t < p.warn) continue;
      const s = p.spec;
      if (p.hitCount >= (s.hits || 1)) continue;
      if (s.every && p.t - p.lastHit < s.every) continue;
      const B = this.opponent(p.owner);
      const box = this.projBox(p);
      for (const r of B.hurtboxes()) {
        if (overlap(box, r)) { this.applyProjHit(p, B, box, r); break; }
      }
    }
    this.proj = this.proj.filter((p) => !p.dead);
  }

  applyProjHit(p, B, box, r) {
    const s = p.spec, A = p.owner;
    p.hitCount++; p.lastHit = p.t;
    const last = p.hitCount >= (s.hits || 1);
    const h = {
      dmg: s.dmg, hitstun: s.hitstun, blockstun: s.blockstun, push: s.push, chip: s.chip, level: 'mid',
      dir: p.dir, proj: true, launch: last && s.lastLaunch ? s.lastLaunch : (s.launch || null),
      super: p.type === 'beam' || p.type === 'pillar',
    };
    const cx = (Math.max(box.x, r.x) + Math.min(box.x + box.w, r.x + r.w)) / 2;
    const cy = (Math.max(box.y, r.y) + Math.min(box.y + box.h, r.y + r.h)) / 2;
    const kind = { flame: 'flame', thunder: 'electric', pillar: 'electric', laser: 'normal', laserP: 'purple', beam: p.color === 'purple' ? 'purple' : 'flame' }[p.type] || 'normal';
    if (B.canBlock(p.x - p.dir * 100, 'mid')) {
      const res = B.block(h, A, this);
      this.fx.block(cx, cy); Sound.play('block');
      this.hitstop = Math.max(this.hitstop, 4);
      if (res.ko) this.onKO(B, A);
      this.startAdv(A, B);
    } else {
      const res = B.takeHit(h, A, this);
      this.fx.hit(cx, cy, 16, kind); Sound.play('hitH');
      this.hitstop = Math.max(this.hitstop, s.hitstop || 8);
      this.comboShow[A.side] = { hits: B.combo, dmg: B.comboDmg, t: 90 };
      if (res.ko) this.onKO(B, A);
      this.startAdv(A, B);
    }
    if (p.type !== 'beam' && p.type !== 'pillar' && last) p.dead = true;
  }

  checkHits() {
    const events = [];
    for (const A of this.f) {
      const B = this.opponent(A);
      if (A.state === 'attack' && A.move.throw) {
        if (A.mf > A.move.s && A.mf <= A.move.s + A.move.a && !A.contact) this.tryThrow(A, B);
        continue;
      }
      const hb = A.activeHitbox();
      if (!hb) continue;
      for (const r of B.hurtboxes()) {
        if (overlap(hb, r)) { events.push([A, B, A.move, hb, r]); break; }
      }
    }
    for (const e of events) this.applyHit(...e);
  }

  applyHit(A, B, m, hb, r) {
    const last = m.hits ? A.hitCount + 1 >= m.hits : true;
    const h = {
      dmg: m.dmg, hitstun: m.hitstun, blockstun: m.blockstun, push: m.push,
      chip: (m.special || m.super) ? Math.round(m.dmg * 0.25) : 0, level: m.level, box: m.box,
      launch: m.hits ? (last ? (m.lastLaunch || m.launch || null) : null) : (m.launch || null),
      sweep: m.sweep, super: m.super,
    };
    A.contact = true; A.hitCount++; A.lastHit = A.mf;
    const cx = (Math.max(hb.x, r.x) + Math.min(hb.x + hb.w, r.x + r.w)) / 2;
    const cy = (Math.max(hb.y, r.y) + Math.min(hb.y + hb.h, r.y + r.h)) / 2;
    const dirAway = Math.sign(B.x - A.x) || A.facing;
    const wall = this.atWall(B);
    if (B.canBlock(A.x, h.level)) {
      const res = B.block(h, A, this);
      this.fx.block(cx, cy); Sound.play('block');
      this.hitstop = Math.max(this.hitstop, Math.max(4, Math.round(m.hitstop * 0.7)));
      if (wall) A.pushX = -dirAway * h.push * 1.3;
      if (res.ko) this.onKO(B, A);
    } else {
      const res = B.takeHit(h, A, this);
      const heavy = m.dmg >= 60 || m.super;
      this.fx.hit(cx, cy, heavy ? 18 : 11, m.fx || 'normal');
      Sound.play(heavy ? 'hitH' : 'hitL');
      if (res.counter) { this.popText(B, 'COUNTER', '#ffe040'); Sound.play('counter'); }
      this.hitstop = Math.max(this.hitstop, m.hitstop + (res.counter ? 3 : 0));
      if (heavy) this.shake(m.super ? 4 : 2);
      if (wall && B.state === 'hitstun') A.pushX = -dirAway * h.push * 1.3;
      this.comboShow[A.side] = { hits: B.combo, dmg: B.comboDmg, t: 90 };
      if (res.ko) this.onKO(B, A);
    }
    this.startAdv(A, B);
  }

  tryThrow(A, B) {
    const okState = NEUTRAL.has(B.state) || B.state === 'land' || B.state === 'dash' || B.state === 'attack' && !B.move.air;
    if (!okState || B.y > 0 || B.inv > 0) return;
    if (B.state === 'attack' && B.move.inv && B.mf >= B.move.inv[0] && B.mf <= B.move.inv[1]) return;
    if (Math.abs(A.x - B.x) > A.move.range) return;
    A.contact = true;
    // lepas lemparan (throw tech)
    if (B.ctrl.age.lp <= 7 && B.ctrl.age.lk <= 7) {
      for (const f of [A, B]) { f.state = 'blockstun'; f.t = 0; f.stun = 16; f.move = null; f.blockCrouch = false; f.pushX = -3 * f.facing; }
      this.popText(B, 'TECH!', '#80d0ff');
      this.fx.clash((A.x + B.x) / 2, 50); Sound.play('clash');
      return;
    }
    A.state = 'throwing'; A.t = 0; A.throwBack = A.inp.back; A.throwVictim = B; A.move = null;
    B.state = 'thrown'; B.t = 0; B.move = null; B.vx = 0; B.vy = 0; B.rot = 0;
    Sound.play('throw');
  }

  onKO(B, A) {
    if (this.phase !== 'fight') return;
    if (this.training) return;
    this.phase = 'ko'; this.pt = 0;
    this.koVictim = B; this.koWinner = A;
    Sound.play('ko'); Sound.say('K.O.');
    this.announce('K.O.', 140, '#ff2828', 5);
    this.hitstop = 24; this.flashT = 8;
  }

  timeUp() {
    this.phase = 'timeup'; this.pt = 0; this.timeUpFlag = true;
    this.announce('TIME', 100, '#ffd040', 4);
    Sound.say('Time');
    const [a, b] = this.f;
    const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    this.koWinner = ra > rb ? a : rb > ra ? b : null;
  }

  endRound(w) {
    this.phase = 'roundEnd'; this.pt = 0;
    const [a, b] = this.f;
    if (a.hp <= 0 && b.hp <= 0) w = null;
    this.roundWinner = w;
    if (w) {
      w.wins++;
      if (w.hp === w.maxHp) { this.announce('PERFECT', 110, '#ffd040', 4); Sound.say('Perfect'); }
    } else {
      a.wins++; b.wins++;
      this.announce('DRAW', 110, '#ffffff', 4); Sound.say('Draw');
    }
  }

  phaseUpdate() {
    this.pt++;
    const [a, b] = this.f;
    switch (this.phase) {
      case 'intro':
        if (this.pt >= 110 || (this.pt > 20 && Input.confirm())) {
          for (const f of this.f) { f.state = 'idle'; f.t = 0; }
          this.phase = 'ready'; this.pt = 0;
        }
        break;
      case 'ready': {
        if (this.pt === 1) {
          const final = a.wins === Settings.rounds - 1 && b.wins === Settings.rounds - 1;
          const txt = final ? 'FINAL ROUND' : 'ROUND ' + this.round;
          this.announce(txt, 70, '#ffffff', final ? 3 : 4);
          Sound.play('gong');
          Sound.say(final ? 'Final round' : 'Round ' + this.round);
        }
        if (this.pt === 76) { this.announce('FIGHT!', 40, '#ff3030', 5); Sound.say('Fight!'); }
        if (this.pt >= 100) { this.phase = 'fight'; this.pt = 0; }
        break;
      }
      case 'fight':
        if (this.training) { this.trainingUpdate(); break; }
        if (this.timer > 0 && Settings.roundTime < 999) {
          if (++this.tf >= 60) { this.tf = 0; this.timer--; if (this.timer <= 10 && this.timer > 0) Sound.play('tick'); if (this.timer <= 0) this.timeUp(); }
        }
        break;
      case 'ko':
        if (this.pt > 120 && this.koVictim.state === 'koLie') this.endRound(this.koWinner);
        else if (this.pt > 400) this.endRound(this.koWinner);
        break;
      case 'timeup':
        if (this.pt >= 100) this.endRound(this.koWinner);
        break;
      case 'roundEnd':
        for (const f of this.f) {
          if (!f.actionable) continue;
          if (f === this.roundWinner) { f.state = 'win'; f.t = 0; }
          else if (f.hp > 0 && this.timeUpFlag) { f.state = 'lose'; f.t = 0; }
          else if (!this.roundWinner) { f.state = 'lose'; f.t = 0; }
        }
        if (this.pt >= 160) {
          const need = Settings.rounds;
          if (a.wins >= need && b.wins >= need) { a.wins = need - 1; b.wins = need - 1; }
          if (a.wins >= need || b.wins >= need) {
            this.phase = 'matchEnd'; this.pt = 0;
            this.matchWinner = a.wins >= need ? 0 : 1;
            const wf = this.f[this.matchWinner];
            this.announce(wf.def.name + ' WINS', 999, '#ffd040', 3);
            Sound.say(wf.def.name.toLowerCase() + ' wins');
            Sound.playSong('victory');
          } else {
            this.round++;
            this.startRound(false);
          }
        }
        break;
      case 'matchEnd':
        for (const f of this.f) {
          if (f.side === this.matchWinner && f.state !== 'win' && f.actionable) { f.state = 'win'; f.t = 0; }
        }
        if (!this.ended && (this.pt >= 170 || (this.pt > 50 && Input.confirm()))) {
          this.ended = true;
          this.cfg.onEnd({ winner: this.matchWinner, wins: [a.wins, b.wins] });
        }
        break;
    }
  }

  trainingUpdate() {
    for (const f of this.f) {
      const busy = f.state === 'hitstun' || f.state === 'airHit' || f.state === 'knockdown' || f.state === 'getup' || f.state === 'thrown' || f.state === 'blockstun';
      if (busy) f.idleT = 0; else f.idleT = (f.idleT || 0) + 1;
      if (f.idleT > 50 && f.hp < f.maxHp) { f.hp = f.maxHp; f.dispHp = f.maxHp; }
    }
  }

  // ---------- keuntungan frame (mode latihan) ----------
  startAdv(A, B) { this.adv = { A, B, a: -1, b: -1, n: 0 }; }
  trackAdvantage() {
    const s = this.adv;
    if (!s) return;
    s.n++;
    if (s.a < 0 && (s.A.actionable || s.A.state === 'jump')) s.a = s.n;
    if (s.b < 0 && (s.B.actionable || s.B.state === 'jump')) s.b = s.n;
    if (s.a >= 0 && s.b >= 0) {
      const v = s.b - s.a;
      this.advText = (v > 0 ? '+' : '') + v;
      this.adv = null;
    } else if (s.n > 180) this.adv = null;
  }

  // ---------- menu pause ----------
  pauseItems() {
    if (this.training) {
      const d = this.f[1].ctrl;
      const dm = { stand: 'BERDIRI', crouch: 'JONGKOK', jump: 'LOMPAT', block: 'BLOK SEMUA', cpu: 'CPU' }[d.mode];
      return ['LANJUTKAN', 'DUMMY: ' + dm, 'METER: ' + (this.meterFull ? 'PENUH' : 'NORMAL'), 'KOTAK HIT: ' + (this.showBoxes ? 'ON' : 'OFF'), 'DAFTAR JURUS', 'RESET POSISI', 'KELUAR KE MENU'];
    }
    return ['LANJUTKAN', 'DAFTAR JURUS', 'ULANG PERTANDINGAN', 'KELUAR KE MENU'];
  }

  updatePause() {
    if (this.subMenu) {
      if (Input.menuLeft() || Input.menuRight()) { this.subMenu.page = 1 - this.subMenu.page; Sound.play('cursor'); }
      if (Input.back() || Input.confirm() || Input.pause()) { this.subMenu = null; Sound.play('back'); }
      return;
    }
    const items = this.pauseItems();
    if (Input.menuUp()) { this.pauseSel = (this.pauseSel + items.length - 1) % items.length; Sound.play('cursor'); }
    if (Input.menuDown()) { this.pauseSel = (this.pauseSel + 1) % items.length; Sound.play('cursor'); }
    if (Input.wasPressed(['Escape']) || Input.back()) { this.paused = false; Sound.play('back'); return; }
    const lr = Input.menuLeft() ? -1 : Input.menuRight() ? 1 : 0;
    const label = items[this.pauseSel];
    if (this.training && lr && label.startsWith('DUMMY')) this.cycleDummy(lr);
    if (!Input.confirm() && !Input.wasPressed(['Enter'])) return;
    Sound.play('select');
    if (label === 'LANJUTKAN') this.paused = false;
    else if (label === 'DAFTAR JURUS') this.subMenu = { page: 0 };
    else if (label === 'ULANG PERTANDINGAN') this.cfg.onRestart();
    else if (label === 'KELUAR KE MENU') this.cfg.onQuit();
    else if (label.startsWith('DUMMY')) this.cycleDummy(1);
    else if (label.startsWith('METER')) this.meterFull = !this.meterFull;
    else if (label.startsWith('KOTAK')) this.showBoxes = !this.showBoxes;
    else if (label === 'RESET POSISI') { this.startRound(false); this.paused = false; }
  }

  cycleDummy(d) {
    const modes = ['stand', 'crouch', 'jump', 'block', 'cpu'];
    const c = this.f[1].ctrl;
    c.mode = modes[(modes.indexOf(c.mode) + d + modes.length) % modes.length];
    Sound.play('cursor');
  }

  // ---------- gambar ----------
  draw(ctx) {
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = Math.round(rand(-this.shakeA, this.shakeA)); sy = Math.round(rand(-this.shakeA, this.shakeA) * 0.6); }
    ctx.save();
    ctx.translate(sx, sy);
    const cam = Math.round(this.camX);
    this.stage.draw(ctx, cam, this.frame);
    if (this.freeze > 0) { ctx.fillStyle = 'rgba(0,0,8,0.65)'; ctx.fillRect(-8, -8, W + 16, H + 16); }
    for (const f of this.f) f.drawShadow(ctx, cam);
    const order = this.f[0].state === 'attack' || this.f[0].state === 'throwing' ? [1, 0] : [0, 1];
    for (const i of order) this.f[i].draw(ctx, cam, this.frame);
    for (const p of this.proj) drawProjectile(ctx, p, cam, this.frame);
    this.fx.draw(ctx, cam);
    this.stage.drawFront(ctx, cam);
    if (this.showBoxes) this.drawBoxes(ctx, cam);
    ctx.restore();
    if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 10})`; ctx.fillRect(0, 0, W, H); }
    this.drawHUD(ctx);
    if (this.cutin) this.drawCutin(ctx);
    if (this.paused) this.drawPause(ctx);
    else this.drawAnnounce(ctx);
  }

  drawBoxes(ctx, cam) {
    const box = (b, c) => {
      ctx.strokeStyle = c; ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(b.x - cam) + 0.5, Math.round(GROUND - b.y - b.h) + 0.5, Math.round(b.w), Math.round(b.h));
    };
    for (const f of this.f) {
      for (const b of f.hurtboxes()) box(b, '#40a0ff');
      const hb = f.activeHitbox(); if (hb) box(hb, '#ff3030');
    }
    for (const p of this.proj) box(this.projBox(p), '#ff8030');
  }

  drawHUD(ctx) {
    const bw = 150, bh = 8, y = 10;
    for (let i = 0; i < 2; i++) {
      const f = this.f[i];
      const x = i === 0 ? 10 : W - 10 - bw;
      rect(ctx, x - 2, y - 2, bw + 4, bh + 4, '#000000');
      rect(ctx, x - 1, y - 1, bw + 2, bh + 2, '#b8b090');
      rect(ctx, x, y, bw, bh, '#300808');
      const ratio = f.hp / f.maxHp, dr = f.dispHp / f.maxHp;
      const hw = Math.round(bw * ratio), dw = Math.round(bw * dr);
      const fx0 = i === 0 ? x + bw - hw : x, dx0 = i === 0 ? x + bw - dw : x;
      rect(ctx, dx0, y, dw, bh, '#e02020');
      const low = ratio <= 0.25;
      const col = low ? ((this.frame >> 3) % 2 ? '#ff5020' : '#ff9020') : '#f8d038';
      rect(ctx, fx0, y, hw, bh, col);
      rect(ctx, fx0, y, hw, 2, low ? '#ffc080' : '#fff4a8');
      rect(ctx, fx0, y + bh - 2, hw, 2, low ? '#b02010' : '#c89a18');
      // nama
      drawText(ctx, f.def.name, i === 0 ? x : x + bw, y + bh + 4, { align: i === 0 ? 'left' : 'right', color: '#ffffff', outline: '#000000' });
      if (f.rage) drawText(ctx, 'RAGE', i === 0 ? x + textWidth(f.def.name) + 8 : x + bw - textWidth(f.def.name) - 8, y + bh + 4, { align: i === 0 ? 'left' : 'right', color: (this.frame >> 2) % 2 ? '#ff3030' : '#ff9090', outline: '#000000' });
      // tanda kemenangan ronde
      if (!this.training) {
        for (let k = 0; k < Settings.rounds; k++) {
          const cx = i === 0 ? x + bw - 4 - k * 9 : x + 4 + k * 9;
          pxCircle(ctx, cx, y + bh + 8, 3, '#000000');
          pxCircle(ctx, cx, y + bh + 8, 2, f.wins > k ? '#ffd040' : '#3a3030');
        }
      }
      // meter super
      const mw = 96, mx = i === 0 ? 10 : W - 10 - mw, my = H - 11;
      rect(ctx, mx - 1, my - 1, mw + 2, 7, '#000000');
      rect(ctx, mx, my, mw, 5, '#101830');
      const mr = Math.round(mw * f.meter / 1000);
      const full = f.meter >= 1000;
      rect(ctx, i === 0 ? mx : mx + mw - mr, my, mr, 5, full ? ((this.frame >> 2) % 2 ? '#ffffff' : '#40e0ff') : '#3080ff');
      rect(ctx, i === 0 ? mx : mx + mw - mr, my, mr, 1, '#a0d0ff');
      const lbl = full ? 'SUPER!' : 'SUPER';
      drawText(ctx, lbl, i === 0 ? mx + mw + 4 : mx - 4, my - 1, { align: i === 0 ? 'left' : 'right', color: full ? '#40e0ff' : '#6080b0', outline: '#000000' });
      // combo
      const c = this.comboShow[i];
      if (c && c.hits >= 2) {
        const cx = i === 0 ? 12 : W - 12;
        drawText(ctx, c.hits + ' HITS', cx, 62, { align: i === 0 ? 'left' : 'right', color: '#ffe040', outline: '#401000', scale: 2 });
        drawText(ctx, c.dmg + ' DMG', cx, 80, { align: i === 0 ? 'left' : 'right', color: '#ffffff', outline: '#000000' });
      }
      const n = this.names[i];
      if (n) {
        const nx = i === 0 ? 12 : W - 12;
        drawText(ctx, n.text, nx, H - 24, { align: i === 0 ? 'left' : 'right', color: n.t > 60 ? '#ffffff' : '#ffb040', outline: '#300000' });
      }
    }
    // timer
    rect(ctx, W / 2 - 15, 4, 30, 20, '#000000');
    rect(ctx, W / 2 - 14, 5, 28, 18, '#1a1420');
    const tt = this.training || Settings.roundTime >= 999 ? '--' : String(Math.max(0, this.timer)).padStart(2, '0');
    drawText(ctx, tt, W / 2, 7, { align: 'center', scale: 2, color: this.timer <= 10 && !this.training ? '#ff4040' : '#ffe080', outline: '#000000' });
    // teks melayang
    for (const t of this.texts) {
      drawText(ctx, t.text, Math.round(t.x - this.camX), GROUND - t.y - t.t * 0.4, { align: 'center', color: t.color, outline: '#000000' });
    }
    if (this.training) this.drawTrainingHUD(ctx);
  }

  drawTrainingHUD(ctx) {
    const log = this.f[0].ctrl.log || [];
    const arrows = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '•', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
    rect(ctx, 6, 40, 58, 116, 'rgba(0,0,0,0.45)');
    for (let i = 0; i < Math.min(12, log.length); i++) {
      const e = log[i];
      const yy = 44 + i * 9;
      const btn = e.btns.map((b) => b.toUpperCase()).join('+');
      drawText(ctx, arrows[e.dir] || '•', 10, yy, { color: '#ffffff' });
      if (btn) drawText(ctx, btn, 20, yy, { color: '#ffd040' });
      drawText(ctx, String(Math.min(99, e.n)), 60, yy, { color: '#708090', align: 'right' });
    }
    drawText(ctx, 'LATIHAN', W / 2, 30, { align: 'center', color: '#80e0ff', outline: '#000000' });
    if (this.advText) drawText(ctx, 'FRAME ' + this.advText, W / 2, 40, { align: 'center', color: '#ffffff', outline: '#000000' });
    drawText(ctx, 'ESC: MENU', W - 8, 40, { align: 'right', color: '#a0a0b0', outline: '#000000' });
  }

  drawCutin(ctx) {
    const c = this.cutin;
    const k = clamp(c.t / 8, 0, 1);
    const y = 74, h = 38;
    rect(ctx, 0, y - 2, W, h + 4, '#000000');
    rect(ctx, 0, y, W, h, c.side === 0 ? '#5a0a10' : '#0a1a5a');
    for (let i = 0; i < 18; i++) {
      const lx = ((i * 53 + c.t * 14 * (c.side === 0 ? 1 : -1)) % (W + 40) + W + 40) % (W + 40) - 20;
      rect(ctx, lx, y + 3 + (i * 7) % (h - 6), 24, 1, c.side === 0 ? '#c02030' : '#3060d0');
    }
    const tx = c.side === 0 ? lerp(-200, W / 2 + 40, k) : lerp(W + 200, W / 2 - 40, k);
    drawText(ctx, c.name, tx, y + h / 2 - 7, { align: 'center', scale: 2, color: '#ffffff', outline: '#000000' });
    // potret (perbesar kepala dari renderer)
    const f = c.f, r = f.renderer, j = r.joints;
    if (j) {
      const px = c.side === 0 ? 30 : W - 30;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, y, W, h); ctx.clip();
      ctx.translate(px, y + h + 7);
      if (c.side === 1) ctx.scale(-1, 1);
      ctx.scale(2, 2);
      ctx.drawImage(r.canvas, -j.N[0], -j.N[1] - 6);
      ctx.restore();
    }
  }

  drawAnnounce(ctx) {
    const a = this.ann;
    if (!a) return;
    const pop = a.t < 6 ? 1 + (6 - a.t) * 0.15 : 1;
    const sc = Math.max(1, Math.round(a.scale * pop));
    drawText(ctx, a.text, W / 2, H / 2 - 30 - sc * 3, { align: 'center', scale: sc, color: a.color, outline: '#000000' });
  }

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    if (this.subMenu) { drawMoveListPanel(ctx, this.f[this.subMenu.page].cid, this.subMenu.page); return; }
    drawText(ctx, 'JEDA', W / 2, 40, { align: 'center', scale: 3, color: '#ffffff', outline: '#600000' });
    const items = this.pauseItems();
    items.forEach((it, i) => {
      const sel = i === this.pauseSel;
      drawText(ctx, (sel ? '> ' : '  ') + it, W / 2 - 70, 80 + i * 13, { color: sel ? '#ffd040' : '#c0c0c0', outline: '#000000' });
    });
    if (this.training) drawText(ctx, '← → UBAH DUMMY', W / 2, H - 20, { align: 'center', color: '#808090' });
  }
}

function drawMoveListPanel(ctx, cid, page) {
  const c = CHARACTERS[cid];
  rect(ctx, 20, 20, W - 40, H - 40, '#0c0a14');
  rect(ctx, 20, 20, W - 40, 2, '#c02030');
  rect(ctx, 20, H - 22, W - 40, 2, '#c02030');
  drawText(ctx, 'DAFTAR JURUS - ' + c.full, W / 2, 30, { align: 'center', color: '#ffd040', outline: '#000000' });
  const list = moveList(cid);
  list.forEach(([n, cmd], i) => {
    drawText(ctx, n, 34, 50 + i * 15, { color: '#ffffff' });
    drawText(ctx, cmd, W - 34, 50 + i * 15, { color: '#80d0ff', align: 'right' });
  });
  drawText(ctx, 'P = PUKULAN (LP/HP)  K = TENDANGAN (LK/HK)', W / 2, H - 46, { align: 'center', color: '#808090' });
  drawText(ctx, (page === 0 ? 'P1' : 'P2') + '   ← → GANTI   ESC: KEMBALI', W / 2, H - 34, { align: 'center', color: '#a0a0b0' });
}
