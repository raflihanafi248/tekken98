'use strict';
// ---------------------------------------------------------------------------
// Boot & game loop (logika tetap 60 FPS, render tiap frame layar)
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const Game = {
  scene: null, next: null, fadeT: 0, fadeDir: 0,
  go(factory) {
    if (this.fadeDir === 1) return;
    this.next = factory; this.fadeDir = 1; this.fadeT = 0;
  },
  update() {
    if (this.fadeDir === 1) {
      if (++this.fadeT >= 10) {
        this.scene = this.next(); this.next = null;
        this.fadeDir = -1;
      }
      return;
    }
    if (this.fadeDir === -1 && --this.fadeT <= 0) { this.fadeT = 0; this.fadeDir = 0; }
    if (this.scene) this.scene.update();
  },
  draw() {
    if (this.scene) this.scene.draw(ctx);
    if (this.fadeT > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fadeT / 10)})`;
      ctx.fillRect(0, 0, W, H);
    }
  },
};

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const scale = s >= 2 ? Math.floor(s) : s;
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();

Input.init();
Input.anyKeyHandlers.push(() => Sound.init());

const STEP = 1000 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(250, now - last);
  last = now;
  let n = 0;
  while (acc >= STEP && n < 5) {
    Input.update();
    Game.update();
    acc -= STEP; n++;
  }
  if (n === 5) acc = 0;
  Game.draw();
  requestAnimationFrame(frame);
}

// Mode uji: ?demo=1 langsung CPU vs CPU
const params = new URLSearchParams(location.search);
if (params.get('demo')) {
  const ids = ROSTER;
  const a = params.get('p1') || 'jin', b = params.get('p2') || 'kazuya';
  Game.scene = null;
  const m = new Match({
    mode: 'cpu', stage: params.get('stage') || 'dojo',
    p1: { cid: a, pal: 0, ctrl: new AIController(+(params.get('l1') || 3)) },
    p2: { cid: b, pal: a === b ? 1 : 0, ctrl: new AIController(+(params.get('l2') || 3)) },
    onEnd: () => {}, onQuit: () => {}, onRestart: () => {},
  });
  Game.scene = { update: () => m.update(), draw: (c) => m.draw(c), match: m };
} else {
  Game.scene = new TitleScene();
}
window.T98 = { Game, Input, Sound, CHARACTERS };
requestAnimationFrame(frame);
