@echo off
echo Mengatur remote URL ke repository baru...
git remote set-url origin https://github.com/budagbogor/framework2plus.git
if %ERRORLEVEL% NEQ 0 (
    echo Gagal mengatur remote. Mencoba menambahkan remote baru...
    git remote add origin https://github.com/budagbogor/framework2plus.git
)

echo.
echo Menambah semua file ke staging...
git add .

echo.
echo Membuat commit...
git commit -m "Migration to https://github.com/budagbogor/framework2plus.git"

echo.
echo Mengirim ke repository baru (branch master)...
git push -u origin master

echo.
if %ERRORLEVEL% EQU 0 (
    echo Berhasil! Project telah dipindahkan.
) else (
    echo Terjadi kesalahan saat push. Pastikan repository tujuan sudah ada dan kosong.
)
pause
