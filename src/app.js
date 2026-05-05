const DATA = window.REVISIONS || [];
const KEY = 'candice-revisions-v1';
let progress = JSON.parse(localStorage.getItem(KEY) || '{}');
let current = null;
let session = [];
let idx = 0;
let revealed = false;
let selected = null;

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save = () => localStorage.setItem(KEY, JSON.stringify(progress));
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const qkey = (lesson, q) => `${lesson.id}::${lesson.questions.indexOf(q)}`;

function start(id, mode) {
  current = DATA.find(x => x.id === id);
  if (!current) return;
  session = [...current.questions];
  if (mode === 'quick') session = shuffle(session).slice(0, 5);
  if (mode === 'errors') {
    session = session.filter(q => (progress[qkey(current, q)]?.revoir || 0) > 0);
    if (!session.length) session = [...current.questions];
  }
  idx = 0; revealed = false; selected = null;
  renderLesson();
}

function mark(status) {
  const q = session[idx];
  const k = qkey(current, q);
  const p = progress[k] || { attempts: 0, ok: 0, almost: 0, revoir: 0 };
  p.attempts += 1; p[status] += 1;
  p.matiere = current.matiere; p.titre = current.titre; p.question = q.question; p.last = new Date().toISOString();
  progress[k] = p; save();
  if (idx < session.length - 1) { idx++; revealed = false; selected = null; renderLesson(); }
  else renderEnd();
}

function renderHome() {
  const app = $('#app');
  const matieres = ['Toutes', ...new Set(DATA.map(x => x.matiere))];
  const attempts = Object.values(progress).reduce((s, p) => s + (p.attempts || 0), 0);
  const revoir = Object.values(progress).filter(p => (p.revoir || 0) > 0).length;
  app.className = 'app-shell';
  app.innerHTML = `<section class="hero"><div><h1>Candice Révisions</h1><p class="small">Révisions courtes, corrections immédiates, erreurs à refaire.</p></div><button class="btn ghost" id="reset">Effacer les progrès</button></section><section class="stats"><div class="card stat"><strong>${DATA.length}</strong><span class="small">leçons</span></div><div class="card stat"><strong>${DATA.reduce((s,x)=>s+x.questions.length,0)}</strong><span class="small">questions</span></div><div class="card stat"><strong>${attempts}</strong><span class="small">réponses</span></div><div class="card stat"><strong>${revoir}</strong><span class="small">à revoir</span></div></section><section class="card" style="margin-top:14px"><h2>Choisir une leçon</h2><div class="filters"><select id="mat">${matieres.map(m=>`<option>${esc(m)}</option>`).join('')}</select><input id="search" type="search" placeholder="Rechercher"></div><div class="grid" id="grid"></div></section>`;
  $('#reset').onclick = () => { if (confirm('Effacer les progrès sur cet appareil ?')) { progress = {}; save(); renderHome(); } };
  $('#mat').onchange = paintGrid;
  $('#search').oninput = paintGrid;
  paintGrid();
}

function paintGrid() {
  const mat = $('#mat').value;
  const term = $('#search').value.toLowerCase();
  const lessons = DATA.filter(x => (mat === 'Toutes' || x.matiere === mat) && `${x.titre} ${x.matiere} ${(x.mots_cles||[]).join(' ')}`.toLowerCase().includes(term));
  $('#grid').innerHTML = lessons.map(x => `<article class="card lesson-card"><div><span class="badge">${esc(x.niveau)}</span> <span class="badge">${esc(x.matiere)}</span></div><h3>${esc(x.titre)}</h3><p class="small">${x.questions.length} questions · ${x.duree_minutes || 10} min</p><div>${(x.mots_cles||[]).slice(0,4).map(w=>`<span class="badge">${esc(w)}</span>`).join(' ')}</div><div class="actions"><button class="btn" data-id="${esc(x.id)}" data-mode="quick">5 questions</button><button class="btn secondary" data-id="${esc(x.id)}" data-mode="all">Tout faire</button><button class="btn ghost" data-id="${esc(x.id)}" data-mode="errors">Erreurs</button></div></article>`).join('');
  document.querySelectorAll('[data-id]').forEach(b => b.onclick = () => start(b.dataset.id, b.dataset.mode));
}

function renderLesson() {
  const q = session[idx];
  const pct = Math.round(((idx + 1) / session.length) * 100);
  $('#app').innerHTML = `<section class="card"><div class="toolbar"><button class="btn ghost" id="home">Accueil</button><span class="badge">${esc(current.matiere)}</span></div><h1>${esc(current.titre)}</h1>${course()}<div class="progress"><span style="width:${pct}%"></span></div><p class="small">Question ${idx + 1} / ${session.length}</p><div class="question-box">${question(q)}</div></section>`;
  $('#home').onclick = renderHome;
  const reveal = $('#reveal'); if (reveal) reveal.onclick = () => { revealed = true; renderLesson(); };
  document.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => { selected = Number(b.dataset.choice); revealed = true; renderLesson(); });
  document.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => mark(b.dataset.mark));
}

function course() {
  if (!current.cours_court?.length) return '';
  return `<div class="course-box"><strong>À retenir</strong><ul>${current.cours_court.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
}

function question(q) {
  let body = '';
  if (q.type === 'qcm') body = (q.choix||[]).map((c,i)=>`<button class="choice ${selected===i?'selected':''}" data-choice="${i}">${esc(c)}</button>`).join('');
  else body = `<textarea placeholder="Écris ta réponse ici."></textarea><button class="btn" id="reveal">Voir la correction</button>`;
  return `<h2>${esc(q.question)}</h2><p class="small">${esc(q.type)}</p>${body}${revealed ? correction(q) : ''}`;
}

function correction(q) {
  let c = '';
  if (q.type === 'qcm') c = `<p><strong>${selected === q.bonne_reponse ? 'Bonne réponse.' : 'À corriger.'}</strong></p><p>${esc(q.correction || q.choix?.[q.bonne_reponse])}</p>`;
  else if (q.type === 'reponse_longue') c = `<div class="levels"><div><strong>Minimale</strong><br>${esc(q.correction_minimale)}</div><div><strong>Correcte</strong><br>${esc(q.correction_correcte)}</div><div><strong>Complète</strong><br>${esc(q.correction_complete)}</div></div>`;
  else c = `<p>${esc(q.correction)}</p>`;
  return `<div class="correction"><h3>Correction</h3>${c}<div class="question-actions"><button class="btn" data-mark="ok">Juste</button><button class="btn secondary" data-mark="almost">Presque</button><button class="btn ghost" data-mark="revoir">À revoir</button></div></div>`;
}

function renderEnd() {
  $('#app').innerHTML = `<section class="card"><h1>Séance terminée</h1><p>Les progrès sont enregistrés sur cet appareil.</p><div class="actions"><button class="btn" id="again">Refaire</button><button class="btn secondary" id="errors">Refaire les erreurs</button><button class="btn ghost" id="home">Accueil</button></div></section>`;
  $('#again').onclick = () => start(current.id, 'all');
  $('#errors').onclick = () => start(current.id, 'errors');
  $('#home').onclick = renderHome;
}

renderHome();
