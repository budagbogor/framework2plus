# DevForge V3 (framework2plus) - Project Summary
*Dokumen ini merupakan ringkasan komprehensif dari arsitektur, fitur, dan riwayat perbaikan DevForge V3 hingga pertengahan 2026. Digunakan sebagai konteks dasar agar agen AI yang bergabung di masa depan dapat langsung memahami sistem tanpa kebingungan.*

## 1. Visi & Identitas Aplikasi
**DevForge V3** adalah platform "Autonomous Professional Developer" yang mengotomatisasi peran Senior Developer (Arsitek, Coder, QA, dan DevOps). Aplikasi ini memungkinkan pengguna (dari pemula hingga mahir) merakit aplikasi web, desktop, atau agen AI secara instan melalui sistem *wizard* interaktif dan orkestrasi *Multi-Agent*.

## 2. Arsitektur Utama
Aplikasi ini dibangun menggunakan arsitektur statis yang sangat ringan namun bertenaga:
*   **File Utama:** `public/index.html` (Satu file monolitis yang mencakup struktur HTML, CSS, dan logika JavaScript aplikasi).
*   **Antarmuka (UI/UX):** Menggunakan desain *Glassmorphism*, *Dark Mode*, dan mikrodinamis tingkat tinggi tanpa framework eksternal yang membebani (Vanilla CSS/JS).
*   **Lingkungan Eksekusi:** 
    *   **Browser/Web Mode:** Bekerja sebagai simulasi dengan `Virtual Workspace` (disimpan sementara di memori browser).
    *   **Native Mode (Tauri):** Terintegrasi dengan jembatan Rust (`window.__TAURI__`) untuk menulis file secara nyata ke sistem komputer dan mengeksekusi *command-line* (`npm install`, `npm run dev`) secara langsung.

## 3. Fitur Inti (Core Features)
### A. Level Berbasis Pengguna (Wizard Filtration)
Pengguna memulai dengan memilih salah satu dari 3 level:
*   **Pemula (Beginner):** Opsi teknologi sangat dibatasi dan di-filter radikal. Hanya menampilkan satu opsi "Terbaik" per kategori agar pengguna tidak pusing.
*   **Menengah (Intermediate):** Opsi standar (rekomendasi *Best* & *Good*) ditampilkan.
*   **Mahir (Advanced):** Seluruh daftar teknologi, termasuk teknologi berskala *Enterprise* dan sangat *niche* (seperti eksekusi *bare-metal*) ditampilkan tanpa filter.

### B. Tech Stack 2026 (Diperbarui)
Objek konfigurasi `TECH` menyimpan deretan teknologi termutakhir saat ini:
*   **Frontend:** SvelteKit, React, Vue, Expo.
*   **Backend:** Hono + Bun, FastAPI, Node.js.
*   **Database:** Neon/Turso (Serverless Edge), Supabase, PostgreSQL.
*   **Desktop/Mobile:** Tauri v2 (Rust backend untuk cross-platform).
*   **AI Models:** DeepSeek (V3/R1), Qwen 2.5+, Gemini 1.5 Pro, Claude.
*   **AI Frameworks:** Smolagents (HuggingFace), Phidata, Pydantic AI.
*   **AI Tools:** Computer Use (Anthropic GUI automation), Code Execution.

### C. Bypass Limitasi Timeout (Internal Proxy)
Karena proses pembuatan kode oleh AI memakan waktu panjang (lebih dari 60 detik), Vercel Hobby (Serverless) sering memutus koneksi dan menghasilkan `HTTP 504: FUNCTION_INVOCATION_TIMEOUT`. 
**Solusi bawaan:** Disediakan toggle **"Gunakan Internal Proxy"** pada AI Settings. Jika dinonaktifkan, aplikasi akan melakukan *Direct Fetch* langsung dari browser pengguna ke penyedia LLM (menghindari jalur server Vercel), sehingga tidak ada batasan waktu (limit-less).

### D. Export & Export-Only Preview
Proyek (*Virtual Workspace*) yang dihasilkan oleh AI dapat diunduh (bundle ZIP).
Sistem Preview Bawaan (*Live Preview*) difilter hanya untuk proyek HTML murni. Jika pengguna membuat proyek dengan *framework* (seperti Astro, Next.js, SvelteKit), tombol Preview memberikan instruksi untuk melakukan Export dan mengeksekusi `npm run dev` secara lokal agar pengguna tidak kebingungan.

## 4. Riwayat Perbaikan Bug Krusial
1.  **Bug "Halaman Akhir Nyangkut" (Agent State Persist):** Diperbaiki dengan mengosongkan dan memaksa `S.agentStatus` kembali ke `idle` serta me-reset `activeAgent` di dalam fungsi `restart()` setiap kali pengguna menekan tombol "Buat Project Baru".
2.  **Bug Timeout 504 Dasar:** Menambahkan `"maxDuration": 60` pada `vercel.json` (batas toleransi maksimal Vercel).
3.  **Misleading Preview Error:** Pesan *error* pada `openLivePreview()` diubah agar berhenti menyuruh pengguna "Menunggu AI" ketika `index.html` tidak ditemukan pada proyek berbasis framework (Node.js).

## 5. Rencana Pengembangan Selanjutnya (Bila Diinginkan)
*   **Integrasi WebContainers:** Memungkinkan kompilasi (*transpilation*) Node.js, Vite, dan React/Astro berjalan penuh di dalam Google Chrome tanpa perlu aplikasi desktop (Tauri) atau export zip. (Rencana Arsitektur Skala Besar).
*   **Penyimpanan Cloud Session:** Sinkronisasi *Virtual Workspace* ke database eksternal untuk melanjutkan pekerjaan lintas perangkat.
