# Candice Révisions – v2

Application Web statique compatible GitHub Pages.

## Nouveautés v2

- Import de nouvelles leçons au format JSON.
- Sauvegarde locale des réponses dans le navigateur.
- Cahier d’erreurs automatique.
- Révision adaptative : erreurs récentes, leçons actives, matières prioritaires.
- Export Markdown du bilan.
- Export/import JSON de sauvegarde.
- Structure compatible GitHub Pages : `index.html` à la racine.

## Publication GitHub Pages

Déposer directement ces fichiers à la racine du repo :

```txt
index.html
src/
data/
archives/
README.md
```

Puis vérifier :

```txt
Settings > Pages > Branch > main / root
```

## Format d’import d’une leçon

```json
{
  "lessons": [
    {
      "id": "italien_sentiments",
      "matiere": "italien",
      "niveau": "5e",
      "titre": "Émotions et sentiments",
      "statut": "active",
      "mots_cles": ["sentiments", "accord"],
      "points_importants": ["Les adjectifs s’accordent au masculin et au féminin."],
      "questions": [
        {
          "type": "texte",
          "question": "Comment dit-on : je suis contente ?",
          "reponse": "sono contenta",
          "correction": "Contenta est au féminin.",
          "point_a_retenir": "Les adjectifs s’accordent."
        }
      ]
    }
  ]
}
```

## Limite volontaire

La sauvegarde est locale au navigateur utilisé. Pour changer d’appareil, utiliser l’export/import JSON.
