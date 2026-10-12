'use strict';
// ---------------------------------------------------------------------------
// Arena: latar pixel art prosedural dengan parallax & partikel
// ---------------------------------------------------------------------------
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const FLOOR_TOP = 166;
const FAR_K = 0.3, MID_K = 0.65;

function ditherFill(g, x0, y0, w, h, colorAt) {
  const img = g.getImageData(x0, y0, w, h);
  const d = new Uint32Array(img.data.buffer);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = colorAt(x0 + x, y0 + y, (BAYER[(y0 + y) & 3][(x0 + x) & 3] + 0.5) / 16);
      if (c) d[y * w + x] = pack(c);
    }
  }
  g.putImageData(img, x0, y0);
}
function gradientPick(cols, t, th) {
  const f = clamp(t, 0, 0.9999) * (cols.length - 1);
  const i = Math.floor(f);
  return (f - i) > th ? cols[i + 1] : cols[i];
}
function vGradient(g, x, y, w, h, cols) {
  ditherFill(g, x, y, w, h, (px, py, th) => gradientPick(cols, (py - y) / h, th));
}
function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

function drawFlame(ctx, x, y, s, frame, seed) {
  const cols = ['#a01810', '#ff5020', '#ffb040', '#ffef9a'];
  for (let i = 0; i < 4; i++) {
    const k = 1 - i * 0.24;
    const wob = Math.sin((frame + seed * 13) * 0.3 + i) * 1.5;
    const fl = ((frame + seed) >> 2) % 2;
    pxCircle(ctx, x + wob, y - s * 0.35 * i, s * 0.5 * k + fl, cols[i]);
    pxCircle(ctx, x + wob * 0.5, y - s * 0.35 * i - s * 0.5 * k, s * 0.3 * k, cols[i]);
  }
}

function drawChainLink(g, cx, cy, ang, s, c1, c2) {
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const lx = Math.cos(a) * s, ly = Math.sin(a) * s * 0.55;
    const x = cx + lx * Math.cos(ang) - ly * Math.sin(ang);
    const y = cy + lx * Math.sin(ang) + ly * Math.cos(ang);
    rect(g, x - 1, y - 1, 3, 3, i < 20 ? c2 : c1);
  }
}

const STAGES = {
  dojo: {
    name: 'MISHIMA DOJO', song: 'dojo',
    build(L, rng) {
      // langit malam
      vGradient(L.sky.g, 0, 0, W, FLOOR_TOP, ['#070818', '#0d1030', '#1c1640', '#3a1e48', '#5a2848']);
      for (let i = 0; i < 70; i++) rect(L.sky.g, rng() * W, rng() * 110, 1, 1, rng() < 0.3 ? '#a0a8ff' : '#ffffff');
      ditherFill(L.sky.g, 260, 4, 80, 80, (x, y, th) => {
        const d = Math.hypot(x - 300, y - 44);
        if (d < 19) return d > 16 && th < 0.5 ? '#d8cca8' : ((x * 7 + y * 3) % 23 === 0 ? '#d8cca8' : '#f2ead0');
        if (d < 30) return th < (30 - d) / 22 ? '#2c2850' : null;
        return null;
      });
      rect(L.sky.g, 272, 50, 60, 2, '#1a1838'); rect(L.sky.g, 286, 56, 40, 2, '#1a1838');
      // pegunungan jauh
      const fg = L.far.g, fw = L.far.c.width;
      let h1 = 70, h2 = 40;
      for (let x = 0; x < fw; x++) {
        h1 += (rng() - 0.5) * 3; h1 = clamp(h1 + Math.sin(x * 0.02) * 0.6, 40, 95);
        h2 += (rng() - 0.5) * 2; h2 = clamp(h2 + Math.cos(x * 0.03) * 0.5, 20, 55);
        rect(fg, x, FLOOR_TOP - h1, 1, h1, '#151230');
        rect(fg, x, FLOOR_TOP - h2, 1, h2, '#1e1838');
      }
      // pagoda siluet
      for (let i = 0; i < 4; i++) rect(fg, 140 - 18 + i * 3, 70 + i * 14, 36 - i * 6 + 12, 4, '#100d22');
      rect(fg, 136, 74, 8, 60, '#100d22');
      // bangunan dojo
      const mg = L.mid.g, mw = L.mid.c.width;
      rect(mg, 0, 86, mw, FLOOR_TOP - 86, '#2a1a14');
      for (let x = 0; x < mw; x += 40) {
        const lit = rng() < 0.75;
        rect(mg, x + 5, 100, 34, 56, lit ? '#e0b878' : '#5a3a24');
        for (let gx = x + 5; gx < x + 39; gx += 8) rect(mg, gx, 100, 1, 56, lit ? '#a8784a' : '#432a1a');
        for (let gy = 100; gy < 156; gy += 9) rect(mg, x + 5, gy, 34, 1, lit ? '#a8784a' : '#432a1a');
        rect(mg, x, 92, 5, FLOOR_TOP - 92, '#3a2216'); rect(mg, x + 1, 92, 1, FLOOR_TOP - 92, '#5a3826');
      }
      rect(mg, 0, 96, mw, 4, '#3a2216'); rect(mg, 0, 156, mw, 4, '#3a2216');
      // atap
      rect(mg, 0, 66, mw, 22, '#18121a');
      for (let x = 0; x < mw; x += 6) rect(mg, x, 66, 2, 22, '#241c26');
      rect(mg, 0, 86, mw, 3, '#0e0a10'); rect(mg, 0, 64, mw, 3, '#2e2430');
      // beranda
      rect(mg, 0, 158, mw, FLOOR_TOP - 158, '#4a2e1c');
      rect(mg, 0, 158, mw, 1, '#6a4428');
      // spanduk merah
      for (const bx of [mw * 0.3, mw * 0.7]) {
        rect(mg, bx - 9, 92, 18, 46, '#8a1418'); rect(mg, bx - 9, 92, 18, 2, '#c8a040');
        rect(mg, bx - 4, 104, 8, 2, '#f0e0c0'); rect(mg, bx - 1, 100, 2, 22, '#f0e0c0');
        rect(mg, bx - 5, 114, 10, 2, '#f0e0c0'); rect(mg, bx - 4, 124, 3, 3, '#f0e0c0'); rect(mg, bx + 1, 124, 3, 3, '#f0e0c0');
      }
      L.lanterns = [];
      for (let x = 60; x < mw; x += 120) L.lanterns.push(x);
    },
    floor: { base: '#5a3a24', line: '#432a1a', seam: '#3a2216', shine: '#7a5232' },
    drawMid(ctx, L, ox, frame) {
      for (const lx of L.lanterns) {
        const x = Math.round(lx - ox), fl = (frame >> 3) % 2;
        rect(ctx, x, 89, 1, 6, '#1a1010');
        pxCircle(ctx, x, 101, 9 + fl, 'rgba(255,120,40,0.18)');
        rect(ctx, x - 5, 95, 11, 13, '#c82020'); rect(ctx, x - 4, 96, 9, 11, '#e84030');
        rect(ctx, x - 5, 95, 11, 1, '#2a1010'); rect(ctx, x - 5, 107, 11, 1, '#2a1010');
        rect(ctx, x - 1, 98, 3, 6, '#ffd070');
      }
    },
    particles(st, frame) {
      if (frame % 40 === 0) st.add({ x: rand(0, STAGE_W), y: rand(-10, 0), vx: rand(-0.2, 0.2), vy: 0.35, life: 600, color: '#ffb0c8', size: 1, sway: 0.4, layer: 0 });
    },
  },

  temple: {
    name: 'BURNING TEMPLE', song: 'temple',
    build(L, rng) {
      vGradient(L.sky.g, 0, 0, W, FLOOR_TOP, ['#12030a', '#3a0810', '#7a1a10', '#c2440e', '#f08a2a']);
      ditherFill(L.sky.g, 0, 0, W, 90, (x, y, th) => {
        const n = Math.sin(x * 0.05 + y * 0.02) + Math.sin(x * 0.013 - y * 0.07) * 1.3 + Math.sin(x * 0.11) * 0.3;
        return n > 0.9 - y * 0.006 && th < 0.6 ? '#1e0608' : null;
      });
      const fg = L.far.g, fw = L.far.c.width;
      let x = 0;
      while (x < fw) {
        const bw = 14 + Math.floor(rng() * 26), bh = 30 + Math.floor(rng() * 60);
        rect(fg, x, FLOOR_TOP - bh, bw, bh, '#2a0806');
        if (rng() < 0.35) { // atap pagoda
          rect(fg, x - 4, FLOOR_TOP - bh - 3, bw + 8, 4, '#2a0806');
          rect(fg, x + bw / 2 - 1, FLOOR_TOP - bh - 10, 2, 8, '#2a0806');
        }
        for (let wy = FLOOR_TOP - bh + 5; wy < FLOOR_TOP - 6; wy += 7) {
          for (let wx = x + 3; wx < x + bw - 3; wx += 5) if (rng() < 0.35) rect(fg, wx, wy, 2, 3, rng() < 0.5 ? '#ff9a3a' : '#ffcf6a');
        }
        x += bw + Math.floor(rng() * 6);
      }
      const mg = L.mid.g, mw = L.mid.c.width;
      const cx = mw / 2;
      // gerbang torii
      for (const px of [cx - 70, cx + 62]) { rect(mg, px, 72, 9, FLOOR_TOP - 72, '#a8201a'); rect(mg, px + 1, 72, 2, FLOOR_TOP - 72, '#d8402a'); rect(mg, px - 2, FLOOR_TOP - 10, 13, 10, '#1a0a0a'); }
      rect(mg, cx - 92, 62, 184, 7, '#1a0a0a'); rect(mg, cx - 88, 68, 176, 5, '#b82a1e'); rect(mg, cx - 78, 84, 156, 5, '#b82a1e');
      rect(mg, cx - 6, 72, 12, 12, '#1a0a0a');
      // lentera batu
      for (const lx of [40, 150, mw - 150, mw - 40]) {
        rect(mg, lx - 3, 140, 6, 26, '#5a5050'); rect(mg, lx - 9, 132, 18, 8, '#6a6060');
        rect(mg, lx - 6, 124, 12, 8, '#3a3030'); rect(mg, lx - 3, 126, 6, 4, '#ffb040'); rect(mg, lx - 11, 120, 22, 4, '#6a6060');
      }
      L.fires = [];
      for (let i = 0; i < 6; i++) L.fires.push([rng() * mw, FLOOR_TOP - 2 - rng() * 8, 6 + rng() * 6]);
    },
    floor: { base: '#4a3a38', line: '#2e2424', seam: '#2e2424', shine: '#7a4a30' },
    drawMid(ctx, L, ox, frame) {
      L.fires.forEach(([fx, fy, s], i) => drawFlame(ctx, fx - ox, fy, s, frame, i));
    },
    particles(st, frame) {
      if (frame % 3 === 0) st.add({ x: rand(0, STAGE_W), y: rand(0, 20), vx: rand(-0.3, 0.5), vy: rand(0.4, 1.1), life: randi(100, 200), color: choice(['#ff9a3a', '#ffcf6a', '#ff5020']), size: chance(0.2) ? 2 : 1, sway: 0.3, layer: chance(0.3) ? 1 : 0, up: true });
    },
  },

  abyss: {
    name: "DEVIL'S ABYSS", song: 'boss',
    build(L, rng) {
      const cols = ['#2a3a58', '#1c2840', '#121a2c', '#0b101e', '#05070e'];
      ditherFill(L.sky.g, 0, 0, W, FLOOR_TOP, (x, y, th) => gradientPick(cols, Math.hypot((x - W / 2) * 0.8, y - 80) / 220, th));
      for (let i = 0; i < 30; i++) rect(L.sky.g, rng() * W, rng() * 150, 1, 1, rng() < 0.5 ? '#3a4a70' : '#6a2a3a');
      // rantai raksasa & batu melayang
      const fg = L.far.g, fw = L.far.c.width;
      const chains = [[30, -10, 0.9], [fw - 60, -10, 2.3], [fw * 0.45, -20, 1.4]];
      for (const [x0, y0, ang] of chains) {
        for (let i = 0; i < 9; i++) {
          drawChainLink(fg, x0 + Math.cos(ang) * i * 15, y0 + Math.sin(ang) * i * 15, ang + (i % 2) * 0.0, 9, '#5a2018', '#8a3a28');
        }
      }
      for (let i = 0; i < 6; i++) {
        const rx = rng() * fw, ry = 30 + rng() * 80, rs = 6 + rng() * 10;
        ditherFill(fg, Math.max(0, Math.floor(rx - rs)), Math.floor(ry - rs), Math.floor(rs * 2), Math.floor(rs * 1.6), (x, y, th) => {
          const d = Math.hypot((x - rx) / rs, (y - ry) / (rs * 0.6));
          return d < 1 ? (y < ry - rs * 0.3 ? '#1c2234' : '#0e101a') : null;
        });
      }
      // pilar batu runtuh
      const mg = L.mid.g, mw = L.mid.c.width;
      for (let i = 0; i < 5; i++) {
        const px = 30 + i * (mw - 60) / 4 + (rng() - 0.5) * 30, ph = 40 + rng() * 70, pw = 16 + rng() * 8;
        rect(mg, px, FLOOR_TOP - ph, pw, ph, '#1a1c2a'); rect(mg, px, FLOOR_TOP - ph, 3, ph, '#2c3046');
        rect(mg, px - 3, FLOOR_TOP - ph - 4, pw + 6, 5, '#22263a');
        for (let k = 0; k < 4; k++) rect(mg, px + 4 + rng() * (pw - 8), FLOOR_TOP - ph + rng() * ph, 1, 6, '#0a0b12');
        // potongan atas patah
        for (let k = 0; k < 5; k++) rect(mg, px + k * 4, FLOOR_TOP - ph - 4 - rng() * 8, 4, 4, '#22263a');
      }
      L.cracks = [];
      for (let i = 0; i < 14; i++) {
        const pts = [[rng() * STAGE_W, FLOOR_TOP + 2 + rng() * 40]];
        for (let k = 0; k < 4; k++) { const p = pts[pts.length - 1]; pts.push([p[0] + (rng() - 0.5) * 30, clamp(p[1] + (rng() - 0.3) * 8, FLOOR_TOP + 1, H - 1)]); }
        L.cracks.push(pts);
      }
    },
    floor: { base: '#16151e', line: '#0e0d14', seam: '#0e0d14', shine: '#22202e' },
    drawMid(ctx, L, ox, frame) {},
    drawFloorExtra(ctx, L, camX, frame) {
      const glow = 0.5 + Math.sin(frame * 0.05) * 0.3;
      for (const pts of L.cracks) {
        for (let i = 1; i < pts.length; i++) {
          pxLine(ctx, pts[i - 1][0] - camX, pts[i - 1][1], pts[i][0] - camX, pts[i][1], glow > 0.6 ? '#9a40e0' : '#6a20a0', 1);
        }
      }
    },
    particles(st, frame) {
      if (frame % 9 === 0) st.add({ x: rand(0, STAGE_W), y: rand(-12, -2), vx: rand(-0.3, 0.3), vy: rand(0.3, 0.6), life: 600, feather: true, sway: 0.5, layer: chance(0.25) ? 1 : 0, rot: rand(0, 6) });
      if (frame % 5 === 0) st.add({ x: rand(0, STAGE_W), y: H + 5, vx: rand(-0.2, 0.2), vy: -rand(0.2, 0.6), life: 300, color: choice(['#ff3030', '#ff7040', '#c01818']), size: 1, sway: 0.2, layer: 0, screenY: true });
      if (frame % 300 === 120) st.lightning = 12;
    },
  },
};
const STAGE_IDS = ['dojo', 'temple', 'abyss'];

class Stage {
  constructor(id) {
    this.id = id;
    this.def = STAGES[id];
    const rng = mulberry32(id.length * 977 + 13);
    const mk = (w) => { const c = makeCanvas(Math.ceil(w), H); return { c, g: c.getContext('2d') }; };
    this.L = {
      sky: mk(W),
      far: mk(W + (STAGE_W - W) * FAR_K + 2),
      mid: mk(W + (STAGE_W - W) * MID_K + 2),
    };
    this.def.build(this.L, rng);
    this.parts = [];
    this.lightning = 0;
  }

  add(p) { if (this.parts.length < 300) this.parts.push(Object.assign({ seed: Math.random() * 100 }, p)); }

  update(frame) {
    this.def.particles(this, frame);
    for (const p of this.parts) {
      p.x += p.vx + (p.sway ? Math.sin((frame + p.seed * 10) * 0.05) * p.sway : 0);
      p.y += p.vy; p.life--;
      if (p.rot !== undefined) p.rot += 0.05;
    }
    this.parts = this.parts.filter((p) => p.life > 0 && p.y > -20 && p.y < H + 20);
    if (this.lightning > 0) this.lightning--;
  }

  drawParticles(ctx, camX, layer) {
    for (const p of this.parts) {
      if (p.layer !== layer) continue;
      const sx = Math.round(p.x - camX * (layer ? 1.15 : 0.8));
      const sy = Math.round(p.up ? H - p.y - 50 : (p.screenY ? p.y : p.y));
      if (p.feather) {
        const a = Math.sin(p.rot) * 2;
        ctx.fillStyle = '#05040a';
        pxLine(ctx, sx - 3, sy - a, sx + 3, sy + a, '#05040a', layer ? 2 : 1);
        ctx.fillStyle = '#1e1a2a'; ctx.fillRect(sx, sy, 1, 1);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(sx, sy, p.size, p.size);
      }
    }
  }

  draw(ctx, camX, frame) {
    const L = this.L;
    ctx.drawImage(L.sky.c, 0, 0);
    if (this.lightning > 0) {
      ctx.fillStyle = `rgba(255,60,80,${0.08 * this.lightning / 12})`;
      ctx.fillRect(0, 0, W, FLOOR_TOP);
      if (this.lightning > 6) {
        const lx = 60 + ((frame * 37) % 260);
        pxBolt(ctx, lx, 0, lx + rand(-40, 40), 110, '#ff4060', 2, 12, 7);
        pxBolt(ctx, lx, 0, lx + rand(-40, 40), 90, '#ffd0e0', 1, 10, 6);
      }
    }
    ctx.drawImage(L.far.c, -Math.round(camX * FAR_K), 0);
    this.drawParticles(ctx, camX * 0.4, 0);
    const midOff = Math.round(camX * MID_K);
    ctx.drawImage(L.mid.c, -midOff, 0);
    this.def.drawMid(ctx, L, midOff, frame);
    this.drawFloor(ctx, camX, frame);
  }

  drawFloor(ctx, camX, frame) {
    const f = this.def.floor;
    rect(ctx, 0, FLOOR_TOP, W, H - FLOOR_TOP, f.base);
    rect(ctx, 0, FLOOR_TOP, W, 2, f.shine);
    // garis horizontal (perspektif)
    let y = FLOOR_TOP + 3, gap = 3;
    while (y < H) { rect(ctx, 0, y, W, 1, f.line); gap *= 1.35; y += Math.round(gap); }
    // sambungan vertikal mengerucut ke titik hilang
    const step = 48;
    const sTop = 0.62, sBot = 1.3;
    for (let wx = Math.floor((camX - W) / step) * step; wx < camX + W * 2; wx += step) {
      const rel = wx - camX - W / 2;
      const x0 = W / 2 + rel * sTop, x1 = W / 2 + rel * sBot;
      if (Math.max(x0, x1) < -2 || Math.min(x0, x1) > W + 2) continue;
      pxLine(ctx, x0, FLOOR_TOP + 2, x1, H, f.seam, 1);
    }
    if (this.def.drawFloorExtra) this.def.drawFloorExtra(ctx, this.L, camX, frame);
  }

  drawFront(ctx, camX) {
    this.drawParticles(ctx, camX, 1);
  }
}
