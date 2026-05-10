export const STORAGE_KEY = "candice_revisions_v2";

export function defaultState() {
  return {
    version: 2,
    lessons: [],
    attempts: [],
    errors: [],
    settings: { priorities: { "histoire-géographie": 3, "physique-chimie": 3, "svt": 2, "italien": 2 } }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, version: 2 };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function mergeLessons(state, incomingLessons) {
  const byId = new Map(state.lessons.map(l => [l.id, l]));
  for (const lesson of incomingLessons) {
    const normalized = normalizeLesson(lesson);
    byId.set(normalized.id, { ...(byId.get(normalized.id) || {}), ...normalized });
  }
  state.lessons = Array.from(byId.values()).sort((a,b)=>(a.matiere||"").localeCompare(b.matiere||"") || (a.titre||"").localeCompare(b.titre||""));
  saveState(state);
}

export function normalizeLesson(lesson) {
  if (!lesson.id) lesson.id = slug(`${lesson.matiere || "matiere"}-${lesson.titre || Date.now()}`);
  lesson.questions = (lesson.questions || []).map((q, idx) => ({
    id: q.id || `${lesson.id}_q${idx+1}`,
    type: q.type || "texte",
    question: q.question || "",
    choix: q.choix || [],
    reponse: q.reponse || "",
    correction: q.correction || q.reponse || "",
    point_a_retenir: q.point_a_retenir || "",
    difficulte: q.difficulte || 1
  }));
  lesson.points_importants = lesson.points_importants || [];
  lesson.mots_cles = lesson.mots_cles || [];
  lesson.statut = lesson.statut || "active";
  lesson.date_creation = lesson.date_creation || new Date().toISOString().slice(0,10);
  return lesson;
}

export function slug(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}

export function downloadText(filename, text, mime="text/plain") {
  const blob = new Blob([text], {type:mime});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
