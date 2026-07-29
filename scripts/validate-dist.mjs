import fs from 'node:fs';
import { validateGeneratedDocument } from './build-validation.mjs';

const distPath = new URL('../dist/index.html', import.meta.url);
const sourcePath = new URL('../index.html', import.meta.url);

if (!fs.existsSync(distPath)) {
  throw new Error('dist/index.html does not exist. Run npm run build first.');
}

const html = fs.readFileSync(distPath, 'utf8');
const source = fs.readFileSync(sourcePath, 'utf8');
validateGeneratedDocument(html, source);

console.log('dist/index.html passed structure, login equivalence, syntax, and isolation checks.');
