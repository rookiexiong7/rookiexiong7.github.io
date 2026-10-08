const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const limits = { '.md': 256 * 1024, '.webp': 300 * 1024, '.avif': 300 * 1024, '.jpg': 300 * 1024, '.jpeg': 300 * 1024, '.png': 300 * 1024, '.svg': 100 * 1024 };
const forbidden = new Set(['.pdf', '.mp4', '.mov', '.webm', '.gif', '.zip', '.gz', '.pptx', '.pt', '.pth', '.bin']);
function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Blog assets must not be symlinks: ${file}`);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function checkFiles(files) {
  let total = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const size = fs.statSync(file).size;
    total += size;
    if (forbidden.has(ext)) throw new Error(`${file}: link to papers/videos/attachments externally instead of committing them`);
    if (size > (limits[ext] || 100 * 1024)) throw new Error(`${file}: ${(size / 1024).toFixed(0)} KB exceeds the blog limit (${(limits[ext] || 100 * 1024) / 1024} KB)`);
  }
  return total;
}

function main() {
  const files = [...walk('site/posts'), ...walk('site/assets')];
  const total = checkFiles(files);
  // Also catch a generated site or dependencies accidentally staged in Git.
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0');
  if (tracked.some(file => /^(?:_site|node_modules)\//.test(file))) throw new Error('Do not track _site/ or node_modules/; deployment uses an Actions artifact');
  console.log(`Blog content check passed: ${files.length} files, ${(total / 1024).toFixed(1)} KB.`);
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkFiles };
