'use strict';
// ---------------------------------------------------------------------------
// AI lawan (CPU). Level 0 (mudah) s/d 5 (sangat sulit).
// AI "melihat" lawan dengan jeda reaksi, lalu mengisi antrian aksi.
// Aksi: { f: durasi, dx: 1 maju / -1 mundur, dy: 1 bawah / -1 atas, btn, motion }
// ---------------------------------------------------------------------------
class AIController extends Controller {
  constructor(level) {
    super();
    this.level = clamp(level, 0, 5);
    this.queue = [];
    this.plan = [];
    this.seen = [];
    this.cool = 0;
    this.ai = true;
  }

  poll(facing, me, world) {
    const r = { left: false, right: false, up: false, down: false, press: {}, hold: {} };
    if (!world || !me || world.phase !== 'fight') { this.queue = []; return this.build(r, facing); }
    const opp = world.opponent(me);
    this.seen.push({ state: opp.state, move: opp.move, mf: opp.mf, x: opp.x, y: opp.y, vy: opp.vy });
    const delay = [24, 18, 14, 10, 7, 5][this.level];
    while (this.seen.length > delay) this.seen.shift();
    const o = this.seen[0];

    if (!this.queue.length) this.think(me, opp, o, world);
    let forced = null;
    const act = this.queue[0];
    if (act) {
      const ax = (act.dx || 0) * facing;
      r.left = ax < 0; r.right = ax > 0;
      r.down = act.dy === 1; r.up = act.dy === -1;
      if (act.btn && !act.done) {
        for (const b of act.btn.split('+')) r.press[b] = true;
        act.done = true;
        if (act.motion) forced = new Set([act.motion]);
      }
      if (--act.f <= 0) this.queue.shift();
    }
    if (this.cool > 0) this.cool--;
    return this.build(r, facing, forced);
  }

  push(...acts) { for (const a of acts) this.queue.push(Object.assign({ f: 1 }, a)); }
  wait(n) { this.push({ f: n }); }

  step(name) {
    switch (name) {
      case 'lp': case 'hp': case 'lk': case 'hk': this.push({ btn: name }); break;
      case 'clk': this.push({ dy: 1, btn: 'lk' }); break;
      case 'clp': this.push({ dy: 1, btn: 'lp' }); break;
      case 'chk': this.push({ dy: 1, btn: 'hk' }); break;
      case 'dp': this.push({ dx: 1, dy: 1, btn: chance(0.6) ? 'hp' : 'lp', motion: 'dp' }); break;
      case 'qcf': this.push({ dx: 1, btn: chance(0.5) ? 'hp' : 'lp', motion: 'qcf' }); break;
      case 'qcb': this.push({ dx: -1, btn: chance(0.5) ? 'hk' : 'lk', motion: 'qcb' }); break;
      case 'super': this.push({ btn: 'lp+hp', motion: 'qcf2' }); break;
    }
  }

  fireball() { this.push({ dy: 1 }, { dx: 1, dy: 1 }); this.step('qcf'); this.wait(16); }
  dpNow() { this.push({ dy: 1 }); this.step('dp'); this.wait(8); }

  startCombo(me) {
    const L = this.level;
    const meterFull = me.meter >= 1000 || me.rage;
    const opener = chance(0.5) ? 'lp' : chance(0.5) ? 'clk' : 'lk';
    this.plan = [];
    if (L >= 1 && opener !== 'lk') this.plan.push(chance(0.5) ? 'hp' : 'lp');
    if (L >= 2) this.plan.push(meterFull && L >= 3 && chance(0.5) ? 'super' : choice(['dp', 'qcf', 'qcb']));
    this.step(opener);
  }

  think(me, opp, o, world) {
    const L = this.level;
    const dist = Math.abs(opp.x - me.x);
    const st = me.state;

    if (st === 'blockstun') { this.push({ dx: -1, dy: me.blockCrouch ? 1 : 0 }); return; }
    if (st === 'attack') {
      if (me.contact && this.plan.length && (opp.state === 'hitstun' || opp.state === 'blockstun' || opp.state === 'airHit')) {
        const nxt = this.plan.shift();
        if (opp.state === 'blockstun' && (nxt === 'dp' || nxt === 'super') && chance(0.7)) { this.plan = []; this.wait(1); return; }
        this.step(nxt);
      } else {
        if (!me.contact && me.mf > me.move.s + me.move.a) this.plan = [];
        this.wait(1);
      }
      return;
    }
    if (st === 'jump') {
      if (!me.airAttackUsed && dist < 75 && me.vy < 1.5 && chance(0.25 + L * 0.1)) this.push({ btn: chance(0.6) ? 'hk' : 'hp' });
      else this.wait(1);
      return;
    }
    if (!me.actionable) { this.wait(1); return; }

    const oppAtk = o.state === 'attack' && o.move && !o.move.throw;
    const oppAir = o.y > 12 && (o.state === 'jump' || (o.state === 'attack' && o.move && o.move.air));
    const meterFull = me.meter >= 1000 || me.rage;

    // anti udara
    if (oppAir && dist < 100) {
      if (chance(0.1 + L * 0.15)) { if (chance(0.6)) this.dpNow(); else this.push({ dy: 1, btn: 'hp' }, { f: 10, dy: 1 }); return; }
      if (chance(0.4)) { this.push({ f: 14, dx: -1 }); return; }
    }
    // bertahan
    if (oppAtk && dist < 95 && chance(0.2 + L * 0.14)) {
      const low = o.move.level === 'low';
      this.push({ f: 8 + randi(0, 8), dx: -1, dy: low || (chance(0.3) && o.move.level !== 'overhead') ? 1 : 0 });
      return;
    }
    // proyektil datang
    const pr = world.proj.find((p) => p.owner !== me && !p.dead && p.type !== 'beam' && p.type !== 'pillar' && Math.sign(p.vx) === Math.sign(me.x - p.x));
    if (pr && Math.abs(pr.x - me.x) < 130 && chance(0.15 + L * 0.1)) {
      if ((pr.type === 'laser' || pr.type === 'laserP') && chance(0.7)) this.push({ f: 22, dy: 1 });
      else if (chance(0.45)) this.push({ dy: -1, dx: 1 }, { f: 18 }, { btn: 'hk' });
      else this.push({ f: 20, dx: -1 });
      return;
    }
    // hukum serangan yang meleset
    if (o.state === 'attack' && o.move && o.mf > o.move.s + o.move.a && dist < 75 && chance(0.1 + L * 0.15)) {
      if (meterFull && chance(0.4)) this.step('super');
      else if (chance(0.5)) this.dpNow();
      else this.startCombo(me);
      return;
    }
    // lawan terjatuh: dekati
    if (opp.state === 'knockdown' || opp.state === 'getup') { this.push({ f: 10, dx: dist > 40 ? 1 : 0 }); return; }

    const r = Math.random();
    if (dist > 170) {
      if (r < 0.03 + L * 0.012 && this.cool <= 0) { this.fireball(); this.cool = 50; }
      else if (r < 0.06) { this.push({ dx: 1, dy: -1 }, { f: 18 }, { btn: 'hk' }); }
      else if (r < 0.08 && L >= 2) { this.push({ dx: 1 }, { f: 1 }, { f: 4, dx: 1 }); }
      else this.push({ f: randi(8, 20), dx: 1 });
    } else if (dist > 72) {
      if (r < 0.03 + L * 0.008 && this.cool <= 0) { this.fireball(); this.cool = 55; }
      else if (r < 0.075) this.push({ dx: 1, dy: -1 }, { f: 18 }, { btn: chance(0.5) ? 'hk' : 'hp' });
      else if (r < 0.09) { this.push({ dy: 1 }); this.step('qcb'); this.wait(10); }
      else if (r < 0.11) this.push({ f: 12, dx: -1 });
      else if (r < 0.125) this.push({ f: 10 });
      else this.push({ f: randi(6, 14), dx: 1 });
    } else {
      if (r < 0.1 + L * 0.03) this.startCombo(me);
      else if (r < 0.15) this.push({ dx: 1, btn: 'lp+lk' });
      else if (r < 0.2) this.push({ dy: 1, btn: 'lk' }, { f: 8, dy: 1 }, { dy: 1, btn: 'hk' }, { f: 10, dy: 1 });
      else if (r < 0.28) this.push({ f: 14, dx: -1, dy: chance(0.5) ? 1 : 0 });
      else if (r < 0.31 && meterFull) this.step('super');
      else if (r < 0.36) this.push({ f: 10, dx: -1 });
      else if (r < 0.40) this.push({ btn: 'hk' });
      else this.push({ f: randi(3, 8) });
    }
  }
}

// Dummy untuk mode latihan
class DummyController extends Controller {
  constructor() { super(); this.mode = 'stand'; this.ai = new AIController(3); }
  poll(facing, me, world) {
    if (this.mode === 'cpu') {
      const f = this.ai.poll(facing, me, world);
      this.hist = this.ai.hist;
      return f;
    }
    const r = { left: false, right: false, up: false, down: false, press: {}, hold: {} };
    if (this.mode === 'crouch') r.down = true;
    else if (this.mode === 'jump') r.up = true;
    else if (this.mode === 'block' && world) {
      const opp = world.opponent(me);
      if (world.threatTo(me) || opp.state === 'attack') {
        const back = opp.x > me.x ? 'left' : 'right';
        r[back] = true;
        const m = opp.move;
        if (m && m.level === 'low') r.down = true;
        else if (m && m.level !== 'overhead' && me.blockCrouch) r.down = true;
      }
    }
    return this.build(r, facing);
  }
}
