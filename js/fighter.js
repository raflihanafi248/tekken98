'use strict';
// ---------------------------------------------------------------------------
// Fighter: state machine petarung (gerak, lompat, serang, blok, kena, jatuh)
// Koordinat dunia: x = horizontal arena, y = tinggi dari lantai (ke atas)
// ---------------------------------------------------------------------------
const NEUTRAL = new Set(['idle', 'walkF', 'walkB', 'crouch', 'guard', 'crouchGuard']);
const EMPTY_INPUT = {
  x: 0, y: 0, up: false, down: false, fwd: false, back: false,
  press: {}, hold: {}, anyPress: false, motions: new Set(), dash: 0, lphp: false, lplk: false, numpad: 5,
};

class Fighter {
  constructor(cid, palIdx, side, ctrl) {
    this.cid = cid;
    this.def = CHARACTERS[cid];
    this.pal = this.def.palettes[palIdx % this.def.palettes.length];
    this.side = side;
    this.ctrl = ctrl;
    this.renderer = new FigureRenderer();
    this.maxHp = this.def.hp;
    this.meter = 0;
    this.wins = 0;
    this.inp = EMPTY_INPUT;
    this.resetRound(side === 0 ? STAGE_W / 2 - 70 : STAGE_W / 2 + 70);
  }

  resetRound(x) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0; this.pushX = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = this.maxHp; this.dispHp = this.maxHp;
    this.state = 'idle'; this.t = 0;
    this.move = null; this.moveId = null; this.mf = 0;
    this.stun = 0; this.combo = 0; this.comboDmg = 0; this.juggle = 0;
    this.rot = 0; this.spin = 0; this.flash = 0; this.inv = 0;
    this.rageUsed = false; this.buffer = null; this.airAttackUsed = false;
    this.jumpDir = 0; this.hitAnim = 'hitHigh'; this.ko = false;
    this.contact = false; this.hitCount = 0; this.lastHit = -99;
    this.landLag = 0; this.blockCrouch = false; this.throwVictim = null;
  }

  get rage() { return !this.rageUsed && this.hp > 0 && this.hp <= this.maxHp * 0.25; }
  get actionable() { return NEUTRAL.has(this.state); }

  isCrouching() {
    const s = this.state;
    if (s === 'crouch' || s === 'crouchGuard' || s === 'getup') return true;
    if (s === 'blockstun') return this.blockCrouch;
    if (s === 'attack') return !!this.move.crouch || (this.cid === 'kazuya' && (this.moveId === 'qcb_l' || this.moveId === 'qcb_h'));
    if (s === 'hitstun') return this.hitAnim === 'hitCrouch';
    return false;
  }

  faceOpp(opp) {
    if (opp.x > this.x + 1) this.facing = 1;
    else if (opp.x < this.x - 1) this.facing = -1;
  }

  // dipanggil tiap frame (termasuk saat hitstop) untuk membaca input
  poll(world, frozen, control) {
    let inp = this.ctrl.poll(this.facing, this, world);
    if (!control) { inp = EMPTY_INPUT; this.buffer = null; }
    this.inp = inp;
    if (inp.anyPress) this.buffer = { inp, age: 0 };
    else if (this.buffer && !frozen && ++this.buffer.age > 6) this.buffer = null;
  }

  update(world) {
    const opp = world.opponent(this);
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.inv > 0) this.inv--;
    switch (this.state) {
      case 'intro': case 'win': case 'lose': this.vx = 0; break;
      case 'idle': case 'walkF': case 'walkB': case 'crouch': case 'guard': case 'crouchGuard':
        this.neutral(world, opp); break;
      case 'jumpSquat':
        this.faceOpp(opp);
        if (this.t >= 4) {
          this.state = 'jump'; this.t = 0; this.vy = 6.4;
          this.vx = this.jumpDir * this.def.jumpVx * this.facing;
          this.airAttackUsed = false; this.y = 0.01;
          Sound.play('jump');
        }
        break;
      case 'jump':
        if (this.buffer && !this.airAttackUsed) {
          const id = this.pickMove(this.buffer.inp, true);
          if (id) { this.buffer = null; this.startMove(id, world); }
        }
        break;
      case 'land':
        this.vx = 0;
        if (this.t >= this.landLag) this.toNeutral(world);
        break;
      case 'dash':
        if (this.dashDir > 0) {
          this.vx = this.facing * (this.t < 11 ? 3.6 : 1.2);
          if (this.t >= 16) this.toNeutral(world);
        } else {
          this.vx = -this.facing * (this.t < 11 ? 3.2 : 1.0);
          if (this.t >= 18) this.toNeutral(world);
        }
        break;
      case 'attack': this.updateAttack(world, opp); break;
      case 'hitstun': case 'blockstun':
        this.vx *= 0.8;
        if (--this.stun <= 0) this.toNeutral(world);
        break;
      case 'airHit': this.rot += this.spin; break;
      case 'knockdown':
        this.vx *= 0.8;
        if (this.t >= 34) { this.state = 'getup'; this.t = 0; }
        break;
      case 'getup':
        this.vx = 0;
        if (this.t >= 24) this.toNeutral(world);
        break;
      case 'koLie': this.vx *= 0.85; break;
      case 'fall': break;
      case 'throwing': this.updateThrowing(world); break;
      case 'thrown': break;
    }
    this.physics(world);
  }

  neutral(world, opp) {
    this.faceOpp(opp);
    const inp = this.inp;
    if (this.buffer) {
      const id = this.pickMove(this.buffer.inp, false);
      if (id && this.startMove(id, world)) { this.buffer = null; return; }
    }
    if (inp.up) {
      this.state = 'jumpSquat'; this.t = 0; this.vx = 0;
      this.jumpDir = inp.fwd ? 1 : inp.back ? -1 : 0;
      return;
    }
    if (inp.dash && !inp.down) {
      this.state = 'dash'; this.t = 0; this.dashDir = inp.dash;
      if (inp.dash < 0) this.inv = 7;
      return;
    }
    const threat = world.threatTo(this);
    if (inp.down) { this.setState(inp.back && threat ? 'crouchGuard' : 'crouch'); this.vx = 0; return; }
    if (inp.fwd) { this.setState('walkF'); this.vx = this.def.walkF * this.facing; }
    else if (inp.back) {
      if (threat) { this.setState('guard'); this.vx = 0; }
      else { this.setState('walkB'); this.vx = -this.def.walkB * this.facing; }
    } else { this.setState('idle'); this.vx = 0; }
  }

  setState(s) { if (this.state !== s) { this.state = s; this.t = 0; } }

  toNeutral() {
    this.state = this.inp.down ? 'crouch' : 'idle';
    this.t = 0; this.move = null; this.moveId = null; this.vx = 0;
    this.combo = 0; this.juggle = 0; this.rot = 0;
  }

  canSuper() { return this.meter >= 1000 || this.rage; }

  pickMove(inp, air) {
    const p = inp.press, m = inp.motions;
    const P = p.lp || p.hp, K = p.lk || p.hk;
    if (air) {
      if (p.hp) return 'jhp'; if (p.hk) return 'jhk';
      if (p.lp) return 'jlp'; if (p.lk) return 'jlk';
      return null;
    }
    if (P && (m.has('qcf2') || inp.lphp) && this.canSuper()) return 'super';
    if (inp.lplk) return 'throw';
    if (P && m.has('dp')) return p.hp ? 'dp_h' : 'dp_l';
    if (P && m.has('qcf')) return p.hp ? 'qcf_h' : 'qcf_l';
    if (K && m.has('qcb')) return p.hk ? 'qcb_h' : 'qcb_l';
    const c = inp.down ? 'c' : '';
    if (p.hp) return c + 'hp'; if (p.hk) return c + 'hk';
    if (p.lp) return c + 'lp'; if (p.lk) return c + 'lk';
    return null;
  }

  startMove(id, world) {
    const m = this.def.moves[id];
    if (!m) return false;
    if (id === 'super') {
      if (this.meter >= 1000) this.meter -= 1000;
      else if (this.rage) { this.rageUsed = true; world.popText(this, 'RAGE ART!', '#ff3030'); }
      else return false;
      world.superFlash(this, m);
    }
    this.move = m; this.moveId = id; this.mf = 0; this.state = 'attack'; this.t = 0;
    this.contact = false; this.hitCount = 0; this.lastHit = -99;
    if (m.air) this.airAttackUsed = true; else this.vx = 0;
    if (m.special) { this.meter = Math.min(1000, this.meter + 20); world.moveName(this, m.name); }
    if (m.sfx === 'L') Sound.play('whiffL');
    else if (m.sfx === 'H') Sound.play('whiffH');
    else if (m.sfx && !m.proj) Sound.play(m.sfx);
    return true;
  }

  canCancelNow() {
    const m = this.move;
    return this.contact && this.mf <= m.s + m.a + 8;
  }

  cancelAllowed(id) {
    const m = this.move, nm = this.def.moves[id];
    if (!nm || !!nm.air !== !!m.air) return false;
    if (id === 'super') return !!m.cancel && this.canSuper();
    if (nm.special) return m.cancel === 'chain' || m.cancel === 'special';
    if (m.cancel === 'chain') return !nm.throw && !nm.special && !nm.super;
    return false;
  }

  updateAttack(world) {
    const m = this.move;
    this.mf++;
    // cancel ke jurus lain (combo) atau kara-cancel 2 tombol
    if (this.buffer) {
      const id = this.pickMove(this.buffer.inp, !!m.air);
      if (id && id !== this.moveId) {
        const kara = this.mf <= 3 && (id === 'super' || id === 'throw') && !m.special && !m.super;
        if (kara || (this.canCancelNow() && this.cancelAllowed(id))) {
          this.buffer = null;
          if (this.startMove(id, world)) return;
        }
      }
    }
    // gerakan jurus
    let moving = false;
    if (m.moves) {
      for (const seg of m.moves) {
        if (this.mf >= seg[0] && this.mf <= seg[1]) {
          if (!(m.rush && this.contact)) { this.vx = seg[2] * this.facing; moving = true; }
          if (seg[3] !== undefined && this.mf === seg[0]) { this.vy = seg[3]; this.y = Math.max(this.y, 0.01); }
        }
      }
    }
    if (m.rush && this.contact) this.vx = 0;
    else if (!moving && this.y <= 0 && !m.air) this.vx *= 0.6;
    // proyektil & efek
    if (m.proj && this.mf === m.proj.frame) {
      world.spawnProjectile(this, m.proj);
      if (m.sfx) Sound.play(m.sfx);
      if (m.proj.type === 'beam') Sound.play('beam');
    }
    if (m.pillars) {
      const i = m.pillars.frames.indexOf(this.mf);
      if (i >= 0) world.spawnPillar(this, i, m.pillars);
    }
    if (m.fx && this.mf > m.s - 2 && this.mf <= m.s + m.a) world.fx.trail(this, m.fx);
    // selesai
    if (this.mf >= m.total) {
      if (m.air) { if (this.y > 0) { this.state = 'jump'; this.t = 0; } else this.toNeutral(); }
      else if (this.y > 0) { this.state = 'fall'; this.t = 0; this.fallLag = m.landLag || 6; this.move = null; }
      else this.toNeutral();
    }
  }

  updateThrowing(world) {
    const B = this.throwVictim, f = this.facing, back = this.throwBack;
    this.vx = 0;
    const t = this.t;
    if (!B) { this.toNeutral(); return; }
    if (t <= 22) {
      const k = t / 22;
      if (!back) {
        B.x = this.x + f * (20 + k * 10);
        B.y = Math.sin(k * Math.PI) * 30;
        B.rot = -k * 160;
      } else {
        const ang = k * Math.PI;
        B.x = this.x + f * Math.cos(ang) * 26;
        B.y = Math.sin(ang) * 38;
        B.rot = -k * 220;
      }
      B.facing = back ? (k < 0.5 ? -f : f) : -f;
    }
    if (t === 22) {
      const dir = back ? -f : f;
      const h = { dmg: this.def.moves.throw.dmg, hitstun: 0, push: 0, launch: { vx: 3.2, vy: 3.5, spin: 8 }, dir, level: 'mid', throw: true };
      B.state = 'idle';
      const res = B.takeHit(h, this, world);
      world.fx.hit(B.x, B.y + 30, 18, 'normal');
      Sound.play('hitH'); Sound.play('thud');
      world.shake(5);
      world.hitstop = 8;
      world.comboShow[this.side] = { hits: 1, dmg: res.dmg, t: 80 };
      if (res.ko) world.onKO(B, this);
    }
    if (t >= 36) { this.throwVictim = null; this.toNeutral(); }
  }

  physics(world) {
    if (this.state === 'thrown' || this.state === 'throwing') { this.x += this.pushX; this.pushX *= 0.8; return; }
    if (this.y > 0 || this.vy > 0) {
      this.vy -= this.state === 'airHit' ? 0.3 : GRAVITY;
      this.y += this.vy;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.onLand(world); }
    }
    this.x += this.vx + this.pushX;
    this.pushX *= 0.78;
    if (Math.abs(this.pushX) < 0.05) this.pushX = 0;
  }

  onLand(world) {
    switch (this.state) {
      case 'jump':
        this.state = 'land'; this.t = 0; this.landLag = 3; this.vx = 0;
        Sound.play('land'); world.fx.dust(this.x, false);
        break;
      case 'attack':
        if (this.move.air) { this.state = 'land'; this.t = 0; this.landLag = 4; this.vx = 0; this.move = null; Sound.play('land'); }
        else {
          this.vx = 0;
          if (this.mf > this.move.s + this.move.a) {
            this.state = 'land'; this.t = 0; this.landLag = this.move.landLag || 6; this.move = null;
          }
          world.fx.dust(this.x, false);
        }
        break;
      case 'fall':
        this.state = 'land'; this.t = 0; this.landLag = this.fallLag || 8; this.vx = 0;
        world.fx.dust(this.x, false);
        break;
      case 'airHit':
        this.state = this.hp <= 0 ? 'koLie' : 'knockdown'; this.t = 0;
        this.rot = 0; this.vx *= 0.3;
        Sound.play('thud'); world.fx.dust(this.x, true); world.shake(3);
        break;
      default: this.vx = 0;
    }
  }

  // ---- kotak tabrakan ----
  worldBox(b) {
    const x = this.facing > 0 ? this.x + b.x : this.x - b.x - b.w;
    return { x, y: this.y + b.y, w: b.w, h: b.h };
  }

  hurtboxes() {
    const s = this.state;
    if (this.inv > 0) return [];
    if (s === 'knockdown' || s === 'getup' || s === 'koLie' || s === 'thrown' || s === 'intro' || s === 'throwing') return [];
    const m = this.move;
    if (s === 'attack' && m.inv && this.mf >= m.inv[0] && this.mf <= m.inv[1]) return [];
    const x = this.x, y = this.y;
    let boxes;
    if (s === 'airHit') boxes = [{ x: x - 16, y, w: 32, h: 30 }];
    else if (y > 0 || s === 'jump') boxes = [{ x: x - 12, y: y + 4, w: 24, h: 52 }];
    else if (this.isCrouching()) boxes = [{ x: x - 15, y, w: 30, h: 46 }];
    else boxes = [{ x: x - 13, y, w: 26, h: 68 }];
    if (s === 'attack' && m.box && this.mf > m.s && this.mf <= m.s + m.a + Math.floor(m.r * 0.5)) {
      const hb = this.worldBox(m.box);
      boxes.push({ x: hb.x + 3, y: hb.y + 2, w: Math.max(2, hb.w - 6), h: Math.max(2, hb.h - 4) });
    }
    return boxes;
  }

  activeHitbox() {
    if (this.state !== 'attack' || !this.move.box) return null;
    const m = this.move;
    if (this.mf <= m.s || this.mf > m.s + m.a) return null;
    if (m.hits) { if (this.hitCount >= m.hits || this.mf - this.lastHit < m.every) return null; }
    else if (this.contact) return null;
    return this.worldBox(m.box);
  }

  pushWidth() {
    if (this.state === 'knockdown' || this.state === 'koLie' || this.state === 'getup') return 8;
    return this.y > 0 ? 10 : 12;
  }

  // ---- menerima serangan ----
  canBlock(fromX, level) {
    const s = this.state;
    if (!(NEUTRAL.has(s) || s === 'blockstun')) return false;
    if (this.y > 0) return false;
    const away = fromX > this.x ? -1 : 1;
    if (this.inp.x !== away) return false;
    const crouching = this.inp.y === 1;
    if (level === 'low' && !crouching) return false;
    if (level === 'overhead' && crouching) return false;
    return true;
  }

  block(h, A, world) {
    const dirAway = h.dir || (A.x < this.x ? 1 : -1);
    this.state = 'blockstun'; this.t = 0; this.stun = h.blockstun;
    this.blockCrouch = this.inp.y === 1;
    this.vx = 0; this.pushX = h.push * 1.4 * dirAway;
    this.move = null;
    this.meter = Math.min(1000, this.meter + 6 + h.dmg * 0.15);
    A.meter = Math.min(1000, A.meter + h.dmg * 0.25);
    if (h.chip) {
      const c = Math.max(1, Math.round(h.chip * A.def.dmg));
      this.hp = Math.max(world.training ? 1 : 0, this.hp - c);
      if (this.hp <= 0) return this.takeHit(Object.assign({}, h, { dmg: 0 }), A, world);
    }
    return { blocked: true };
  }

  takeHit(h, A, world) {
    const wasCrouch = this.isCrouching();
    const counter = this.state === 'attack' && this.move && this.mf <= this.move.s + this.move.a && !h.proj && !h.throw;
    const juggling = this.state === 'airHit';
    const inCombo = this.state === 'hitstun' || juggling;
    if (inCombo) this.combo++;
    else { this.combo = 1; this.comboDmg = 0; this.juggle = 0; }
    const scale = this.combo <= 2 ? 1 : Math.max(0.3, 1 - (this.combo - 2) * 0.12);
    let dmg = h.dmg * A.def.dmg * (A.rage ? 1.12 : 1) * (counter ? 1.2 : 1) * scale;
    dmg = h.dmg > 0 ? Math.max(1, Math.round(dmg)) : 0;
    this.hp = Math.max(0, this.hp - dmg);
    if (world.training && this.hp <= 0) this.hp = 1;
    this.comboDmg += dmg;
    if (!h.super) A.meter = Math.min(1000, A.meter + dmg * 0.7 + 8);
    this.meter = Math.min(1000, this.meter + dmg * 0.45);
    this.flash = 6;
    this.move = null; this.moveId = null;
    let dirAway = h.dir || (A.x < this.x ? 1 : A.x > this.x ? -1 : A.facing);
    if (this.hp <= 0) {
      this.ko = true; this.state = 'airHit'; this.t = 0;
      this.vx = 2.8 * dirAway; this.vy = 6; this.y = Math.max(this.y, 1);
      this.spin = -8; this.rot = 0; this.facing = -dirAway;
      return { dmg, counter, ko: true };
    }
    const air = this.y > 0 || juggling;
    if (h.launch || h.sweep || air) {
      const L = h.launch || (h.sweep ? { vx: 0.6, vy: 2.8, spin: 0 } : { vx: 2.2, vy: 3.6, spin: 6 });
      this.state = 'airHit'; this.t = 0; this.juggle++;
      this.vx = L.vx * dirAway;
      this.vy = L.vy * (this.juggle > 3 ? 0.6 : 1);
      this.y = Math.max(this.y, 1);
      this.spin = -(L.spin || 0);
      if (!juggling) this.rot = 0;
      this.facing = -dirAway;
    } else {
      this.state = 'hitstun'; this.t = 0;
      this.stun = h.hitstun + (counter ? 5 : 0);
      this.hitStunTotal = this.stun;
      this.hitAnim = wasCrouch ? 'hitCrouch' : (h.level === 'low' || (h.box && h.box.y < 30)) ? 'hitLow' : 'hitHigh';
      this.vx = 0; this.pushX = h.push * 1.4 * dirAway;
    }
    return { dmg, counter };
  }

  // ---- tampilan ----
  currentPose() {
    const d = this.def, t = this.t;
    switch (this.state) {
      case 'idle': return animPose(d, ANIMS.idle.keys, t, true);
      case 'walkF': return animPose(d, ANIMS.walk.keys, t, true);
      case 'walkB': return animPose(d, ANIMS.walkBack.keys, t, true);
      case 'crouch': return t < 4 ? lerpPose(getPose(d, 'idle1'), getPose(d, 'crouch'), t / 4) : getPose(d, 'crouch');
      case 'guard': return getPose(d, 'block');
      case 'crouchGuard': return getPose(d, 'crouchBlock');
      case 'blockstun': return getPose(d, this.blockCrouch ? 'crouchBlock' : 'block');
      case 'jumpSquat': case 'land': return getPose(d, 'jumpSquat');
      case 'jump': case 'fall': {
        const k = clamp((6.4 - this.vy) / 12.8, 0, 1);
        const p = k < 0.45 ? lerpPose(getPose(d, 'jumpUp'), getPose(d, 'jumpTuck'), k / 0.45)
          : lerpPose(getPose(d, 'jumpTuck'), getPose(d, 'jumpFall'), (k - 0.45) / 0.55);
        if (this.state === 'jump' && this.jumpDir !== 0) {
          return withRot(p, this.jumpDir * 360 * clamp((k - 0.12) / 0.7, 0, 1));
        }
        return p;
      }
      case 'dash': return getPose(d, this.dashDir > 0 ? 'dash' : 'backdash');
      case 'attack': return animPose(d, this.move.anim, Math.max(0, this.mf - 1), false);
      case 'hitstun': {
        const p = getPose(d, this.hitAnim);
        if (this.stun < 6) return lerpPose(p, getPose(d, this.hitAnim === 'hitCrouch' ? 'crouch' : 'idle1'), 1 - this.stun / 6);
        return p;
      }
      case 'airHit': case 'thrown': return withRot(getPose(d, 'airHit'), this.rot);
      case 'knockdown': case 'koLie': return getPose(d, 'lie');
      case 'getup': return animPose(d, ANIMS.getup.keys, t, false);
      case 'throwing':
        return t < 10 ? getPose(d, 'throwGrab') : lerpPose(getPose(d, 'throwGrab'), getPose(d, 'throwToss'), clamp((t - 10) / 10, 0, 1));
      case 'intro': return animPose(d, d.intro, t, false);
      case 'win': return animPose(d, d.win, t, false);
      case 'lose': return animPose(d, ANIMS.lose.keys, t, false);
    }
    return getPose(d, 'idle1');
  }

  // titik sendi (koordinat dunia) — untuk efek di kepalan tangan, dll
  jointWorld(name) {
    const j = this.renderer.joints;
    if (!j || !j[name]) return { x: this.x, y: this.y + 40 };
    const r = this.renderer;
    return { x: this.x + this.facing * (j[name][0] - r.ox), y: this.y + (r.oy - j[name][1]) };
  }

  draw(ctx, camX, frame) {
    const pose = this.currentPose();
    let outline = OUTLINE_COL;
    if (this.rage && (frame >> 3) % 2 === 0) outline = '#a0101c';
    const cv = this.renderer.render(this.def, this.pal, pose, {
      flash: this.flash > 0 && this.flash % 3 !== 0, outline, time: frame,
    });
    const sx = Math.round(this.x - camX), sy = Math.round(GROUND - this.y);
    ctx.save();
    ctx.translate(sx, sy);
    if (this.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(cv, -this.renderer.ox, -this.renderer.oy);
    ctx.restore();
  }

  drawShadow(ctx, camX) {
    const s = clamp(1 - this.y / 140, 0.35, 1);
    const cx = Math.round(this.x - camX), w = Math.round(17 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(cx - w, GROUND, w * 2, 2);
    ctx.fillRect(cx - w + 3, GROUND - 1, w * 2 - 6, 1);
    ctx.fillRect(cx - w + 3, GROUND + 2, w * 2 - 6, 1);
  }
}
