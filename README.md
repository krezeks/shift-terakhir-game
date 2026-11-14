# Shift Terakhir — Horor Chat Interaktif

Game horor interaktif berbahasa Indonesia dalam format chat grup kantor. Versi live: [shift-terakhir-game.pangeranet.workers.dev](https://shift-terakhir-game.pangeranet.workers.dev).

## Cerita

- **Bab 1 · Shift Terakhir** — Shift malam di lantai 12. Anggota grup yang sudah tap out sejak 22:10 ternyata masih mengetik. 3 ronde pilihan, 5 ending.
- **Bab 2 · Arsip** — Seminggu kemudian. HR memintamu mengekspor arsip grup sebelum migrasi sistem 00:00 — dan arsipnya berubah selagi dibaca: pesan terhapus, pesan diedit, foto CCTV, dan pesan suara. 4 ronde pilihan, 4 ending, dengan sistem **trust (0–10)** yang ikut menentukan ending.

## Fitur

- **Ketik bebas** — selain tombol balasan, pemain bisa mengetik pesan apa pun di titik keputusan. Ketikan yang cocok dengan pilihan akan memajukan cerita; pertanyaan hipotetis tidak dihitung sebagai keputusan.
- **Balasan AI (Gemini), opsional** — ketikan bebas dijawab in-character oleh Gemini lewat route `/api/gemini` di `worker.js`. Prompt dipagari: AI tidak boleh mengubah lokasi, memutuskan ending, atau membunuh karakter. API key disimpan sebagai secret `GEMINI_API_KEY` di dashboard Worker — tidak ada key di repo ini. Tanpa key, game otomatis memakai **balasan lokal** (dialog tulisan tangan berbasis kata kunci), jadi game tetap bisa dimainkan penuh.
- **Resume otomatis** — progres tersimpan di browser pada setiap awal adegan; tutup dan buka lagi untuk melanjutkan dari terakhir. Ada opsi mengulang bab dari awal.
- **Pesan foto & pesan suara** di dalam chat, pesan yang terhapus/berubah di depan mata, indikator mengetik per pengirim, suara WebAudio tanpa file audio, getar di HP, dan menu **Setelan** (indikator mengetik, balasan AI, kecepatan teks).
- Koleksi ending tersimpan per browser.

## Mulai mengedit

1. Clone repo ini: `git clone https://github.com/krezeks/shift-terakhir-game.git`
2. Buka `index.html` langsung di browser untuk mencoba game (mode lokal memakai balasan lokal; route AI hanya aktif di deployment).
3. Edit `index.html` untuk mengubah cerita, dialog, tampilan, atau logika game.

Tidak perlu instalasi dependency atau proses build.

## Struktur

- `index.html` — seluruh game (HTML, CSS, dan JavaScript, satu file; foto cerita tertanam sebagai data URI).
- `worker.js` — Cloudflare Worker: melayani aset statis + proxy `/api/gemini`.
- `wrangler.jsonc` — konfigurasi deploy (nama Worker, entry `worker.js`, binding aset).

## Catatan deployment

Repo ini terhubung ke Cloudflare Workers Builds (Worker "shift-terakhir-game" di akun Pangeranet): setiap push ke branch `main` otomatis men-deploy versi terbaru ke URL live di atas. Untuk mengaktifkan balasan AI, tambahkan secret `GEMINI_API_KEY` di dashboard Cloudflare (Worker → Settings → Variables and Secrets).

URL lama `shift-terakhir-game.classic-guitar.workers.dev` berasal dari deployment sementara tanpa login; akunnya tidak bisa diakses lagi dan isinya membeku di versi lama — URL itu tidak lagi diperbarui.
