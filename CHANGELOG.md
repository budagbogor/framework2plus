# Changelog

Semua perubahan penting pada DevForge Studio dicatat di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.18] - 2026-04-25

### Fixed
- Mengembalikan struktur Live Builder ke layout berbasis class CSS yang lebih stabil agar panel statistik, summary, diagnostics, diff, dan queue tidak jatuh menjadi tampilan teks mentah.
- Menyelaraskan section builder utama ke grid dan card tetap supaya hasil render lebih mendekati tampilan builder awal.

## [2.0.17] - 2026-04-25

### Fixed
- Mempertegas styling kontainer Live Builder agar panel utama tidak tampil seperti teks mentah di atas background gelap.
- Menambahkan override visual pada section builder untuk mengembalikan kontras kartu, padding, dan scroll area yang lebih stabil.

## [2.0.16] - 2026-04-25

### Fixed
- Memperbaiki renderer Live Builder yang crash karena teks fallback artefak release memakai backtick di dalam template string JavaScript.
- Mengganti label artefak `.exe` dan `.msi` ke markup yang aman sehingga panel builder bisa dirender penuh kembali.

## [2.0.15] - 2026-04-24

### Fixed
- Menambahkan guard `try/catch` pada proses generate agar app tidak berhenti diam di layar loading saat `buildOutput()` atau render output gagal.
- Mengalihkan tab awal hasil generate ke `structure` supaya render tidak langsung bergantung pada panel builder yang lebih berat.
- Menambahkan fallback error panel untuk builder output di jalur modular dan legacy renderer agar kegagalan runtime tampil jelas, bukan terlihat seperti proses macet.

## [2.0.14] - 2026-04-24

### Fixed
- Menambahkan fallback AI web ke `Puter.js` agar versi web tetap bisa dipakai di hosting statis.
- Menambahkan deteksi ketersediaan `/api/ai-proxy` supaya kegagalan koneksi AI web memberi pesan yang akurat.
- Menyiapkan build web dan installer desktop terbaru dari patch koneksi AI web ini.

## [2.0.13] - 2026-04-23

### Fixed
- Memperkeras resolusi target event untuk action bridge global, tombol builder, dan tombol output akhir.
- Mengurangi kasus klik gagal saat `event.target` bukan `Element` biasa di browser atau webview.
- Menyiapkan build web dan installer desktop terbaru dari patch interaksi ini.

## [2.0.12] - 2026-04-18

### Fixed
- Menghapus `onclick` inline dari tombol `Mulai Pembangunan Otonom` agar tidak bentrok dengan action bridge global.
- Menangkap event tombol builder langsung di fase capture supaya klik tetap masuk ke `startAutonomousBuild()`.
- Membuat installer `.exe` baru dari fix terbaru tombol builder.

## [2.0.11] - 2026-04-18

### Fixed
- Menambahkan fallback event binding untuk tombol `Mulai Pembangunan Otonom` di halaman akhir hasil generate.
- Mengekspos action builder ke `window` agar klik tetap bekerja stabil di runtime webview / inline handler.
- Membuat installer `.exe` baru dari state terbaru proyek.

## [2.0.10] - 2026-04-18

### Fixed
- Perbaikan handler tombol `Mulai Pembangunan Otonom` agar bisa dipanggil stabil dari UI builder.
- Menambahkan validasi yang lebih jelas saat AI belum aktif atau blueprint project belum tersedia.
- Menyelaraskan metadata versi release di `package.json`, `package-lock.json`, `Cargo.toml`, dan `tauri.conf.json`.

---

## [2.0.0] — 2025

### ✨ Ditambahkan
- **Smart Recommendations** — Sistem rekomendasi otomatis yang membaca konteks project
- **Tech Card dengan Pros/Cons** — Setiap teknologi punya kelebihan, kekurangan, dan "cocok untuk siapa"
- **3 Badge Level** — ⭐ Terbaik / ✓ Bagus / ⚡ Advanced
- **Bahasa Indonesia penuh** — Semua penjelasan dalam bahasa yang mudah dipahami
- **Starter Code Python** — Template kode agent siap jalan (ADLC)
- **System Prompt Templates** — 4 template prompt untuk agentic AI
- **Progress bar** dengan step crumbs
- **Auto-detect** rekomendasi teknologi berdasarkan jawaban sebelumnya

### 🔄 Diubah
- UI didesain ulang dengan warna lebih bersih dan tipografi lebih baik
- Output lebih praktis — ada bagian `[dalam kurung kotak]` yang tinggal diisi
- PRD dan Master Plan lebih terstruktur dengan tabel dan checklist

### 🗑️ Dihapus
- Dark mode (akan kembali di v2.1)

---

## [1.0.0] — 2025

### ✨ Ditambahkan
- Framework SDLC Master (9 fase)
- Framework ADLC Agentic (9 fase)
- Wizard multi-step untuk kedua framework
- Generate: folder structure, package.json, PRD, starter prompts
- Copy to clipboard untuk semua output
