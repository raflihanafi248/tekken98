'use strict';
// ---------------------------------------------------------------------------
// FigureRenderer: menggambar petarung pixel-art secara prosedural dari pose
// (kerangka + bentuk kapsul) ke buffer resolusi rendah, lalu diberi outline.
// Semua digambar menghadap ke kanan; pembalikan dilakukan saat ditempel.
// ---------------------------------------------------------------------------
const OUTLINE_COL = '#0b0812';
const LIGHT = [-0.55, 0.83]; // arah bayangan (bawah-belakang)

class FigureRenderer {
  constructor(w = 200, h = 184, ox = 100, oy = 172) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.canvas = makeCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(w, h);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.marks = new Int32Array(w * h);
    this.cache = new Map();
  }

  cols(hex, k = 1) {
    if (this.flash) return this.flashCols;
    const key = hex + '|' + k;
    let v = this.cache.get(key);
    if (!v) {
      if (this.cache.size > 400) this.cache.clear();
      v = { b: pack(shade(hex, k)), s: pack(shade(hex, 0.68 * k)), e: pack(shade(hex, 0.42 * k)) };
      this.cache.set(key, v);
    }
    return v;
  }

  put(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.buf[y * this.w + x] = c;
    if (x < this.minX) this.minX = x; if (x > this.maxX) this.maxX = x;
    if (y < this.minY) this.minY = y; if (y > this.maxY) this.maxY = y;
  }

  // kapsul (anggota tubuh) dengan shading sel & tepi gelap
  capsule(a, b, r, c, trim) {
    const minx = Math.floor(Math.min(a[0], b[0]) - r - 1), maxx = Math.ceil(Math.max(a[0], b[0]) + r + 1);
    const miny = Math.floor(Math.min(a[1], b[1]) - r - 1), maxy = Math.ceil(Math.max(a[1], b[1]) + r + 1);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L2 = dx * dx + dy * dy || 1e-6;
    const r2 = r * r, re = (r - 0.95) * (r - 0.95);
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ox = px - (a[0] + dx * t), oy = py - (a[1] + dy * t);
        const d2 = ox * ox + oy * oy;
        if (d2 > r2) continue;
        const cc = trim && t >= trim[0] ? trim[1] : c;
        let col;
        if (r >= 2.4 && d2 > re) col = cc.e;
        else if (ox * LIGHT[0] + oy * LIGHT[1] > r * 0.28) col = cc.s;
        else col = cc.b;
        this.put(x, y, col);
      }
    }
  }

  // poligon torso; warna ditentukan fungsi (f, v) koordinat lokal torso
  torso(pts, origin, fwR, upR, colorAt) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const p of pts) {
      minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]);
      miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]);
    }
    const inside = (px, py) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++) {
      for (let x = Math.floor(minx); x <= Math.ceil(maxx); x++) {
        const px = x + 0.5, py = y + 0.5;
        if (!inside(px, py)) continue;
        const rx = px - origin[0], ry = py - origin[1];
        const f = rx * fwR[0] + ry * fwR[1];
        const v = rx * upR[0] + ry * upR[1];
        const c = colorAt(f, v);
        const edge = !inside(px + 1, py) || !inside(px - 1, py) || !inside(px, py + 1) || !inside(px, py - 1);
        this.put(x, y, edge ? c.e : (f < -2.6 ? c.s : c.b));
      }
    }
  }

  // sprite kepala dari ASCII, bisa diputar (sampling nearest)
  head(sprite, palMap, N, hf, hd, simple) {
    const rows = sprite.rows, ax = sprite.ax, ay = sprite.ay;
    const sh = rows.length, sw = rows[0].length;
    if (simple) {
      const ox = Math.round(N[0]) - ax, oy = Math.round(N[1]) - ay;
      for (let y = 0; y < sh; y++) {
        const row = rows[y];
        for (let x = 0; x < sw; x++) {
          const ch = row[x];
          if (ch === '.') continue;
          const c = palMap[ch];
          if (c !== undefined) this.put(ox + x, oy + y, c);
        }
      }
      return;
    }
    const R = Math.ceil(Math.hypot(sw, sh)) + 1;
    for (let y = Math.floor(N[1] - R); y <= N[1] + R; y++) {
      for (let x = Math.floor(N[0] - R); x <= N[0] + R; x++) {
        const rx = x + 0.5 - N[0], ry = y + 0.5 - N[1];
        const sx = Math.floor(ax + 0.5 + rx * hf[0] + ry * hf[1]);
        const sy = Math.floor(ay + 0.5 + rx * hd[0] + ry * hd[1]);
        if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;
        const ch = rows[sy][sx];
        if (ch === '.') continue;
        const c = palMap[ch];
        if (c !== undefined) this.put(x, y, c);
      }
    }
  }

  outline(hex) {
    const o = pack(hex), w = this.w, buf = this.buf, marks = this.marks;
    let n = 0;
    const x0 = Math.max(1, this.minX - 1), x1 = Math.min(w - 2, this.maxX + 1);
    const y0 = Math.max(1, this.minY - 1), y1 = Math.min(this.h - 2, this.maxY + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (buf[i] !== 0) continue;
        if (buf[i - 1] || buf[i + 1] || buf[i - w] || buf[i + w]) marks[n++] = i;
      }
    }
    for (let k = 0; k < n; k++) buf[marks[k]] = o;
  }

  render(def, pal, pose, opts = {}) {
    const b = def.body;
    this.buf.fill(0);
    this.minX = this.w; this.maxX = 0; this.minY = this.h; this.maxY = 0;
    this.flash = !!opts.flash;
    if (this.flash) {
      this.flashCols = { b: pack('#ffffff'), s: pack('#ffe6d8'), e: pack('#c8a8a8') };
    }

    // --- kerangka dalam koordinat lokal (pinggul = 0,0; y ke bawah) ---
    const t = (pose.t || 0) * DEG;
    const up = [Math.sin(t), -Math.cos(t)], fw = [Math.cos(t), Math.sin(t)];
    const add = (p, v, s) => [p[0] + v[0] * s, p[1] + v[1] * s];
    const dir = (a) => [Math.sin(a * DEG), Math.cos(a * DEG)];
    const Hp = [pose.dx || 0, 0];
    const N = add(Hp, up, b.torso);
    const shF = add(add(N, up, -3.5), fw, 2), shB = add(add(N, up, -3.5), fw, -3);
    const hipF = add(Hp, fw, 2.5), hipB = add(Hp, fw, -2.5);
    const af = pose.af, ab = pose.ab, lf = pose.lf, lb = pose.lb;
    const elF = add(shF, dir(af[0]), b.uarm), wrF = add(elF, dir(af[1]), b.farm), fiF = add(wrF, dir(af[1]), 2.2);
    const elB = add(shB, dir(ab[0]), b.uarm), wrB = add(elB, dir(ab[1]), b.farm), fiB = add(wrB, dir(ab[1]), 2.2);
    const knF = add(hipF, dir(lf[0]), b.thigh), anF = add(knF, dir(lf[1]), b.shin), toF = add(anF, dir(lf[1] + 90), 5);
    const knB = add(hipB, dir(lb[0]), b.thigh), anB = add(knB, dir(lb[1]), b.shin), toB = add(anB, dir(lb[1] + 90), 5);

    // titik torso (f = depan, v = atas)
    const tw = b.tw || 1, T = b.torso;
    const tloc = [[-7 * tw, T + 1], [5 * tw, T + 1.5], [8.5 * tw, T - 6], [6, 9], [6, -2.5], [-6, -2.5], [-6.5, 8], [-8.5 * tw, T - 7]];
    const torsoPts = tloc.map(([f, v]) => [Hp[0] + fw[0] * f + up[0] * v, Hp[1] + fw[1] * f + up[1] * v]);

    // sayap (Devil Jin)
    let wingBones = null;
    if (def.wings) {
      const flap = Math.sin((opts.time || 0) * 0.09) * 9;
      const root = add(shB, up, 1);
      const p1 = add(root, dir(-140 + flap), 24);
      const p2 = add(p1, dir(-95 + flap * 1.6), 22);
      const feathers = [];
      for (let i = 0; i <= 9; i++) {
        const s = i / 9;
        const base = s < 0.5 ? [lerp(root[0], p1[0], s * 2), lerp(root[1], p1[1], s * 2)] : [lerp(p1[0], p2[0], (s - 0.5) * 2), lerp(p1[1], p2[1], (s - 0.5) * 2)];
        feathers.push([base, add(base, dir(-8 - s * 30 + flap * 0.5), 12 + s * 14), 3 + s * 1.2]);
      }
      wingBones = { root, p1, p2, feathers };
    }

    // --- transformasi: rotasi seluruh tubuh, flip, lalu tempel ke lantai ---
    const rot = (pose.rot || 0) * DEG, cr = Math.cos(rot), sr = Math.sin(rot);
    const C = [(Hp[0] + N[0]) / 2, (Hp[1] + N[1]) / 2];
    const flip = pose.flip ? -1 : 1;
    const rp = (p) => {
      let x = p[0] - C[0], y = p[1] - C[1];
      const nx = x * cr - y * sr, ny = x * sr + y * cr;
      return [C[0] + nx * flip, C[1] + ny];
    };
    const rv = (v) => [(v[0] * cr - v[1] * sr) * flip, v[0] * sr + v[1] * cr];

    const P = {
      Hp, N, shF, shB, elF, wrF, fiF, elB, wrB, fiB, hipF, hipB, knF, anF, toF, knB, anB, toB,
    };
    for (const k in P) P[k] = rp(P[k]);
    const tp = torsoPts.map(rp);
    const fwR = rv(fw), upR = rv(up);
    const hf = rv([1, 0]), hd = rv([0, 1]);
    const headC = add(P.N, hd, -7);

    let maxY = -1e9;
    const consider = (p, r) => { if (p[1] + r > maxY) maxY = p[1] + r; };
    consider(P.anF, b.shinR * 0.6); consider(P.anB, b.shinR * 0.6); consider(P.toF, 2); consider(P.toB, 2);
    consider(P.knF, b.thighR); consider(P.knB, b.thighR); consider(headC, 6);
    for (const p of tp) consider(p, 0.5);
    const ox = this.ox, oy = this.oy - maxY - (pose.lift || 0);
    const S = (p) => [p[0] + ox, p[1] + oy];
    for (const k in P) P[k] = S(P[k]);
    const tps = tp.map(S);

    // --- gambar (urut dari belakang ke depan) ---
    const dk = 0.74;
    if (wingBones) {
      const wc = this.cols(pal.wing || '#1a1420'), wc2 = this.cols(pal.wing || '#1a1420', 0.8);
      const wr = S(rp(wingBones.root)), w1 = S(rp(wingBones.p1)), w2 = S(rp(wingBones.p2));
      for (const [a, c, fr] of wingBones.feathers) this.capsule(S(rp(a)), S(rp(c)), fr, wc2);
      this.capsule(wr, w1, 3.2, wc);
      this.capsule(w1, w2, 2.6, wc);
    }
    const sleeve = pal.sleeve || pal.top, forearm = pal.forearm || sleeve, glove = pal.glove || pal.skin;
    const shoe = pal.shoe || pal.skin;
    const pantsTrim = pal.pantsTrim ? [b.trimAt || 0.62, this.cols(pal.pantsTrim, dk)] : null;
    const pantsTrimF = pal.pantsTrim ? [b.trimAt || 0.62, this.cols(pal.pantsTrim)] : null;

    // lengan belakang
    this.capsule(P.shB, P.elB, b.armR, this.cols(sleeve, dk));
    this.capsule(P.elB, P.wrB, b.farmR, this.cols(forearm, dk));
    this.capsule(P.wrB, P.fiB, b.fistR, this.cols(glove, dk));
    // kaki belakang
    this.capsule(P.hipB, P.knB, b.thighR, this.cols(pal.pants, dk));
    this.capsule(P.knB, P.anB, b.shinR, this.cols(pal.pants, dk), pantsTrim);
    this.capsule(P.anB, P.toB, 2.4, this.cols(shoe, dk));
    // torso
    const keyCols = {};
    const colorOf = (key) => keyCols[key] || (keyCols[key] = this.cols(pal[key] || pal.top));
    const tfn = def.torsoColor;
    this.torso(tps, P.Hp, fwR, upR, (f, v) => colorOf(tfn(f, v, T)));
    // kaki depan
    this.capsule(P.hipF, P.knF, b.thighR, this.cols(pal.pants));
    this.capsule(P.knF, P.anF, b.shinR, this.cols(pal.pants), pantsTrimF);
    this.capsule(P.anF, P.toF, 2.4, this.cols(shoe));
    // kepala
    const hm = this.headMap(def, pal);
    const simple = Math.abs(pose.rot || 0) < 1 && !pose.flip;
    this.head(def.head, hm, P.N, hf, hd, simple);
    // lengan depan
    this.capsule(P.shF, P.elF, b.armR, this.cols(sleeve));
    this.capsule(P.elF, P.wrF, b.farmR, this.cols(forearm));
    this.capsule(P.wrF, P.fiF, b.fistR, this.cols(glove));

    this.outline(opts.outline || OUTLINE_COL);
    this.ctx.putImageData(this.img, 0, 0);
    this.joints = P;
    return this.canvas;
  }

  headMap(def, pal) {
    if (this.flash) {
      const w = pack('#ffffff');
      return { h: w, H: w, s: w, S: w, e: w, r: w, w: w, m: w, c: w, k: pack('#c8a8a8'), b: w, R: w, g: w, x: w };
    }
    const key = '__head|' + (pal.name || '') + def.id;
    let m = this.cache.get(key);
    if (!m) {
      m = {
        h: pack(pal.hair), H: pack(shade(pal.hair, 0.65)),
        s: pack(pal.skin), S: pack(shade(pal.skin, 0.72)),
        e: pack('#1a0e10'), r: pack(pal.eye || '#ff2030'), w: pack(pal.whisker || '#e8e8f0'),
        m: pack(shade(pal.skin, 0.45)), c: pack(pal.horn || '#e8e0cc'), k: pack(OUTLINE_COL),
        b: pack(shade(pal.hair, 0.4)), R: pack(pal.band || '#c01818'), g: pack('#ffffff'), x: pack(pal.scar || shade(pal.skin, 0.55)),
      };
      this.cache.set(key, m);
    }
    return m;
  }
}
