export function buildMarkdownReport(state) {
  const now = new Date().toLocaleString("fr-FR");
  const attempts = state.attempts || [];
  const errors = state.errors || [];
  const activeErrors = errors.filter(e => e.etat !== "stabilisee");
  const bySubject = group(attempts, "matiere");

  let md = `# Bilan de révision – Candice\n\nDate d’export : ${now}\n\n`;
  md += `## Synthèse\n\n`;
  md += `- Réponses enregistrées : ${attempts.length}\n`;
  md += `- Erreurs actives : ${activeErrors.length}\n`;
  md += `- Erreurs stabilisées : ${errors.filter(e => e.etat === "stabilisee").length}\n`;
  md += `- Leçons disponibles : ${(state.lessons || []).length}\n\n`;

  md += `## Par matière\n\n`;
  for (const [matiere, rows] of Object.entries(bySubject)) {
    const ok = rows.filter(r => r.correct).length;
    md += `- ${matiere} : ${ok}/${rows.length} réponses justes\n`;
  }

  md += `\n## Points importants des leçons actives\n\n`;
  for (const lesson of (state.lessons || []).filter(l => l.statut !== "archivee")) {
    md += `### ${lesson.matiere} – ${lesson.titre}\n`;
    for (const p of lesson.points_importants || []) md += `- ${p}\n`;
    md += `\n`;
  }

  md += `## Cahier d’erreurs actif\n\n`;
  if (!activeErrors.length) md += `Aucune erreur active.\n\n`;
  for (const e of activeErrors) {
    md += `### ${e.matiere} – ${e.lecon}\n`;
    md += `- Erreur : ${e.erreur}\n`;
    md += `- Cause : ${e.cause}\n`;
    md += `- Règle : ${e.regle}\n`;
    md += `- Mini-exercice : ${e.mini_exercice}\n`;
    md += `- Correction : ${e.correction || ""}\n\n`;
  }

  md += `## Dernières réponses\n\n`;
  for (const a of attempts.slice(-20).reverse()) {
    md += `- ${a.correct ? "✓" : "✗"} ${a.matiere} – ${a.question} → ${a.reponse_donnee || "(vide)"}\n`;
  }
  return md;
}

function group(rows, key) {
  return rows.reduce((acc,r)=>{const k=r[key]||"Autre";(acc[k] ||= []).push(r);return acc;}, {});
}
