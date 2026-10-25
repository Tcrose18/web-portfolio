const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'mobile-www');
const files = ['index.html', 'styles.css', 'config.js', 'app.bundle.js', 'real-data.js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}

console.log(`Prepared ${out}`);
