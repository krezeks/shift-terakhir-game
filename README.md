# Shift Terakhir — Horor Chat Interaktif

Game horor interaktif berbahasa Indonesia. Versi live: [shift-terakhir-game.pangeranet.workers.dev](https://shift-terakhir-game.pangeranet.workers.dev).

## Mulai mengedit

1. Clone repo ini: `git clone https://github.com/krezeks/shift-terakhir-game.git`
2. Buka `index.html` langsung di browser untuk mencoba game.
3. Edit `index.html` untuk mengubah cerita, dialog, tampilan, atau logika game.

Tidak perlu instalasi dependency atau proses build untuk versi saat ini.

## Struktur

- `index.html` — seluruh source game saat ini (HTML, CSS, dan JavaScript).

## Catatan deployment

Repo ini terhubung ke Cloudflare Workers Builds (Worker "shift-terakhir-game" di akun Pangeranet): setiap push ke branch `main` otomatis men-deploy versi terbaru ke URL live di atas. Konfigurasi deploy ada di `wrangler.jsonc`.

URL lama `shift-terakhir-game.classic-guitar.workers.dev` berasal dari deployment sementara tanpa login; akunnya tidak bisa diakses lagi dan isinya membeku di versi lama — URL itu tidak lagi diperbarui.
