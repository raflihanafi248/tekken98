'use strict';
// ---------------------------------------------------------------------------
// Audio: efek suara & musik chiptune disintesis dengan WebAudio (tanpa file)
// ---------------------------------------------------------------------------
const NOTE_IDX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function noteFreq(n) {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Lagu: tiap track berupa token per langkah 1/16. '.' = diam, '-' = tahan
const SONGS = {
  title: {
    bpm: 96,
    tracks: [
      { wave: 'sawtooth', vol: 0.05, notes:
        'D2 - - - - - - - - - - - - - - - A#1 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - A1 - C2 -' },
      { wave: 'triangle', vol: 0.12, notes:
        'D4 - - - F4 - - - A4 - - - G4 - F4 - E4 - - - - - - - D4 - - - C4 - - - D4 - - - F4 - - - A4 - - - C5 - A#4 - A4 - - - - - - - G4 - - - E4 - - - ' },
    ],
    drums: 'k...............k.......s.......k...............k.......s...s.s.',
  },
  select: {
    bpm: 132,
    tracks: [
      { wave: 'square', vol: 0.045, notes:
        'C3 . C3 C4 . C3 G2 . A#2 . A#2 A#3 . A#2 F2 . G#2 . G#2 G#3 . G#2 D#2 . G2 . G2 G3 . G2 D3 G2' },
      { wave: 'square', vol: 0.05, notes:
        'G4 - - . D#4 - . F4 - . G4 - A#4 - G4 - F4 - - . D#4 - . C4 - - - - . D4 - D#4 - - . D4 - . C4 - D4 - B3 - - - . . . .' },
    ],
    drums: 'k.h.s.h.k.h.s.hh',
  },
  dojo: {
    bpm: 150,
    tracks: [
      { wave: 'sawtooth', vol: 0.045, notes:
        'A2 . A3 . A2 . A3 . A2 . A3 . G2 . G3 . F2 . F3 . F2 . F3 . G2 . G3 . G2 . E3 . A2 . A3 . A2 . A3 . A2 . A3 . C3 . C4 . D3 . D4 . D3 . D4 . E3 . E4 . E3 . G#3 .' },
      { wave: 'square', vol: 0.05, notes:
        'A4 - - - C5 - E5 - D5 - C5 - B4 - G4 - A4 - - - - - - - . . E4 - G4 - B4 - C5 - - - B4 - A4 - E5 - - - D5 - C5 - D5 - - - E5 - - - G#4 - - - B4 - - - ' },
    ],
    drums: 'k.h.s.h.k.k.s.h.',
  },
  temple: {
    bpm: 160,
    tracks: [
      { wave: 'sawtooth', vol: 0.045, notes:
        'D2 D2 D3 D2 . D2 D3 D2 C2 C2 C3 C2 . C2 C3 C2 A#1 A#1 A#2 A#1 . A#1 A#2 A#1 A1 A1 A2 A1 C2 C3 C#2 C#3' },
      { wave: 'square', vol: 0.045, notes:
        'D5 - A4 - D5 - E5 - F5 - E5 - D5 - C5 - - - A4 - - - G4 - A4 - C5 - - - F5 - E5 - D5 - A#4 - - - A4 - - - G4 - - - A4 - - - C#5 - E5 -' },
    ],
    drums: 'k.hhs.h.k.hks.hh',
  },
  boss: {
    bpm: 170,
    tracks: [
      { wave: 'sawtooth', vol: 0.05, notes:
        'E2 E2 E3 E2 E2 E3 E2 D3 E2 E2 E3 E2 G2 G3 F#2 F#3 C2 C2 C3 C2 C2 C3 C2 B2 D2 D2 D3 D2 D#2 D#3 B1 B2' },
      { wave: 'square', vol: 0.05, notes:
        'E5 - - B4 - - E5 - F#5 - G5 - F#5 - E5 - D#5 - - - B4 - - - . . . . . . . . C5 - - G4 - - C5 - D5 - E5 - D5 - C5 - B4 - - - F#4 - - - D#5 - - - B4 - - - ' },
    ],
    drums: 'k.hks.hkk.hks.hs',
  },
  victory: {
    bpm: 140, once: true,
    tracks: [
      { wave: 'square', vol: 0.06, notes: 'C5 . E5 . G5 . C6 - - - G5 . C6 - - - - - - - - - - - . . . . . . . .' },
      { wave: 'triangle', vol: 0.12, notes: 'C3 . . . E3 . . . G3 . . . C4 - - - - - - - - - - - . . . . . . . .' },
    ],
    drums: 'k...k...k...s...k...............',
  },
};

const Sound = {
  ctx: null, master: null, sfxGain: null, musicGain: null, noise: null,
  song: null, songStep: 0, nextTime: 0, timer: null, currentSong: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
      this.applyVolume();
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pendingSong) { const s = this.pendingSong; this.pendingSong = null; this.playSong(s); }
    } catch (e) { this.ctx = null; }
  },

  applyVolume() {
    if (!this.ctx) return;
    this.sfxGain.gain.value = (Settings.sfx / 10) * 0.9;
    this.musicGain.gain.value = (Settings.music / 10) * 0.8;
  },

  tone(freq, dur, type = 'square', vol = 0.2, slideTo = 0, delay = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noiseHit(dur, vol = 0.3, freq = 2000, type = 'lowpass', slideTo = 0, delay = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.playbackRate.value = 0.5 + Math.random();
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'cursor': this.tone(880, 0.05, 'square', 0.08); break;
      case 'select': this.tone(660, 0.06, 'square', 0.1); this.tone(1320, 0.1, 'square', 0.1, 0, 0.05); break;
      case 'back': this.tone(440, 0.08, 'square', 0.08, 220); break;
      case 'whiffL': this.noiseHit(0.08, 0.12, 3000, 'bandpass', 900); break;
      case 'whiffH': this.noiseHit(0.16, 0.18, 2200, 'bandpass', 500); break;
      case 'hitL':
        this.noiseHit(0.09, 0.45, 1800, 'lowpass', 400);
        this.tone(180, 0.08, 'square', 0.18, 60); break;
      case 'hitH':
        this.noiseHit(0.2, 0.6, 2500, 'lowpass', 200);
        this.tone(140, 0.18, 'sawtooth', 0.25, 40); break;
      case 'block':
        this.noiseHit(0.06, 0.3, 5000, 'highpass');
        this.tone(1200, 0.05, 'square', 0.06, 800); break;
      case 'counter': this.tone(1500, 0.12, 'square', 0.12, 2200); break;
      case 'fireball':
        this.noiseHit(0.5, 0.3, 600, 'lowpass', 3000);
        this.tone(200, 0.4, 'sawtooth', 0.12, 600); break;
      case 'laser': this.tone(1800, 0.3, 'sawtooth', 0.1, 300); this.tone(2400, 0.25, 'square', 0.05, 400); break;
      case 'thunder':
        this.noiseHit(0.5, 0.5, 6000, 'highpass', 800);
        this.tone(90, 0.4, 'sawtooth', 0.2, 40); break;
      case 'flame': this.noiseHit(0.45, 0.4, 1200, 'lowpass', 300); break;
      case 'rise': this.tone(300, 0.25, 'square', 0.1, 1200); this.noiseHit(0.25, 0.2, 2000, 'bandpass', 4000); break;
      case 'super':
        this.tone(220, 0.6, 'sawtooth', 0.18, 880);
        this.tone(330, 0.6, 'square', 0.1, 1320);
        this.noiseHit(0.7, 0.3, 300, 'lowpass', 6000); break;
      case 'beam': this.noiseHit(0.9, 0.4, 900, 'bandpass', 300); this.tone(110, 0.9, 'sawtooth', 0.18, 55); break;
      case 'ko':
        this.tone(160, 1.2, 'sawtooth', 0.3, 30);
        this.noiseHit(1.0, 0.6, 800, 'lowpass', 60); break;
      case 'land': this.noiseHit(0.08, 0.2, 400, 'lowpass'); break;
      case 'thud': this.noiseHit(0.25, 0.45, 300, 'lowpass', 60); this.tone(70, 0.2, 'sine', 0.35, 35); break;
      case 'jump': this.noiseHit(0.06, 0.08, 1200, 'bandpass'); break;
      case 'throw': this.noiseHit(0.2, 0.3, 900, 'bandpass', 300); break;
      case 'gong':
        this.tone(196, 1.6, 'triangle', 0.3, 190);
        this.tone(392, 1.2, 'sine', 0.12, 380);
        this.tone(588, 0.9, 'sine', 0.06); break;
      case 'clash': this.tone(2000, 0.2, 'square', 0.1, 600); this.noiseHit(0.2, 0.3, 4000, 'highpass'); break;
      case 'tick': this.tone(1000, 0.03, 'square', 0.05); break;
    }
  },

  // --- Musik ---
  playSong(id) {
    if (this.currentSong === id) return;
    this.stopSong();
    this.currentSong = id;
    if (!this.ctx) { this.pendingSong = id; return; }
    const s = SONGS[id];
    if (!s) return;
    this.song = {
      def: s,
      tracks: s.tracks.map((t) => ({ ...t, tok: t.notes.trim().split(/\s+/) })),
      drums: s.drums.split(''),
      len: Math.max(...s.tracks.map((t) => t.notes.trim().split(/\s+/).length)),
    };
    this.songStep = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  },

  stopSong() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.song = null; this.currentSong = null; this.pendingSong = null;
  },

  schedule() {
    if (!this.song || !this.ctx) return;
    const s = this.song;
    const stepDur = 60 / s.def.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const st = this.songStep;
      if (s.def.once && st >= s.len) { this.stopSong(); return; }
      for (const tr of s.tracks) {
        const tok = tr.tok[st % tr.tok.length];
        if (tok && tok !== '.' && tok !== '-') {
          let n = 1;
          while (tr.tok[(st + n) % tr.tok.length] === '-' && n < 16) n++;
          this.musicNote(noteFreq(tok), stepDur * n * 0.95, tr.wave, tr.vol, this.nextTime);
        }
      }
      const d = s.drums[st % s.drums.length];
      if (d === 'k') this.drum('k', this.nextTime);
      else if (d === 's') this.drum('s', this.nextTime);
      else if (d === 'h') this.drum('h', this.nextTime);
      this.nextTime += stepDur;
      this.songStep++;
    }
  },

  musicNote(freq, dur, wave, vol, t) {
    if (!freq) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  drum(type, t) {
    const ctx = this.ctx;
    if (type === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 0.16);
    } else {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type === 's' ? 'bandpass' : 'highpass';
      f.frequency.value = type === 's' ? 1800 : 7000;
      const g = ctx.createGain();
      const dur = type === 's' ? 0.12 : 0.04;
      g.gain.setValueAtTime(type === 's' ? 0.3 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.musicGain);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.01);
    }
  },

  // Announcer memakai speech synthesis browser (jika tersedia)
  say(text) {
    if (!Settings.voice) return;
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.pitch = 0.4; u.rate = 0.85; u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch (e) { /* abaikan */ }
  },
};
