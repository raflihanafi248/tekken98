'use strict';
// ---------------------------------------------------------------------------
// Data karakter: tubuh, palet warna, sprite kepala, jurus & frame data.
// Fan game tidak resmi — karakter terinspirasi seri Tekken (Bandai Namco).
// ---------------------------------------------------------------------------

// ----- Sprite kepala (menghadap kanan). ax/ay = titik leher -----
// h rambut, H rambut gelap, s kulit, S kulit gelap, e mata, r mata merah,
// w putih/abu (kumis), m mulut, c tanduk, b alis, x bekas luka
const HEADS = {
  jin: { ax: 5, ay: 14, rows: [
    '...h..h.h....',
    '..hhhhhhhh...',
    '.hhhhhhhhhh..',
    'hhhhhhhhhhhhh',
    '.hhhhhhhhhhh.',
    '.hhhhhhhshhhh',
    '.hhhhhsssshs.',
    '..hhhSssbbbs.',
    '..hhSssssess.',
    '...hSsssssss.',
    '...SSssssssss',
    '....SSsssms..',
    '....SSSsss...',
    '.....SSss....',
    '.....Sss.....',
  ] },
  kazuya: { ax: 5, ay: 14, rows: [
    '.h..h........',
    'hhh.hh.h.....',
    '.hhhhhhhh....',
    'hhhhhhhhhhh..',
    '.hhhhhhhhhhh.',
    'hhhhhhhhssss.',
    '.hhhhSsssssss',
    '..hhSssbbbss.',
    '..hhSxssrsSs.',
    '...hSsxsssss.',
    '...SSssssssss',
    '....SSsssms..',
    '....SSSsss...',
    '.....SSss....',
    '.....Sss.....',
  ] },
  heihachi: { ax: 6, ay: 15, rows: [
    'h...........h.',
    'hh........hh..',
    '.hhh....hhh...',
    '.hhhhhhhhh....',
    '..hhhhhhhhh...',
    '..hhhhhssss...',
    '..hhhSsssss...',
    '..hhSsswwws...',
    '..hhSsssses...',
    '...hSssssssss.',
    '...SSssswwwww.',
    '....SSswwwwm..',
    '....SSSswss...',
    '.....SSss.....',
    '.....SSss.....',
    '......Ss......',
  ] },
  devil: { ax: 5, ay: 16, rows: [
    '......c......',
    '.....cc......',
    '...h.cch.....',
    '..hhhhhhhh...',
    '.hhhhhhhhhh..',
    'hhhhhhhhhhhhh',
    '.hhhhhhhhhhh.',
    '.hhhhhhhshhhh',
    '.hhhhhssrshs.',
    '..hhhSssbbbs.',
    '..hhSssssrss.',
    '...hSsssssss.',
    '...SSssssssss',
    '....SSsssms..',
    '....SSSsss...',
    '.....SSss....',
    '.....Sss.....',
  ] },
};

// ----- Normal (dipakai semua karakter) -----
const NORMALS = {
  lp:  { name: 'JAB', s: 4, a: 3, r: 7, dmg: 30, box: { x: 10, y: 44, w: 26, h: 12 }, hitstun: 13, blockstun: 9, push: 2.6, hitstop: 6, cancel: 'chain', sfx: 'L',
         anim: [['lp0', 3], ['lp1', 5], ['idle1', 0]] },
  hp:  { name: 'STRAIGHT', s: 7, a: 4, r: 14, dmg: 75, box: { x: 12, y: 42, w: 30, h: 13 }, hitstun: 19, blockstun: 14, push: 4, hitstop: 10, cancel: 'special', sfx: 'H',
         anim: [['hp0', 6], ['hp1', 6], ['hp1', 2], ['idle1', 0]] },
  lk:  { name: 'FRONT KICK', s: 6, a: 4, r: 10, dmg: 45, box: { x: 12, y: 22, w: 28, h: 14 }, hitstun: 15, blockstun: 11, push: 3, hitstop: 7, cancel: 'special', sfx: 'L',
         anim: [['lk0', 5], ['lk1', 5], ['lk1', 2], ['idle1', 0]] },
  hk:  { name: 'HIGH KICK', s: 9, a: 4, r: 17, dmg: 85, box: { x: 14, y: 38, w: 28, h: 18 }, hitstun: 20, blockstun: 14, push: 4.5, hitstop: 11, sfx: 'H',
         anim: [['hk0', 8], ['hk1', 5], ['hk1', 4], ['idle1', 0]] },
  clp: { name: 'C. JAB', crouch: true, s: 4, a: 3, r: 7, dmg: 25, box: { x: 10, y: 26, w: 26, h: 10 }, hitstun: 12, blockstun: 8, push: 2.4, hitstop: 6, cancel: 'chain', sfx: 'L',
         anim: [['clp0', 3], ['clp1', 5], ['crouch', 0]] },
  chp: { name: 'UPPERCUT', crouch: true, s: 6, a: 6, r: 18, dmg: 70, box: { x: 4, y: 36, w: 24, h: 42 }, hitstun: 19, blockstun: 13, push: 3.5, hitstop: 10, cancel: 'special', sfx: 'H',
         anim: [['chp0', 5], ['chp1', 7], ['chp1', 4], ['crouch', 0]] },
  clk: { name: 'LOW KICK', crouch: true, s: 5, a: 3, r: 9, dmg: 25, box: { x: 12, y: 0, w: 30, h: 10 }, level: 'low', hitstun: 12, blockstun: 8, push: 2.5, hitstop: 6, cancel: 'chain', sfx: 'L',
         anim: [['clk0', 4], ['clk1', 5], ['crouch', 0]] },
  chk: { name: 'SAPUAN', crouch: true, s: 8, a: 4, r: 22, dmg: 70, box: { x: 14, y: 0, w: 34, h: 10 }, level: 'low', hitstun: 20, blockstun: 13, push: 3, hitstop: 9, sweep: true, sfx: 'H',
         anim: [['chk0', 7], ['chk1', 5], ['chk1', 6], ['crouch', 0]] },
  jlp: { name: 'J. PUNCH', air: true, s: 4, a: 9, r: 4, dmg: 40, box: { x: 6, y: 14, w: 22, h: 18 }, level: 'overhead', hitstun: 14, blockstun: 10, push: 2, hitstop: 6, sfx: 'L',
         anim: [['jumpTuck', 3], ['jlp', 0]] },
  jhp: { name: 'J. HEAVY PUNCH', air: true, s: 7, a: 6, r: 6, dmg: 70, box: { x: 8, y: 8, w: 24, h: 18 }, level: 'overhead', hitstun: 18, blockstun: 12, push: 2.5, hitstop: 9, sfx: 'H',
         anim: [['jumpTuck', 6], ['jhp', 0]] },
  jlk: { name: 'J. KICK', air: true, s: 4, a: 10, r: 4, dmg: 45, box: { x: 6, y: 2, w: 24, h: 16 }, level: 'overhead', hitstun: 15, blockstun: 10, push: 2, hitstop: 6, sfx: 'L',
         anim: [['jumpTuck', 3], ['jlk', 0]] },
  jhk: { name: 'J. HEAVY KICK', air: true, s: 7, a: 6, r: 6, dmg: 80, box: { x: 10, y: 8, w: 28, h: 14 }, level: 'overhead', hitstun: 18, blockstun: 12, push: 2.5, hitstop: 10, sfx: 'H',
         anim: [['jumpTuck', 6], ['jhk', 0]] },
  throw: { name: 'LEMPARAN', throw: true, s: 3, a: 3, r: 22, dmg: 120, range: 34,
         anim: [['throwGrab', 6], ['idle1', 0]] },
};

function spinAnim(n) {
  const k = [['jumpSquat', 8]];
  for (let i = 0; i < n; i++) k.push([i % 2 ? 'spin2' : 'spin1', 3]);
  k.push(['idle1', 0]);
  return k;
}
function flurryAnim() {
  const k = [['superPose', 8], ['rush', 14]];
  for (let i = 0; i < 6; i++) k.push([i % 2 ? 'flurry2' : 'flurry1', 4]);
  k.push(['chp1', 8], ['chp1', 6], ['idle1', 0]);
  return k;
}

// ----- Jurus spesial per karakter -----
const SPECIALS = {
  jin: {
    qcf: (h) => ({ name: 'DEVIL FLAME', special: true, s: 13, a: 1, r: 32, cancel: 'super', sfx: 'fireball',
      anim: [['fbWind', 10], ['fbPush', 4], ['fbPush', 18], ['idle1', 0]],
      proj: { frame: 13, type: 'flame', vx: h ? 4.6 : 3.1, x: 22, y: 34, w: 20, h: 16, dmg: 65, chip: 14, hitstun: 22, blockstun: 17, push: 3.5, hitstop: 9 } }),
    dp: (h) => ({ name: 'RISING FLAME', special: true, s: 4, a: 12, r: 24, inv: [1, h ? 9 : 6], dmg: h ? 62 : 48, hits: 2, every: 6,
      box: { x: 6, y: 26, w: 22, h: 50 }, launch: { vx: 1.5, vy: 6.5, spin: 9 }, hitstun: 24, blockstun: 18, push: 3, hitstop: 10,
      moves: [[3, 3, 1.6, h ? 6.2 : 5.2]], landLag: 9, fx: 'flame', sfx: 'rise', cancel: 'super',
      anim: [['dpCrouch', 3], ['dpRise', 10], ['dpRise', 10], ['jumpFall', 0]] }),
    qcb: (h) => ({ name: 'TORNADO KICK', special: true, s: 8, a: 24, r: 12, hits: h ? 4 : 3, every: 6, dmg: 28,
      box: { x: -26, y: 30, w: 54, h: 18 }, hitstun: 18, blockstun: 14, push: 1.4, hitstop: 7, lastLaunch: { vx: 2.5, vy: 4.5, spin: 8 },
      moves: [[8, 32, h ? 2.6 : 2.0]], sfx: 'whiffH', anim: spinAnim(8) }),
    super: () => ({ name: 'SHINING FIST', super: true, s: 8, a: 42, r: 24, rush: true, hits: 7, every: 5, dmg: 40, chip: 8,
      box: { x: 6, y: 24, w: 30, h: 36 }, hitstun: 30, blockstun: 18, push: 0.5, hitstop: 6, lastLaunch: { vx: 2, vy: 7, spin: 10 },
      moves: [[8, 24, 7]], fx: 'flame', anim: flurryAnim() }),
  },
  kazuya: {
    qcf: (h) => ({ name: 'DEVIL LASER', special: true, s: 16, a: 1, r: 24, cancel: 'super', sfx: 'laser',
      anim: [['laser', 16], ['laser', 8], ['idle1', 0]],
      proj: { frame: 16, type: 'laser', vx: h ? 9 : 7, x: 12, y: 57, w: 30, h: 5, dmg: 55, chip: 12, hitstun: 20, blockstun: 14, push: 3, hitstop: 8 } }),
    dp: (h) => ({ name: 'E.W.G.F.', special: true, s: 3, a: 6, r: 28, inv: [1, h ? 7 : 5], dmg: h ? 110 : 85,
      box: { x: 8, y: 32, w: 26, h: 42 }, launch: { vx: 1.8, vy: 6.8, spin: 10 }, hitstun: 26, blockstun: 18, push: 3, hitstop: 14,
      moves: [[1, 4, 2.6]], fx: 'electric', sfx: 'rise', cancel: 'super',
      anim: [['dpCrouch', 3], ['chp1', 8], ['chp1', 8], ['idle1', 0]] }),
    qcb: (h) => ({ name: 'HELLSWEEP', special: true, s: 12, a: 5, r: 24, level: 'low', dmg: h ? 95 : 80,
      box: { x: 10, y: 0, w: 36, h: 12 }, sweep: true, hitstun: 20, blockstun: 14, push: 3, hitstop: 10,
      moves: [[1, 12, h ? 3.2 : 2.6]], sfx: 'whiffH',
      anim: [['dash', 10], ['sweep', 6], ['sweep', 8], ['crouch', 0]] }),
    super: () => ({ name: 'DEVIL BLASTER', super: true, s: 18, a: 46, r: 30,
      anim: [['superPose', 16], ['fbPush', 46], ['fbPush', 8], ['idle1', 0]],
      proj: { frame: 18, type: 'beam', color: 'red', x: 18, y: 34, h: 24, length: 360, life: 46, every: 4, hits: 11, dmg: 24, chip: 6,
        hitstun: 20, blockstun: 12, push: 0.8, hitstop: 3, lastLaunch: { vx: 3, vy: 5, spin: 10 } } }),
  },
  heihachi: {
    qcf: (h) => ({ name: 'THUNDER BALL', special: true, s: 14, a: 1, r: 30, cancel: 'super', sfx: 'thunder',
      anim: [['fbWind', 11], ['fbPush', 4], ['fbPush', 18], ['idle1', 0]],
      proj: { frame: 14, type: 'thunder', vx: h ? 3.8 : 2.6, x: 22, y: 30, w: 22, h: 20, dmg: 70, chip: 16, hitstun: 22, blockstun: 17, push: 3.5, hitstop: 10 } }),
    dp: (h) => ({ name: 'DEMON UPPERCUT', special: true, s: 5, a: 10, r: 24, inv: [1, h ? 8 : 6], dmg: h ? 120 : 90,
      box: { x: 6, y: 28, w: 22, h: 52 }, launch: { vx: 1.6, vy: 7, spin: 10 }, hitstun: 26, blockstun: 18, push: 3, hitstop: 12,
      moves: [[4, 4, 1.4, h ? 6.4 : 5.6]], landLag: 10, fx: 'electric', sfx: 'rise', cancel: 'super',
      anim: [['dpCrouch', 4], ['dpRise', 10], ['dpRise', 10], ['jumpFall', 0]] }),
    qcb: (h) => ({ name: 'DEMON SCISSORS', special: true, s: 16, a: 8, r: 14, level: 'overhead', dmg: h ? 105 : 90,
      box: { x: 0, y: 0, w: 32, h: 28 }, launch: { vx: 2, vy: 3.5, spin: 6 }, hitstun: 22, blockstun: 16, push: 3, hitstop: 11,
      moves: [[3, 3, h ? 3.2 : 2.6, 5.0]], landLag: 10, sfx: 'whiffH',
      anim: [['jumpSquat', 3], ['flipA', 5], ['flipB', 5], ['flipC', 5], ['flipD', 6], ['jlkR', 0]] }),
    super: () => ({ name: 'THUNDER GOD FIST', super: true, s: 14, a: 34, r: 24,
      anim: [['superPose', 12], ['skyFist', 40], ['skyFist', 8], ['idle1', 0]],
      pillars: { frames: [14, 22, 30, 38], dx: 44, dmg: 72, chip: 10 } }),
  },
  devil: {
    qcf: (h) => ({ name: 'EYE LASER', special: true, s: 14, a: 1, r: 22, cancel: 'super', sfx: 'laser',
      anim: [['laser', 14], ['laser', 8], ['idle1', 0]],
      proj: { frame: 14, type: 'laserP', vx: h ? 10 : 8, x: 12, y: 58, w: 32, h: 5, dmg: 60, chip: 12, hitstun: 20, blockstun: 14, push: 3, hitstop: 8 } }),
    dp: (h) => ({ name: 'DEVIL UPPER', special: true, s: 4, a: 12, r: 22, inv: [1, h ? 9 : 6], dmg: h ? 66 : 52, hits: 2, every: 6,
      box: { x: 6, y: 26, w: 22, h: 52 }, launch: { vx: 1.6, vy: 7, spin: 9 }, hitstun: 24, blockstun: 18, push: 3, hitstop: 10,
      moves: [[3, 3, 1.6, h ? 6.4 : 5.4]], landLag: 8, fx: 'purple', sfx: 'rise', cancel: 'super',
      anim: [['dpCrouch', 3], ['dpRise', 10], ['dpRise', 10], ['jumpFall', 0]] }),
    qcb: (h) => ({ name: 'DEVIL DIVE', special: true, s: 10, a: 18, r: 16, dmg: h ? 100 : 85,
      box: { x: 6, y: 18, w: 30, h: 26 }, launch: { vx: 2.5, vy: 4.5, spin: 8 }, hitstun: 22, blockstun: 15, push: 3, hitstop: 11,
      moves: [[10, 28, h ? 7 : 6]], sfx: 'whiffH', fx: 'purple',
      anim: [['jumpSquat', 10], ['diveL', 18], ['diveL', 6], ['idle1', 0]] }),
    super: () => ({ name: 'DEVIL BLASTER', super: true, s: 18, a: 46, r: 30,
      anim: [['superPose', 16], ['laser', 46], ['laser', 8], ['idle1', 0]],
      proj: { frame: 18, type: 'beam', color: 'purple', x: 14, y: 46, h: 20, length: 380, life: 46, every: 4, hits: 11, dmg: 26, chip: 7,
        hitstun: 20, blockstun: 12, push: 0.8, hitstop: 3, lastLaunch: { vx: 3, vy: 5, spin: 10 } } }),
  },
};

// ----- Pembentuk tabel jurus -----
function finalizeMove(id, m) {
  m.id = id;
  m.total = m.s + m.a + m.r;
  let sum = 0;
  for (let i = 0; i < m.anim.length - 1; i++) sum += m.anim[i][1];
  const last = m.anim[m.anim.length - 1];
  if (last[1] === 0) last[1] = Math.max(1, m.total - sum);
  m.level = m.level || 'mid';
  return m;
}
function buildMoves(cid) {
  const moves = {};
  for (const k in NORMALS) moves[k] = finalizeMove(k, JSON.parse(JSON.stringify(NORMALS[k])));
  const sp = SPECIALS[cid];
  moves.qcf_l = finalizeMove('qcf_l', sp.qcf(false)); moves.qcf_h = finalizeMove('qcf_h', sp.qcf(true));
  moves.dp_l = finalizeMove('dp_l', sp.dp(false)); moves.dp_h = finalizeMove('dp_h', sp.dp(true));
  moves.qcb_l = finalizeMove('qcb_l', sp.qcb(false)); moves.qcb_h = finalizeMove('qcb_h', sp.qcb(true));
  moves.super = finalizeMove('super', sp.super());
  return moves;
}

// ----- Warna torso per karakter (f = depan/belakang, v = tinggi dari pinggul) -----
const TORSO = {
  jacket: (f, v, T) => {
    if (v < 3.5) return 'pants';
    if (v < 6) return 'belt';
    if (f > 3 && f < 4.4) return 'trim';
    if (v > T - 2.5) return 'trim';
    return 'top';
  },
  kazuya: (f, v, T) => {
    if (v < 3.5) return 'pants';
    if (v < 5.5) return 'belt';
    if (f > 4.4 && v > 11) return 'skin';
    if (f > 3.2 && f <= 4.4 && v > 6) return 'trim';
    if (f < 2 && ((Math.floor(f * 0.6 + v * 0.45) & 3) === 0)) return 'pattern';
    return 'top';
  },
  bare: (f, v, T) => {
    if (v < 4) return 'pants';
    if (v < 7.5) return 'belt';
    if (v > T - 10 && v < T - 8.8 && f > -1) return 'skinS';
    if (f > 0.5 && f < 1.6 && v > 9 && v < T - 10) return 'skinS';
    return 'top';
  },
  devil: (f, v, T) => {
    if (v < 3.5) return 'pants';
    if (v < 5.5) return 'belt';
    if (Math.abs(f - (v * 0.4 - 6)) < 0.8 && v > 8 && v < T - 3) return 'trim';
    if (Math.abs(f + (v * 0.3 - 9)) < 0.7 && v > 12 && v < T - 2) return 'trim';
    return 'top';
  },
};

const BODY_STD = { torso: 25, uarm: 12, farm: 11, thigh: 16, shin: 16, armR: 3.4, farmR: 3.0, fistR: 3.4, thighR: 4.6, shinR: 3.7, tw: 1 };

const CHARACTERS = {
  jin: {
    id: 'jin', name: 'JIN', full: 'JIN KAZAMA', style: 'KARATE KAZAMA', country: 'JEPANG',
    hp: 1000, walkF: 1.75, walkB: 1.4, dmg: 1.0, jumpVx: 2.5,
    body: Object.assign({}, BODY_STD, { trimAt: 0.66 }),
    head: HEADS.jin, torsoColor: TORSO.jacket,
    palettes: [
      { name: 'jin0', skin: '#e6b089', hair: '#17131c', top: '#22202a', trim: '#c8202c', sleeve: '#22202a', forearm: '#22202a',
        glove: '#d0262a', pants: '#2a2733', pantsTrim: '#b81c24', belt: '#c8202c', shoe: '#141218', eye: '#2a1414' },
      { name: 'jin1', skin: '#e6b089', hair: '#2a2016', top: '#e8e6e0', trim: '#2f6fd6', sleeve: '#e8e6e0', forearm: '#e8e6e0',
        glove: '#2f6fd6', pants: '#d8d6d0', pantsTrim: '#2f6fd6', belt: '#2f6fd6', shoe: '#3a3a44', eye: '#2a1414' },
    ],
    poses: { idle1: { t: 6, af: [40, 158], ab: [25, 150], lf: [30, 4], lb: [-26, -12] } },
    intro: [['bow', 30], ['bow', 20], ['idle1', 20]],
    win: [['idle1', 10], ['winFist', 40]],
    quote: 'GEN IBLIS INI... AKAN KUHENTIKAN DENGAN TANGANKU SENDIRI.',
    ending: ['JIN MENGALAHKAN SEMUA LAWAN.', 'NAMUN KUTUKAN GEN IBLIS', 'MASIH MENGALIR DI DARAHNYA.', 'IA MELANGKAH PERGI KE DALAM BADAI...', 'MENCARI CARA UNTUK MENGAKHIRINYA.'],
  },
  kazuya: {
    id: 'kazuya', name: 'KAZUYA', full: 'KAZUYA MISHIMA', style: 'KARATE MISHIMA', country: 'JEPANG',
    hp: 1000, walkF: 1.6, walkB: 1.3, dmg: 1.06, jumpVx: 2.4,
    body: Object.assign({}, BODY_STD, { torso: 25.5, uarm: 12.5, farm: 11.5, thigh: 16.5, shin: 16.5, armR: 3.6, farmR: 3.1, thighR: 4.8, shinR: 3.8, tw: 1.05 }),
    head: HEADS.kazuya, torsoColor: TORSO.kazuya,
    palettes: [
      { name: 'kaz0', skin: '#dca37d', hair: '#2a1d17', top: '#3b2448', pattern: '#2a1834', trim: '#c9a646', sleeve: '#3b2448', forearm: '#2c1a36',
        glove: '#1a1418', pants: '#2a2030', belt: '#151018', shoe: '#121014', eye: '#ff2a2a' },
      { name: 'kaz1', skin: '#dca37d', hair: '#2a1d17', top: '#ece8ee', pattern: '#d4ced8', trim: '#8a1a2a', sleeve: '#ece8ee', forearm: '#ece8ee',
        glove: '#f4f2f6', pants: '#dcd8e0', belt: '#8a1a2a', shoe: '#e0dce4', eye: '#ff2a2a' },
    ],
    poses: { idle1: { t: 14, af: [32, 125], ab: [16, 105], lf: [34, 6], lb: [-28, -14] },
             idle2: { t: 16, af: [35, 120], ab: [18, 100], lf: [37, 2], lb: [-30, -10] } },
    intro: [['armsCrossed', 40], ['armsCrossed', 10], ['idle1', 20]],
    win: [['idle1', 10], ['armsCrossed', 40]],
    quote: 'LEMAH! KEKUATAN IBLIS INI HANYA MILIKKU.',
    ending: ['KAZUYA BERDIRI DI PUNCAK.', 'TAK ADA LAGI YANG BISA', 'MENGHALANGI AMBISINYA.', 'KEKUATAN IBLIS KINI', 'SEPENUHNYA DALAM GENGGAMANNYA.'],
  },
  heihachi: {
    id: 'heihachi', name: 'HEIHACHI', full: 'HEIHACHI MISHIMA', style: 'KARATE MISHIMA', country: 'JEPANG',
    hp: 1080, walkF: 1.45, walkB: 1.2, dmg: 1.1, jumpVx: 2.3,
    body: Object.assign({}, BODY_STD, { torso: 25, thigh: 15, shin: 15, armR: 4.0, farmR: 3.5, fistR: 3.7, thighR: 5.0, shinR: 4.0, tw: 1.14 }),
    head: HEADS.heihachi, torsoColor: TORSO.bare,
    palettes: [
      { name: 'hei0', skin: '#d8a272', skinS: '#a87650', hair: '#c9cad6', top: '#d8a272', sleeve: '#d8a272', forearm: '#d8a272',
        glove: '#d8a272', pants: '#e3e0d4', belt: '#1a1a1e', shoe: '#c48f60', whisker: '#d8d8e2', eye: '#1a0e10' },
      { name: 'hei1', skin: '#d8a272', skinS: '#a87650', hair: '#c9cad6', top: '#d8a272', sleeve: '#d8a272', forearm: '#d8a272',
        glove: '#d8a272', pants: '#34488a', belt: '#e8e0c8', shoe: '#c48f60', whisker: '#d8d8e2', eye: '#1a0e10' },
    ],
    poses: {
      idle1: { t: 14, af: [30, 120], ab: [14, 100], lf: [36, 6], lb: [-30, -14] },
      idle2: { t: 16, af: [33, 116], ab: [16, 96], lf: [39, 2], lb: [-32, -10] },
      flipA: Object.assign({}, POSES.flipKick, { rot: 0 }),
      flipB: Object.assign({}, POSES.flipKick, { rot: 120 }),
      flipC: Object.assign({}, POSES.flipKick, { rot: 240 }),
      flipD: Object.assign({}, POSES.flipKick, { rot: 360 }),
      jlkR: Object.assign({}, POSES.jlk, { rot: 360 }),
    },
    intro: [['skyFist', 40], ['skyFist', 10], ['idle1', 20]],
    win: [['idle1', 10], ['skyFist', 40]],
    quote: 'SERATUS TAHUN TERLALU CEPAT UNTUK MENGALAHKANKU!',
    ending: ['HEIHACHI TERTAWA KERAS.', '"MISHIMA ZAIBATSU ADALAH MILIKKU!"', 'SANG RAJA IRON FIST', 'KEMBALI MEMERINTAH', 'DENGAN TANGAN BESI.'],
  },
  devil: {
    id: 'devil', name: 'DEVIL JIN', full: 'DEVIL JIN', style: 'GEN IBLIS', country: '???', boss: true,
    hp: 1150, walkF: 1.8, walkB: 1.5, dmg: 1.12, jumpVx: 2.6,
    body: Object.assign({}, BODY_STD, { armR: 3.6, farmR: 3.1, trimAt: 0.6 }),
    head: HEADS.devil, torsoColor: TORSO.devil, wings: true,
    palettes: [
      { name: 'dev0', skin: '#9d92b0', hair: '#121016', top: '#9d92b0', trim: '#e02040', sleeve: '#9d92b0', forearm: '#9d92b0',
        glove: '#2a1830', pants: '#17141c', pantsTrim: '#c81830', belt: '#2a1830', shoe: '#17141c', eye: '#ff2040', wing: '#1a1322', horn: '#e6dccb' },
      { name: 'dev1', skin: '#b39a86', hair: '#e8e2d8', top: '#b39a86', trim: '#2a90ff', sleeve: '#b39a86', forearm: '#b39a86',
        glove: '#ece6dc', pants: '#ece6dc', pantsTrim: '#2a90ff', belt: '#2a90ff', shoe: '#ece6dc', eye: '#40c0ff', wing: '#e8e2d8', horn: '#2a2a30' },
    ],
    poses: { diveL: Object.assign({}, POSES.dive, { lift: 14 }) },
    intro: [['superPose', 40], ['superPose', 10], ['idle1', 20]],
    win: [['idle1', 10], ['superPose', 40]],
    quote: 'GEN IBLIS TELAH BANGKIT. DUNIA AKAN TERBAKAR.',
    ending: ['KEGELAPAN MENELAN SEGALANYA.', 'SAYAP HITAM MEMBENTANG', 'DI ATAS KOTA YANG TERBAKAR.', 'TAK ADA LAGI YANG TERSISA', 'UNTUK MENGHENTIKANNYA...'],
  },
};
for (const id in CHARACTERS) CHARACTERS[id].moves = buildMoves(id);

const ROSTER = ['jin', 'kazuya', 'heihachi', 'devil'];

// Daftar jurus untuk layar "Daftar Jurus"
function moveList(cid) {
  const c = CHARACTERS[cid], m = c.moves;
  return [
    ['LEMPARAN', 'LP + LK (DEKAT)'],
    ['DASH', '→ → / ← ←'],
    [m.qcf_l.name, '↓ ↘ → + P'],
    [m.dp_l.name, '→ ↓ ↘ + P'],
    [m.qcb_l.name, '↓ ↙ ← + K'],
    [m.super.name + ' (SUPER)', '↓ → ↓ → + P / LP+HP'],
    ['SAPUAN', '↓ + HK'],
    ['UPPERCUT ANTI UDARA', '↓ + HP'],
  ];
}
