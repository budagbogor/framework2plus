const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
const apiDir = path.join(root, 'api');

function resetDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  fs.cpSync(sourcePath, targetPath, { recursive: true });
  return true;
}

resetDir(distDir);

if (!copyIfExists(publicDir, distDir)) {
  throw new Error('Folder public tidak ditemukan.');
}

const apiCopied = copyIfExists(apiDir, path.join(distDir, 'api'));

console.log('Build berhasil. File siap di folder /dist');
if (!apiCopied) {
  console.log('Folder /api tidak ditemukan, langkah copy API dilewati.');
}
