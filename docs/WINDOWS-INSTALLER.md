# Windows Installer DevForge Studio

Dokumen ini menetapkan bahwa target distribusi utama project adalah aplikasi desktop Windows berbasis Tauri.

## Target Output

- Installer `.exe` dengan bundler `nsis`
- Installer `.msi` untuk kebutuhan distribusi enterprise
- Output build berada di:

```text
src-tauri/target/release/bundle/
```

Lokasi yang umum:

```text
src-tauri/target/release/bundle/nsis/
src-tauri/target/release/bundle/msi/
```

## Perintah Utama

Development mode:

```bash
npm run desktop:dev
```

Build installer `.exe`:

```bash
npm run desktop:exe
```

Build installer `.msi`:

```bash
npm run desktop:msi
```

Build seluruh target Windows yang dikonfigurasi:

```bash
npm run desktop:build
```

## Keputusan Teknis

- UI utama tetap berasal dari `public/index.html`
- Shell desktop, akses file, dan command execution tetap ditangani Tauri
- Target bundling difokuskan ke `nsis` dan `msi` agar output Windows stabil dan terprediksi
- Project ini diposisikan sebagai aplikasi installable Windows, bukan sekadar web wrapper

## Checklist Release

- [ ] Finalkan `src-tauri/icons/icon.ico`
- [ ] Sinkronkan versioning `package.json`, `src-tauri/tauri.conf.json`, dan `Cargo.toml`
- [ ] Uji `npm run desktop:dev`
- [ ] Uji `npm run desktop:exe`
- [ ] Uji instalasi pada Windows bersih
- [ ] Tambahkan code signing sebelum distribusi publik
- [ ] Tambahkan CI build untuk installer Windows
