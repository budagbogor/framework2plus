# ⚡ DevForge Studio

> **Generate project structure, PRD, starter prompts, dan konfigurasi lengkap untuk Software (SDLC) dan Agentic AI (ADLC) — dalam hitungan menit.**

Cocok untuk semua level — dari orang awam hingga developer berpengalaman.

> [!IMPORTANT]
> **[LIHAT DOKUMENTASI LENGKAP (DOCUMENTATION.md)](./DOCUMENTATION.md)**

---

## ✨ Fitur Utama

- 🧠 **Smart Recommendations** — Setiap pilihan teknologi direkomendasikan otomatis berdasarkan konteks project
- 📖 **Penjelasan Ramah Pemula** — Setiap teknologi punya kelebihan, kekurangan, dan "cocok untuk siapa"
- 🚀 **Interactive Guide Center** — Menu panduan langsung di dalam aplikasi untuk workflow terbaik
- 🏗️ **Tiga Framework Lengkap:**
  - **Framework 01 (Website)** — Untuk landing page, blog, portfolio
  - **Framework 02 (Software)** — Untuk web app, mobile, API, SaaS
  - **Framework 03 (Agentic AI)** — Untuk AI agent, chatbot cerdas, RAG
- 📦 **4 Output Siap Pakai:**
  - Struktur folder project (dengan komentar penjelasan)
  - PRD / ADLC Master Plan (tinggal isi bagian kosong)
  - Starter prompts untuk AI coding assistant
  - Starter code Python (untuk ADLC)
- 🌙 **Satu file, zero dependency** — Buka di browser, langsung jalan

---

## 🚀 Cara Pakai

### Opsi 1: Buka Langsung di Browser
```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/devforge-studio.git
cd devforge-studio

# Buka di browser
open public/index.html
# atau double-click file public/index.html
```

### Opsi 2: Serve via HTTP (direkomendasikan)
```bash
# Pakai Python (built-in)
cd devforge-studio/public
python3 -m http.server 3000
# Buka http://localhost:3000

# Atau pakai Node.js
npx serve public
# Buka http://localhost:3000
```

### Opsi 3: Deploy ke Netlify / Vercel (gratis)
```bash
# Drag & drop folder public/ ke netlify.com/drop
# Atau gunakan Vercel CLI:
npx vercel public/
```

---

## 📁 Struktur Project

```
devforge-studio/
├── public/
│   └── index.html          ← Aplikasi utama (self-contained)
├── src/
│   ├── tech-database.js    ← Database teknologi + penjelasan
│   ├── sdlc-steps.js       ← Definisi langkah SDLC
│   ├── adlc-steps.js       ← Definisi langkah ADLC
│   └── output-builder.js   ← Generator output (PRD, struktur, dll)
├── docs/
│   ├── SDLC-FRAMEWORK.md   ← Dokumentasi Framework SDLC
│   └── ADLC-FRAMEWORK.md   ← Dokumentasi Framework ADLC
├── .github/
│   └── workflows/
│       └── deploy.yml      ← Auto-deploy ke GitHub Pages
├── DOCUMENTATION.md        ← Dokumentasi Teknis Lengkap (Terbaru 2026) ⚡
├── package.json
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

- **Pure HTML/CSS/JS** — Zero framework, zero dependency, zero build step
- **Font:** Plus Jakarta Sans (Google Fonts)
- **Deploy:** GitHub Pages / Netlify / Vercel (gratis semua)

---

## 📊 Framework yang Dihasilkan

### Framework 1 — SDLC Master (9 Fase)
| Fase | Aktivitas |
|------|-----------|
| 01 Planning | Scope, goals, risk register |
| 02 Requirements | User stories, continuous discovery |
| 03 System Design | Architecture, DB schema, ADR |
| 04 Implementation | TDD, feature flags, AI copilot |
| 05 Testing & QA | Shift-left, automated pipelines |
| 06 Deployment | CI/CD, blue-green, canary |
| 07 Monitoring | Four golden signals, APM |
| 08 Evaluation | KPI review, tech debt |
| 09 Maintenance | SLA, hotfix, refactoring |

### Framework 2 — ADLC Agentic (9 Fase)
| Fase | Aktivitas |
|------|-----------|
| 01 Goal Definition | Mission, outcomes, constraints |
| 02 Build PRD | Agent spec, HITL checkpoints |
| 03 Write Skills | Tool schemas, system prompts |
| 04 Orchestrate | Agent topology, state machine |
| 05 Autonomous Coding | Code gen, auto-review |
| 06 Autonomous Testing | LLM-as-judge, self-healing |
| 07 Manual Eval | Quality gate, observability |
| 08 Deployment | Agentic CI/CD, rollback |
| 09 Monitoring | Drift detection, cost tracking |

---

## 🤝 Kontribusi

Pull request sangat disambut! Beberapa area yang bisa dikembangkan:
- Tambah pilihan teknologi baru
- Terjemahan ke bahasa lain
- Export ke format PDF
- Integrasi dengan GitHub API untuk auto-create repo

---

## 📄 Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.

---

*Dibuat dengan ❤️ menggunakan DevForge Studio*
