export function buildSession(state, size=8, onlyErrors=false) {
  const questions = [];
  const activeLessons = state.lessons.filter(l => l.statut !== "archivee");
  for (const lesson of activeLessons) {
    for (const q of lesson.questions || []) {
      const score = questionPriority(state, lesson, q, onlyErrors);
      if (score > 0) questions.push({lesson, question:q, score});
    }
  }
  questions.sort((a,b)=>b.score-a.score || Math.random()-.5);
  return questions.slice(0, size);
}

export function questionPriority(state, lesson, q, onlyErrors=false) {
  const attempts = state.attempts.filter(a => a.question_id === q.id);
  const last = attempts.at(-1);
  const wrong = attempts.filter(a => !a.correct).length;
  const rightStreak = streak(attempts);
  const activeErr = state.errors.some(e => e.question_id === q.id && e.etat !== "stabilisee");
  if (onlyErrors && !activeErr && wrong === 0) return 0;

  let score = 1;
  if (lesson.statut === "active") score += 3;
  if (activeErr) score += 6;
  if (wrong > 0) score += Math.min(4, wrong);
  if (state.settings?.priorities?.[lesson.matiere]) score += state.settings.priorities[lesson.matiere];
  if (rightStreak >= 3) score -= 4;
  if (last && daysSince(last.date) > 14) score += 2;
  return Math.max(0, score);
}

function streak(attempts) {
  let n=0;
  for (let i=attempts.length-1;i>=0;i--) {
    if (attempts[i].correct) n++; else break;
  }
  return n;
}

function daysSince(date) {
  const d = new Date(date);
  return Math.floor((Date.now()-d.getTime())/86400000);
}

export function evaluateAnswer(question, given) {
  const expected = String(question.reponse ?? "").trim();
  const answer = String(given ?? "").trim();
  if (question.type === "qcm") return normalize(answer) === normalize(expected);
  if (!expected) return answer.length > 0;
  return normalize(answer) === normalize(expected);
}

export function normalize(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g," ").replace(/[^a-z0-9]+/g," ").trim();
}

export function createAttempt(lesson, question, given, correct) {
  return {
    date: new Date().toISOString(),
    lesson_id: lesson.id,
    question_id: question.id,
    matiere: lesson.matiere,
    titre_lecon: lesson.titre,
    question: question.question,
    reponse_attendue: question.reponse,
    reponse_donnee: given,
    correct,
    correction: question.correction || question.reponse,
    point_a_retenir: question.point_a_retenir || (lesson.points_importants || [])[0] || ""
  };
}

export function updateErrorsFromAttempt(state, attempt) {
  const idx = state.errors.findIndex(e => e.question_id === attempt.question_id);
  if (attempt.correct) {
    if (idx >= 0) {
      state.errors[idx].reussites = (state.errors[idx].reussites || 0) + 1;
      if (state.errors[idx].reussites >= 2) state.errors[idx].etat = "stabilisee";
    }
    return;
  }
  const err = {
    id: idx >= 0 ? state.errors[idx].id : `err_${Date.now()}`,
    date: attempt.date,
    matiere: attempt.matiere,
    lecon: attempt.titre_lecon,
    question_id: attempt.question_id,
    erreur: `Réponse incorrecte : ${attempt.question}`,
    cause: "À préciser après correction : connaissance, méthode, consigne ou attention.",
    regle: attempt.point_a_retenir || attempt.correction,
    mini_exercice: attempt.question,
    correction: attempt.correction,
    etat: "a_revoir",
    reussites: 0
  };
  if (idx >= 0) state.errors[idx] = {...state.errors[idx], ...err};
  else state.errors.unshift(err);
}
