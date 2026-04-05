# Dokumentasi Teknis DevForge Studio v3.0

Selamat datang di dokumentasi resmi **DevForge Studio**, generator arsitektur perangkat lunak cerdas yang dirancang untuk mempercepat fase inisiasi proyek Anda.

---

## 🏗️ Arsitektur Sistem

DevForge Studio adalah aplikasi **Single Page Application (SPA)** murni yang dibangun menggunakan:
- **HTML5 & Vanilla JavaScript**: Logika inti tanpa ketergantungan framework berat.
- **Vanilla CSS3**: Desain sistem "Sapphire Ash Morning" yang responsif dan elegan.
- **JSZip**: Kompresi bundle proyek sisi klien (client-side).
- **Puter.js & AI Proxy**: Integrasi provider AI (SumoPod, OpenRouter, Puter.js) untuk pengayaan konten.

---

## 🤖 Integrasi AI (AI Enhancement)

DevForge Studio mendukung tiga provider utama untuk memperkuat hasil *bundle* Anda:

### 1. SumoPod (Tanpa API Key)
- Menggunakan endpoint `/v1/chat/completions`.
- Sangat stabil untuk penggunaan cepat.

### 2. OpenRouter (API Key Diperlukan)
- Memberikan akses ke ratusan model (Llama 3.3, Claude, Gemini).
- Dilengkapi fitur **Auto-Switch** untuk mengatasi pembatasan *rate limit* pada model gratis.

### 3. Puter.js (Zero-Configuration)
- Menggunakan library `puter.ai.chat()`.
- Tidak memerlukan API Key manual (menggunakan akun Puter.com Anda).
- Versi model terbaru 2026 selalu diperbarui secara otomatis.

---

## 🔄 Alur Kerja Terbaik (Best Workflow)

Untuk mendapatkan hasil maksimal, ikuti alur kerja berikut:

1.  **Pilih Mode**: Tentukan apakah Anda membuat Website Statis (Framework 01), Software Kompleks (Framework 02), atau Agentic AI (Framework 03).
2.  **Konfigurasi AI**: Hubungkan Puter.js atau masukkan API Key OpenRouter sebelum mulai mengisi wizard.
3.  **Isi Wizard**: Berikan deskripsi proyek yang spesifik (minimal 2 kalimat).
4.  **Generasi**: Tunggu hingga proses analisis selesai (~3 detik).
5.  **Review & Download**: Periksa struktur folder dan PRD di tab preview, lalu download ZIP bundle.

---

## 🛠️ Pengembangan & Kontribusi

Proyek ini menggunakan struktur file tunggal `public/index.html` untuk kemudahan deployment. Fungsi serverless berada di `api/ai-proxy.js`.

### Deployment ke Vercel:
```bash
npx vercel --prod
```

### Jalankan Lokal:
```bash
npx vercel dev --port 3001
```

---

*&copy; 2026 B.O.A Indonesia — Memberdayakan Developer dengan Kecerdasan Buatan.*
