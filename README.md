# Candice Révisions

Application statique pour créer et utiliser un fichier HTML autonome de révision niveau 5e.

Le dépôt sert à produire des entraînements courts, utilisables sur PC ou téléphone, sans serveur et sans compte. L'IA intervient en amont pour transformer les cours, photos, devoirs ou contrôles corrigés en fichiers JSON. L'application HTML sert ensuite à s'entraîner : répondre, afficher la correction, marquer les erreurs et refaire les questions ratées.

## Utilisation immédiate

Le fichier `index.html` à la racine peut être ouvert directement dans un navigateur ou publié avec GitHub Pages.

## Génération locale

```bash
npm install
npm run build
```

Le script produit :

```text
dist/candice-revisions.html
index.html
```

## Ajouter une leçon

Créer un fichier JSON dans `content/5e/<matiere>/`, puis relancer :

```bash
npm run build
```

## Types de questions disponibles

- `carte` : question courte, correction à révéler.
- `libre` : réponse écrite libre, correction à comparer.
- `qcm` : choix unique.
- `erreur` : correction d'une erreur volontaire.
- `reponse_longue` : réponse rédigée avec niveaux minimale / correcte / complète.
- `oral` : entraînement oral avec phrase modèle.

## Principe pédagogique

L'application privilégie les formats courts : rappel actif, corrections immédiates, erreurs à refaire, réponses justifiées. Elle ne cherche pas à remplacer le cours ni à faire le travail à la place de l'élève. Elle sert à automatiser les révisions répétitives.

## Flux conseillé

1. Photographier le cours, la consigne ou le contrôle corrigé.
2. Demander à ChatGPT de produire un questionnaire JSON.
3. Placer le fichier JSON dans `content/5e/<matiere>/`.
4. Relancer `npm run build`.
5. Donner à Candice le fichier HTML généré.