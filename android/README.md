# Jeux de lecture — application Android

Application pour enfants de 5 à 8 ans : six mini-jeux de lecture, sans compte ni serveur.
Tout reste sur l'appareil. Indépendante de l'appli de classe (`apps/`).

## État actuel

- Écran « Qui joue ? » : profils locaux (prénom + avatar), protégés par une question pour les adultes.
- Progression par jeu et par joueur, niveaux qui s'adaptent (1 à 3), étoiles.
- Voix : synthèse vocale du téléphone (Web Speech API de la WebView).
- Pub : **simulation** avant un jeu (jamais au lancement, un jeu sur quatre au plus, au moins 3 minutes d'écart). Le vrai SDK sera branché plus tard.
- Jeu 1 **Pont du volcan** jouable, avec des formes provisoires. Les cinq autres jeux sont annoncés « Bientôt ».

## Lancer sur ton PC (dans le navigateur)

```bash
pnpm install
pnpm dev:android
```

Ouvre l'adresse affichée (port 5174). Pour entendre la voix, utilise Chrome.

## Vérifier la logique

```bash
pnpm --filter lecture-android run test:logic
```

## Fabriquer l'appli Android (une seule fois : ajouter Capacitor)

Prérequis : Android Studio installé, un téléphone Android en mode développeur.

```bash
cd android
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli
pnpm build
npx cap add android
```

Puis, **avant de publier**, change `appId` dans `capacitor.config.json` : l'identifiant
(du type `com.tonnom.jeuxdelecture`) ne pourra plus être modifié une fois l'appli publiée.

Ouvre `android/android/app/src/main/AndroidManifest.xml` et, dans la balise `<activity …>`,
ajoute `android:screenOrientation="sensorLandscape"` pour forcer le mode paysage.

À chaque modification du code :

```bash
pnpm build
npx cap sync android
npx cap open android      # ouvre Android Studio, puis « Run » sur ton téléphone
```

## À prévoir ensuite

- Vrais graphismes (voir `CREDITS.md`) : personnages, décors, avatars, étoiles.
- Sons et musique libres de droits.
- Les cinq autres jeux.
- Vrai SDK publicitaire certifié « Familles » (pubs de test pendant le développement).
- Police arrondie embarquée dans l'appli (l'appli doit marcher hors connexion).
- Bouton « retour » d'Android et mode plein écran.
