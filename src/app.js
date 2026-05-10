import { loadState, saveState, mergeLessons, mergePlanning, normalizeLesson, normalizePlanningItem, downloadText } from "./storage.js";
import { buildSession, evaluateAnswer, createAttempt, updateErrorsFromAttempt } from "./quizEngine.js";
import { buildMarkdownReport } from "./reviewEngine.js";

let state = loadState();
let session = [];
let currentIndex = 0;

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

init();

async function init() {
  await loadBundledLessons();
  bindTabs();
  bindActions();
  renderAll();
}

async function loadBundledLessons() {
  try {
    const manifest = await fetch("data/manifest.json").then(r => r.json());
    const lessons = [];
    for (const path of manifest.lessons) {
      lessons.push(await fetch(path).then(r => r.json()));
    }
    const known = new Set(state.lessons.map(l => l.id));
    const missing = lessons.map(normalizeLesson).filter(l => !known.has(l.id));
    if (missing.length) mergeLessons(state, missing);
  } catch (e) {
    console.warn("Leçons embarquées non chargées", e);
  }
}

function bindTabs() {
  $$(".tab").forEach(btn => btn.addEventListener("click", () => {
    $$(".tab").forEach(b => b.classList.remove("active"));
    $$(".view").forEach(v => v.classList.remove("active"));
    btn.classList.add("active");
    $(`#view-${btn.dataset.view}`).classList.add("active");
    renderAll();
  }));
}

function bindActions() {
  $("#startSession").onclick = () => startSession(false);
  $("#reviewErrors").onclick = () => { showView("today"); startSession(true); };
  $("#checkAnswer").onclick = checkCurrent;
  $("#nextQuestion").onclick = nextQuestion;
  $("#stopSession").onclick = stopSession;
  $("#lessonSearch").oninput = renderLessons;
  $("#subjectFilter").onchange = renderLessons;
  $("#validateImport").onclick = validateImport;
  $("#applyImport").onclick = applyImport;
  $("#exportMarkdown").onclick = () => downloadText(`bilan-candice-${today()}.md`, buildMarkdownReport(state), "text/markdown");
  $("#exportJson").onclick = () => downloadText(`sauvegarde-candice-${today()}.json`, JSON.stringify(state,null,2), "application/json");
  $("#backupFile").onchange = importBackup;
  $("#resetData").onclick = resetData;
  $("#clearStableErrors").onclick = () => {
    state.errors = state.errors.filter(e => e.etat !== "stabilisee");
    saveState(state); renderAll();
  };
}

function showView(name) {
  document.querySelector(`.tab[data-view="${name}"]`).click();
}

function startSession(onlyErrors=false) {
  const size = Number($("#sessionSize").value || 8);
  session = buildSession(state, size, onlyErrors);
  currentIndex = 0;
  if (!session.length) {
    $("#todaySummary").innerHTML = `<div class="card"><h3>Aucune question disponible</h3><p class="muted">Ajoute une leçon ou importe des exercices.</p></div>`;
    return;
  }
  $("#sessionBox").classList.remove("hidden");
  renderQuestion();
}

function startPlannedLesson(lessonId) {
  const lesson = state.lessons.find(l => l.id === lessonId);
  if (!lesson) return;
  session = (lesson.questions || []).map(q => ({lesson, question:q, score:10}));
  currentIndex = 0;
  showView("today");
  $("#sessionBox").classList.remove("hidden");
  renderQuestion();
}

function renderQuestion() {
  const item = session[currentIndex];
  const q = item.question, lesson = item.lesson;
  $("#sessionTitle").textContent = lesson.titre;
  $("#sessionMeta").textContent = `${lesson.matiere} · priorité ${item.score}`;
  $("#sessionCount").textContent = `${currentIndex+1}/${session.length}`;
  $("#feedback").className = "feedback hidden";
  let html = `<div class="question">${escapeHtml(q.question)}</div>`;
  if (q.type === "qcm" && q.choix?.length) {
    html += q.choix.map(c => `<label class="choice"><input type="radio" name="answer" value="${escapeAttr(c)}"> ${escapeHtml(c)}</label>`).join("");
  } else {
    html += `<input id="textAnswer" type="text" autocomplete="off" placeholder="Réponse de Candice" style="width:100%">`;
  }
  $("#questionBox").innerHTML = html;
}

function getAnswer() {
  const checked = document.querySelector("input[name='answer']:checked");
  if (checked) return checked.value;
  return $("#textAnswer")?.value || "";
}

function checkCurrent() {
  const item = session[currentIndex];
  const given = getAnswer();
  const correct = evaluateAnswer(item.question, given);
  const attempt = createAttempt(item.lesson, item.question, given, correct);
  state.attempts.push(attempt);
  updateErrorsFromAttempt(state, attempt);
  saveState(state);
  const fb = $("#feedback");
  fb.className = `feedback ${correct ? "ok" : "bad"}`;
  fb.innerHTML = correct
    ? `<strong>Correct.</strong><br>${escapeHtml(item.question.correction || item.question.reponse || "")}`
    : `<strong>À corriger.</strong><br>Réponse attendue : <strong>${escapeHtml(item.question.reponse || "")}</strong><br>${escapeHtml(item.question.correction || "")}<br><em>${escapeHtml(item.question.point_a_retenir || "")}</em>`;
  renderAll(false);
}

function nextQuestion() {
  if (currentIndex < session.length - 1) { currentIndex++; renderQuestion(); }
  else stopSession();
}

function stopSession() {
  $("#sessionBox").classList.add("hidden");
  session = [];
  renderAll();
}

function renderAll() {
  renderToday();
  renderLessons();
  renderErrors();
  renderProgress();
  renderPrompt();
}

function renderToday() {
  const attempts = state.attempts || [];
  const todayAttempts = attempts.filter(a => a.date?.slice(0,10) === today());
  const ok = todayAttempts.filter(a => a.correct).length;
  const activeErrors = (state.errors || []).filter(e => e.etat !== "stabilisee").length;
  const activeLessons = state.lessons.filter(l=>l.statut!=="archivee").length;
  const planned = upcomingPlanning(7);

  $("#todaySummary").innerHTML = `
    <div class="card"><h3>Aujourd’hui</h3><p>${ok}/${todayAttempts.length} réponses justes</p></div>
    <div class="card"><h3>À préparer</h3><p>${planned.length} échéance(s) dans les 7 jours</p></div>
    <div class="card"><h3>Erreurs actives</h3><p>${activeErrors}</p></div>
    <div class="card"><h3>Leçons actives</h3><p>${activeLessons}</p></div>
    ${renderPlanningCards(planned)}`;

  $$("[data-start-planned]").forEach(btn => btn.onclick = () => startPlannedLesson(btn.dataset.startPlanned));
}

function upcomingPlanning(daysAhead = 7) {
  const start = new Date(today() + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);
  return (state.planning || [])
    .map(normalizePlanningItem)
    .filter(Boolean)
    .filter(p => p.statut !== "terminee")
    .filter(p => {
      const d = new Date(p.date + "T00:00:00");
      return d >= start && d <= end;
    });
}

function renderPlanningCards(items) {
  if (!items.length) return `<div class="card wide"><h3>Prochains jours</h3><p class="muted">Aucune leçon planifiée.</p></div>`;
  return `<div class="card wide"><h3>Prochains jours</h3>${items.map(item => {
    const lessons = findPlannedLessons(item);
    const lessonButtons = lessons.length
      ? lessons.map(l => `<button data-start-planned="${escapeAttr(l.id)}">Réviser : ${escapeHtml(l.titre)}</button>`).join(" ")
      : `<span class="muted">Leçon non trouvée dans l’import.</span>`;
    return `<div class="planned-item">
      <p><strong>${formatDate(item.date)}</strong> · ${escapeHtml(item.matiere)}</p>
      <p>${item.titres.map(escapeHtml).join(" ; ")}</p>
      <div>${lessonButtons}</div>
    </div>`;
  }).join("")}</div>`;
}

function findPlannedLessons(item) {
  return state.lessons.filter(l =>
    l.matiere === item.matiere && item.titres.some(t => sameTitle(l.titre, t))
  );
}

function sameTitle(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function renderLessons() {
  const subjects = [...new Set(state.lessons.map(l => l.matiere).filter(Boolean))].sort();
  const sel = $("#subjectFilter");
  const current = sel.value;
  sel.innerHTML = `<option value="">Toutes les matières</option>` + subjects.map(s=>`<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join("");
  sel.value = current;
  const q = ($("#lessonSearch").value || "").toLowerCase();
  const subj = sel.value;
  const lessons = state.lessons.filter(l => (!subj || l.matiere === subj) && (`${l.matiere} ${l.titre} ${(l.mots_cles||[]).join(" ")}`.toLowerCase().includes(q)));
  $("#lessonsList").innerHTML = lessons.map(l => `
    <article class="lesson-card">
      <h3>${escapeHtml(l.titre)}</h3>
      <p class="muted">${escapeHtml(l.matiere)} · ${escapeHtml(l.statut || "active")} · ${l.questions?.length || 0} questions</p>
      <div class="tags">${(l.mots_cles||[]).slice(0,6).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      <ul>${(l.points_importants||[]).slice(0,4).map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul>
      <button data-start-lesson="${escapeAttr(l.id)}">Réviser cette leçon</button>
    </article>`).join("") || `<p class="muted">Aucune leçon.</p>`;
  $$("[data-start-lesson]").forEach(btn => btn.onclick = () => startPlannedLesson(btn.dataset.startLesson));
}

function renderErrors() {
  const errors = state.errors || [];
  $("#errorsList").innerHTML = errors.length ? errors.map(e => `
    <article class="error-card">
      <h3>${escapeHtml(e.matiere)} – ${escapeHtml(e.lecon)}</h3>
      <p><strong>Erreur.</strong> ${escapeHtml(e.erreur)}</p>
      <p><strong>Cause.</strong> ${escapeHtml(e.cause)}</p>
      <p><strong>Règle.</strong> ${escapeHtml(e.regle)}</p>
      <p><strong>Mini-exercice.</strong> ${escapeHtml(e.mini_exercice)}</p>
      <span class="badge">${escapeHtml(e.etat)} · réussites ${e.reussites || 0}/2</span>
    </article>`).join("") : `<p class="muted">Aucune erreur enregistrée.</p>`;
}

function renderProgress() {
  const attempts = state.attempts || [];
  const ok = attempts.filter(a => a.correct).length;
  $("#progressCards").innerHTML = `
    <div class="card"><h3>Taux de réussite</h3><p>${attempts.length ? Math.round(ok/attempts.length*100) : 0}%</p></div>
    <div class="card"><h3>Réponses</h3><p>${attempts.length}</p></div>
    <div class="card"><h3>Leçons</h3><p>${state.lessons.length}</p></div>`;
  $("#attemptsTable").innerHTML = attempts.length ? `
    <table><thead><tr><th>Date</th><th>Matière</th><th>Question</th><th>Réponse</th><th>Résultat</th></tr></thead>
    <tbody>${attempts.slice(-30).reverse().map(a=>`<tr><td>${new Date(a.date).toLocaleDateString("fr-FR")}</td><td>${escapeHtml(a.matiere)}</td><td>${escapeHtml(a.question)}</td><td>${escapeHtml(a.reponse_donnee)}</td><td>${a.correct ? "✓" : "✗"}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Pas encore de réponse enregistrée.</p>`;
}

function validateImport() {
  try {
    const parsed = parseImport();
    const message = `${parsed.lessons.length} leçon(s) valide(s), ${parsed.planning.length} échéance(s) planifiée(s).`;
    $("#importFeedback").className = "feedback ok";
    $("#importFeedback").textContent = message;
  } catch (e) {
    $("#importFeedback").className = "feedback bad";
    $("#importFeedback").textContent = e.message;
  }
}

function applyImport() {
  try {
    const parsed = parseImport();
    mergeLessons(state, parsed.lessons);
    mergePlanning(state, parsed.planning);
    $("#importFeedback").className = "feedback ok";
    $("#importFeedback").textContent = `${parsed.lessons.length} leçon(s) importée(s), ${parsed.planning.length} échéance(s) ajoutée(s).`;
    $("#importArea").value = "";
    renderAll();
  } catch (e) {
    $("#importFeedback").className = "feedback bad";
    $("#importFeedback").textContent = e.message;
  }
}

function parseImport() {
  const raw = $("#importArea").value.trim();
  if (!raw) throw new Error("Aucun JSON à importer.");
  const data = JSON.parse(raw);

  const lessons = Array.isArray(data)
    ? data
    : (Array.isArray(data.lessons) ? data.lessons : (Array.isArray(data.lecons) ? data.lecons : [data]));

  if (!lessons.length) throw new Error("Aucune leçon trouvée.");
  for (const l of lessons) {
    if (!l.titre || !l.matiere || !Array.isArray(l.questions)) throw new Error("Chaque leçon doit contenir matiere, titre et questions.");
  }

  const planning = Array.isArray(data) ? buildPlanningFromLessonDates(lessons) : [
    ...(Array.isArray(data.planning) ? data.planning : []),
    ...buildPlanningFromLessonDates(lessons)
  ];

  return {
    lessons: lessons.map(normalizeLesson),
    planning: planning.map(normalizePlanningItem).filter(Boolean)
  };
}

function buildPlanningFromLessonDates(lessons) {
  return lessons
    .filter(l => l.date || l.echeance || l.deadline || l.a_preparer_pour)
    .map(l => ({
      date: l.date || l.echeance || l.deadline || l.a_preparer_pour,
      matiere: l.matiere,
      titres: [l.titre]
    }));
}

function importBackup(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state = {...state, ...data, version:2};
      saveState(state); renderAll();
      alert("Sauvegarde importée.");
    } catch { alert("Fichier de sauvegarde invalide."); }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("Réinitialiser les réponses, erreurs et échéances enregistrées sur ce navigateur ?")) return;
  state.attempts = [];
  state.errors = [];
  state.planning = [];
  saveState(state);
  renderAll();
}

function renderPrompt() {
  $("#promptBox").textContent = `Transforme ce cours ou ce contrôle en JSON compatible avec l'application Candice Révisions v2.

Format attendu :
{
  "lessons": [
    {
      "matiere": "italien",
      "titre": "Se présenter et présenter quelqu'un",
      "questions": [
        {
          "question": "Question courte",
          "reponse": "Réponse attendue"
        }
      ]
    }
  ],
  "planning": [
    {
      "date": "2026-05-12",
      "matiere": "italien",
      "titres": ["Se présenter et présenter quelqu'un"]
    }
  ]
}

Règle : chaque leçon doit contenir matiere, titre et questions. Le bloc planning sert à afficher les leçons dans l'onglet Aujourd'hui pour les prochains jours.`;
}

function today(){return new Date().toISOString().slice(0,10);}
function formatDate(s){return new Date(`${s}T00:00:00`).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" });}
function escapeHtml(s){return String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function escapeAttr(s){return escapeHtml(s).replace(/"/g,"&quot;");}
