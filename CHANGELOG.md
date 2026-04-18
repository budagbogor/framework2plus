# Changelog

Semua perubahan penting pada DevForge Studio dicatat di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
