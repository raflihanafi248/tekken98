# TEKKEN 98 — Pixel Fighter (Fan Game)

Game pertarungan 2D bergaya **pixel art** dengan gameplay ala **Street Fighter**, terinspirasi dari **Tekken 8**.
Dibuat murni dengan **HTML5 Canvas + JavaScript**: tanpa engine, tanpa build, tanpa file gambar atau suara.
Semua grafis digambar secara prosedural dan semua audio disintesis dengan WebAudio.

> ⚠️ Ini **fan game tidak resmi** untuk keperluan pribadi dan belajar. Tekken, Jin Kazama, Kazuya Mishima, Heihachi Mishima,
> dan Devil Jin adalah merek dagang/hak cipta © Bandai Namco Entertainment. Jangan dijual atau dipublikasikan secara komersial.

## Cara main

1. Buka `index.html` langsung di browser (Chrome, Edge, atau Firefox). Klik dua kali saja, tidak perlu server.
2. Atau jalankan server lokal: `npx serve .` lalu buka alamat yang muncul.
3. Bisa juga dipasang di **GitHub Pages** (Settings → Pages → branch ini → root).

## Kontrol

| Aksi | Pemain 1 | Pemain 2 |
|---|---|---|
| Gerak / lompat / jongkok | `W A S D` | Tombol panah |
| Light Punch (LP) | `F` | `K` / Numpad 4 |
| Heavy Punch (HP) | `G` | `L` / Numpad 5 |
| Light Kick (LK) | `V` | `,` / Numpad 1 |
| Heavy Kick (HK) | `B` | `.` / Numpad 2 |
| Lemparan | `F + V` | `K + ,` |
| Super (meter penuh) | `F + G` | `K + L` |
| Jeda | `Esc` / `Enter` | `Esc` / `Enter` |

* Di mode 1 pemain, **kedua set tombol** bisa dipakai.
* **Gamepad** didukung: X = LP, Y = HP, A = LK, B = HK, LB = lempar, RB = super, Start = jeda.
* **Blok**: tahan arah menjauhi lawan. Serangan **bawah** harus diblok sambil jongkok, serangan **lompat** harus diblok sambil berdiri.
* **Dash**: tekan →→ atau ←← dengan cepat.

## Jurus spesial (semua karakter)

| Input | Jenis |
|---|---|
| `↓ ↘ → + P` | Proyektil (api / laser / bola petir) |
| `→ ↓ ↘ + P` | Uppercut (kebal di awal, melontarkan lawan) |
| `↓ ↙ ← + K` | Jurus maju (tornado kick / hellsweep / demon scissors / dive) |
| `↓ → ↓ → + P` atau `LP + HP` | **Super** (butuh meter penuh) |

LP/LK menghasilkan versi ringan, sedangkan HP/HK menghasilkan versi kuat.

## Karakter

| Karakter | Gaya | Proyektil | Uppercut | Jurus maju | Super |
|---|---|---|---|---|---|
| **Jin Kazama** | Karate Kazama, cepat | Devil Flame | Rising Flame | Tornado Kick | Shining Fist |
| **Kazuya Mishima** | Karate Mishima | Devil Laser (tinggi, bisa dihindari dengan jongkok) | E.W.G.F. | Hellsweep (bawah) | Devil Blaster |
| **Heihachi Mishima** | Karate Mishima, kuat & tebal | Thunder Ball | Demon Uppercut | Demon Scissors (overhead) | Thunder God Fist |
| **Devil Jin** *(rahasia)* | Gen Iblis, bos | Eye Laser | Devil Upper | Devil Dive | Devil Blaster |

**Devil Jin** terbuka setelah menamatkan mode Arcade.

## Sistem pertarungan

* **Combo & cancel**: normal ringan bisa disambung (chain) ke normal lain; normal berat bisa di-cancel ke jurus spesial; spesial bisa di-cancel ke super.
* **Juggle**: lawan yang terlempar ke udara masih bisa dipukul.
* **Counter hit**: memukul lawan yang sedang memulai serangan memberi damage dan hitstun ekstra.
* **Rage** (ala Tekken): saat HP ≤ 25%, karakter bersinar merah, damage naik 12%, dan bisa memakai **Rage Art** (super gratis) satu kali.
* **Throw tech**: tekan `LP + LK` saat dilempar untuk melepaskan diri.
* Proyektil yang bertabrakan saling meniadakan; beam super menembus proyektil biasa.

## Mode

* **Arcade**: lawan semua petarung, termasuk "bayangan" dirimu, lalu bos terakhir di *Devil's Abyss*. Tersedia layar continue dan ending per karakter.
* **VS CPU**: satu pertarungan melawan komputer. Pilih arena sendiri.
* **VS Pemain 2**: dua pemain di satu keyboard atau dua gamepad.
* **Latihan**: dummy bisa diatur (berdiri, jongkok, lompat, blok semua, CPU), meter penuh, tampilan kotak hit/hurt,
  riwayat input, damage combo, dan keuntungan frame.
* **Pengaturan**: volume efek/musik, suara announcer, kesulitan CPU, waktu ronde, jumlah ronde.

## Struktur kode

```
index.html        halaman & urutan script
js/util.js        konstanta, matematika, warna, penyimpanan & pengaturan
js/font.js        font bitmap 5x7 + renderer teks pixel
js/input.js       keyboard/gamepad, pembaca gerakan (↓↘→ dll), controller
js/audio.js       efek suara & musik chiptune (WebAudio), announcer
js/painter.js     renderer karakter pixel art prosedural (kerangka → kapsul → outline)
js/poses.js       pustaka pose & animasi
js/characters.js  data karakter: kepala, palet, jurus, frame data
js/fighter.js     state machine petarung, hitbox/hurtbox, kena/blok
js/effects.js     percikan, partikel, gambar proyektil
js/stages.js      3 arena dengan parallax & partikel
js/ai.js          AI CPU (6 level) & dummy latihan
js/match.js       ronde, waktu, tabrakan, kamera, HUD, menu jeda
js/scenes.js      layar judul, menu, pilih karakter, VS, arcade, hasil, opsi
js/main.js        game loop 60 FPS tetap
```

### Menambah karakter baru

1. Tambahkan sprite kepala ASCII di `HEADS` (`js/characters.js`).
2. Tambahkan jurus spesial di `SPECIALS` (qcf, dp, qcb, super).
3. Tambahkan entri di `CHARACTERS` (tubuh, palet warna, pose khusus, kutipan menang, ending) lalu masukkan id-nya ke `ROSTER`.

Mode uji cepat CPU vs CPU: `index.html?demo=1&p1=jin&p2=kazuya&stage=abyss`
