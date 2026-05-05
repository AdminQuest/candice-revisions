import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'content');
const distDir = path.join(root, 'dist');
const checkOnly = process.argv.includes('--check');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function assertQuestionnaire(q, file) {
  const required = ['id', 'niveau', 'matiere', 'titre', 'questions'];
  for (const key of required) {
    if (!(key in q)) throw new Error(`${file}: champ manquant: ${key}`);
  }
  if (!Array.isArray(q.questions) || q.questions.length === 0) {
    throw new Error(`${file}: questions doit être une liste non vide`);
  }
}

const files = walk(contentDir).filter((file) => file.endsWith('.json')).sort();
const questionnaires = files.map((file) => {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assertQuestionnaire(parsed, file);
  return parsed;
});

const template = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');

const html = template
  .replace('/*__STYLE__*/', style)
  .replace('/*__DATA__*/', JSON.stringify(questionnaires))
  .replace('/*__APP__*/', app);

if (!checkOnly) {
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'candice-revisions.html'), html);
  fs.writeFileSync(path.join(root, 'index.html'), html);
}

console.log(`${questionnaires.length} questionnaire(s) validé(s).`);
