# Atelier Lecture

Application d’entraînement à la lecture, au rythme et aux sons pour le CP-CE1.

L’application permet à l’AESH et aux enseignantes de faire travailler des élèves de CP-CE1, par groupes, au cours de séances courtes de 20 minutes. Elle propose un parcours adaptatif inspiré des mécaniques de Poppins, autour du rythme, de la phonologie, de la graphophonologie, de l’empan visuo-attentionnel, de la lecture et de la compréhension.

Elle doit être simple à préparer, utilisable hors ligne et consultable depuis le PC de la classe.

## Technologies

### Application tablette

- React 18 ou 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Phaser 3
- Dexie.js
- dexie-react-hooks
- vite-plugin-pwa
- Workbox

### Serveur PC

- Node.js 20 LTS
- TypeScript
- Express
- better-sqlite3
- Zod pour valider les requêtes
- jsonwebtoken ou session cookie pour l’authentification enseignante
- bcrypt pour les mots de passe
- PDFKit ou Puppeteer pour les exports PDF
- helmet et cors pour la sécurité

## Structure du projet

```text
apps/tablet/src/
├── pages/
│   ├── ScanCardPage.tsx
│   ├── ConfirmStudentPage.tsx
│   ├── IslandPage.tsx
│   ├── SessionPage.tsx
│   ├── GamePage.tsx
│   ├── ActivityEndPage.tsx
│   ├── SessionEndPage.tsx
│   └── ManualLoginPage.tsx
├── games/
│   ├── RhythmDrumGame.tsx
│   ├── MelodyIslandsGame.tsx
│   ├── SoundHuntGame.tsx
│   ├── LetterSoundGame.tsx
│   ├── SyllableChefGame.tsx
│   ├── WordBuilderGame.tsx
│   ├── FlashWordGame.tsx
│   └── GuidedReadingGame.tsx
├── db/
│   ├── db.ts
│   ├── students.ts
│   ├── sessions.ts
│   ├── results.ts
│   ├── contents.ts
│   └── syncQueue.ts
└── services/
    ├── api.ts
    ├── sync.ts
    ├── audio.ts
    ├── qrScanner.ts
    └── adaptivePath.ts
```

## Script de lancement

Un script Windows pourra :

1. Vérifier que Node.js est installé.
2. Créer les dossiers `data`, `media`, `backups` et `logs`.
3. Créer la base SQLite si elle n’existe pas.
4. Lancer le serveur Express.
5. Ouvrir automatiquement l’interface enseignante dans le navigateur.
6. Afficher l’adresse à saisir sur les tablettes.

Exemple d’adresse :

```text
https://192.168.1.50:3000
```

## Sauvegardes

- Sauvegarde automatique toutes les heures.
- Sauvegarde à la fermeture du serveur.
- Conservation des 30 dernières sauvegardes.
- Dossier : `C:\AtelierLecture\backups\`.
- Export CSV ou PDF possible depuis l’interface enseignante.
