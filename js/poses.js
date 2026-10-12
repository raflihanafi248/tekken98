'use strict';
// ---------------------------------------------------------------------------
// Pustaka pose kerangka. Sudut absolut dalam derajat:
// 0 = lurus ke bawah, 90 = ke depan, 180 = ke atas, -90 = ke belakang.
// t = condong torso (+ ke depan), af/ab = lengan depan/belakang [atas, bawah],
// lf/lb = kaki depan/belakang [paha, betis], rot = putar seluruh tubuh.
// ---------------------------------------------------------------------------
const POSES = {
  stand:      { t: 0, af: [6, 6], ab: [-6, -6], lf: [6, 0], lb: [-6, 0] },
  idle1:      { t: 8, af: [45, 155], ab: [28, 145], lf: [30, 4], lb: [-26, -12] },
  idle2:      { t: 11, af: [50, 150], ab: [32, 140], lf: [34, 0], lb: [-29, -8] },
  walk1:      { t: 10, af: [47, 153], ab: [30, 143], lf: [32, 8], lb: [-24, -14] },
  walk2:      { t: 10, af: [47, 153], ab: [30, 143], lf: [8, 2], lb: [4, -38] },
  walk3:      { t: 10, af: [47, 153], ab: [30, 143], lf: [-22, -12], lb: [28, 6] },
  walk4:      { t: 10, af: [47, 153], ab: [30, 143], lf: [6, -36], lb: [6, 2] },
  crouch:     { t: 30, af: [70, 165], ab: [55, 155], lf: [88, -8], lb: [18, -95] },
  crouchBlock:{ t: 22, af: [85, 178], ab: [70, 172], lf: [88, -8], lb: [18, -95] },
  block:      { t: -4, af: [65, 178], ab: [52, 172], lf: [24, 4], lb: [-30, -16] },
  jumpSquat:  { t: 18, af: [55, 150], ab: [40, 140], lf: [60, -10], lb: [5, -50] },
  jumpUp:     { t: 4, af: [70, 170], ab: [45, 165], lf: [95, 15], lb: [15, -40] },
  jumpTuck:   { t: 22, af: [85, 175], ab: [70, 168], lf: [125, 25], lb: [95, -15] },
  jumpFall:   { t: 8, af: [70, 160], ab: [50, 150], lf: [55, 10], lb: [-5, -20] },
  // normal berdiri
  lp0:        { t: 12, af: [75, 120], ab: [28, 145], lf: [30, 4], lb: [-26, -12] },
  lp1:        { t: 14, af: [90, 90], ab: [25, 145], lf: [30, 4], lb: [-26, -12] },
  hp0:        { t: 4, af: [50, 150], ab: [10, 110], lf: [30, 4], lb: [-26, -12] },
  hp1:        { t: 24, dx: 2, af: [30, 140], ab: [88, 88], lf: [38, 8], lb: [-36, -24] },
  lk0:        { t: 0, af: [45, 150], ab: [20, 140], lf: [75, 0], lb: [-8, -6] },
  lk1:        { t: -6, af: [40, 150], ab: [15, 140], lf: [84, 92], lb: [-6, -4] },
  hk0:        { t: -10, af: [35, 140], ab: [-10, 60], lf: [105, 40], lb: [-8, -4] },
  hk1:        { t: -26, af: [20, 110], ab: [-40, 10], lf: [122, 110], lb: [-12, -6] },
  // normal jongkok
  clp0:       { t: 28, af: [70, 120], ab: [50, 150], lf: [88, -8], lb: [18, -95] },
  clp1:       { t: 30, af: [92, 92], ab: [50, 150], lf: [88, -8], lb: [18, -95] },
  chp0:       { t: 20, af: [30, 100], ab: [50, 150], lf: [80, -5], lb: [15, -90] },
  chp1:       { t: -6, af: [172, 176], ab: [30, 140], lf: [45, 0], lb: [-12, -40] },
  clk0:       { t: 34, af: [70, 160], ab: [55, 150], lf: [80, 40], lb: [18, -95] },
  clk1:       { t: 38, af: [70, 160], ab: [55, 150], lf: [86, 95], lb: [18, -95] },
  chk0:       { t: 40, af: [60, 110], ab: [10, 30], lf: [70, 40], lb: [18, -95] },
  chk1:       { t: 48, af: [20, 40], ab: [0, 10], lf: [87, 93], lb: [20, -95] },
  // udara
  jlp:        { t: 12, af: [72, 68], ab: [45, 155], lf: [110, 20], lb: [70, -20] },
  jhp:        { t: 28, af: [62, 55], ab: [-50, -10], lf: [100, 10], lb: [60, -30] },
  jlk:        { t: -4, af: [50, 160], ab: [30, 150], lf: [68, 68], lb: [110, -10] },
  jhk:        { t: -14, af: [30, 120], ab: [-30, 20], lf: [92, 92], lb: [60, -50] },
  // kena pukul
  hitHigh:    { t: -24, af: [15, 70], ab: [-20, 30], lf: [18, 0], lb: [-34, -18] },
  hitLow:     { t: 34, af: [-5, 25], ab: [-20, 5], lf: [22, 2], lb: [-30, -18] },
  hitCrouch:  { t: 12, af: [40, 90], ab: [20, 60], lf: [85, -10], lb: [15, -95] },
  airHit:     { t: -25, af: [150, 175], ab: [-140, -165], lf: [30, 55], lb: [-15, 0] },
  lie:        { t: 0, af: [-12, -20], ab: [-25, -40], lf: [4, 0], lb: [-6, -2], rot: -90 },
  // lain-lain
  throwGrab:  { t: 16, af: [88, 92], ab: [78, 95], lf: [32, 6], lb: [-28, -16] },
  throwToss:  { t: -22, af: [168, 175], ab: [160, 172], lf: [22, 0], lb: [-30, -18] },
  fbWind:     { t: -4, af: [-60, -20], ab: [-75, -35], lf: [36, 8], lb: [-34, -22] },
  fbPush:     { t: 20, dx: 2, af: [90, 94], ab: [86, 90], lf: [40, 12], lb: [-40, -30] },
  dpCrouch:   { t: 24, af: [55, 100], ab: [40, 140], lf: [70, -10], lb: [10, -80] },
  dpRise:     { t: -8, af: [172, 178], ab: [25, 110], lf: [80, 10], lb: [-6, -6] },
  spin1:      { t: 0, af: [100, 100], ab: [-100, -100], lf: [90, 90], lb: [-5, -3] },
  spin2:      { t: 0, af: [100, 100], ab: [-100, -100], lf: [90, 90], lb: [-5, -3], flip: true },
  sweep:      { t: 52, af: [30, 60], ab: [0, 20], lf: [88, 95], lb: [25, -95] },
  flipKick:   { t: 0, af: [60, 170], ab: [40, 160], lf: [95, 95], lb: [85, 85] },
  superPose:  { t: -12, af: [140, 160], ab: [-140, -160], lf: [32, 4], lb: [-32, -18] },
  skyFist:    { t: -6, af: [178, 180], ab: [20, 120], lf: [24, 2], lb: [-28, -14] },
  dash:       { t: 30, af: [60, 150], ab: [40, 140], lf: [55, 15], lb: [-40, -32] },
  backdash:   { t: -12, af: [50, 160], ab: [30, 150], lf: [40, -10], lb: [-10, -40] },
  winFist:    { t: 0, af: [175, 178], ab: [25, 140], lf: [12, 2], lb: [-14, -4] },
  armsCrossed:{ t: 2, af: [20, -75], ab: [22, -70], lf: [10, 2], lb: [-10, -2] },
  lose:       { t: 38, af: [5, 0], ab: [0, -5], lf: [12, 0], lb: [-10, 0] },
  bow:        { t: 40, af: [20, 30], ab: [15, 25], lf: [4, 0], lb: [-4, 0] },
  laser:      { t: -8, af: [40, 150], ab: [20, 140], lf: [30, 4], lb: [-28, -14] },
  rush:       { t: 30, dx: 3, af: [90, 90], ab: [-30, 10], lf: [50, 15], lb: [-50, -40] },
  flurry1:    { t: 20, af: [90, 90], ab: [40, 150], lf: [34, 6], lb: [-34, -20] },
  flurry2:    { t: 22, af: [40, 150], ab: [88, 88], lf: [34, 6], lb: [-34, -20] },
  dive:       { t: 10, af: [100, 110], ab: [-60, -40], lf: [75, 80], lb: [30, -60] },
};

const ANIMS = {
  idle: { loop: true, keys: [['idle1', 30], ['idle2', 30]] },
  walk: { loop: true, keys: [['walk1', 7], ['walk2', 7], ['walk3', 7], ['walk4', 7]] },
  walkBack: { loop: true, keys: [['walk4', 8], ['walk3', 8], ['walk2', 8], ['walk1', 8]] },
  getup: { loop: false, keys: [['lie', 8], ['crouch', 10], ['idle1', 6]] },
  win: { loop: false, keys: [['idle1', 10], ['winFist', 40]] },
  lose: { loop: false, keys: [['idle1', 20], ['lose', 60]] },
};

function getPose(def, name) {
  return (def.poses && def.poses[name]) || POSES[name] || POSES.idle1;
}

function lerpPose(a, b, t) {
  if (t <= 0 || a === b) return a;
  const l2 = (x, y) => [lerp(x[0], y[0], t), lerp(x[1], y[1], t)];
  return {
    t: lerp(a.t || 0, b.t || 0, t),
    dx: lerp(a.dx || 0, b.dx || 0, t),
    rot: lerp(a.rot || 0, b.rot || 0, t),
    lift: lerp(a.lift || 0, b.lift || 0, t),
    af: l2(a.af, b.af), ab: l2(a.ab, b.ab), lf: l2(a.lf, b.lf), lb: l2(a.lb, b.lb),
    flip: t < 0.5 ? a.flip : b.flip,
  };
}

// keys: [[namaPose, durasi], ...]; tiap kunci bertransisi ke kunci berikutnya
function animPose(def, keys, frame, loop) {
  let total = 0;
  for (const k of keys) total += k[1];
  let f = loop ? frame % total : Math.min(frame, total - 1);
  let acc = 0;
  for (let i = 0; i < keys.length; i++) {
    const d = keys[i][1];
    if (f < acc + d) {
      const a = getPose(def, keys[i][0]);
      const nk = keys[i + 1] || (loop ? keys[0] : keys[i]);
      const b = getPose(def, nk[0]);
      const lt = d > 1 ? (f - acc) / d : 0;
      return lerpPose(a, b, easeInOut(lt));
    }
    acc += d;
  }
  return getPose(def, keys[keys.length - 1][0]);
}

function withRot(pose, rot, extra) {
  return Object.assign({}, pose, { rot: (pose.rot || 0) + rot }, extra || {});
}
