# Jeux de lecture : application Android (Godot 4)

Application pour enfants de 5 à 8 ans : six mini-jeux de lecture, sans compte ni serveur.
Tout reste sur l'appareil. Indépendante de l'appli de classe (`apps/`).

## État actuel

- Écran « Qui joue ? » : profils locaux (prénom + avatar), « Gérer » protégé par une question d'adulte.
- Progression par jeu et par joueur, niveaux adaptatifs (1 à 3), étoiles. Fichier : `user://profiles.json`.
- Voix : synthèse vocale du système (`DisplayServer.tts_*`), voix française cherchée au démarrage.
- Pub : **simulation** avant un jeu (jamais au lancement, un jeu sur quatre au plus, 3 minutes d'écart minimum).
- Jeu 1 **Pont du volcan** jouable, décor et personnage provisoires (dessinés par code, en 2D).
- Les cinq autres jeux sont annoncés « Bientôt ».
- Paysage uniquement, rendu « GL Compatibility » (fonctionne sur les tablettes d'entrée de gamme).

## Ouvrir et lancer sur le PC

1. Installer **Godot 4.3 ou plus récent** (version standard, pas « .NET ») : https://godotengine.org
2. Godot → *Importer* → choisir `android/project.godot`.
3. Touche F5 pour lancer. Si Godot propose de convertir le projet vers sa version, accepter.

Sur PC, la voix française dépend des voix Windows installées.

## Vérifier la logique

Depuis le dossier `android/` :

```bash
godot --headless --path . --script tests/run_tests.gd
```

Code de sortie 0 si tout passe. (Remplacer `godot` par le chemin de l'exécutable si besoin.)

## Fabriquer l'APK pour ton téléphone

Prérequis : **JDK 17**, **Android Studio** (pour le SDK Android), et un téléphone en mode développeur.

1. Godot → *Éditeur → Paramètres de l'éditeur → Export → Android* : indiquer le dossier du SDK et celui du JDK.
2. *Projet → Installer le modèle d'exportation* (une seule fois).
3. *Projet → Exporter… → Ajouter… → Android*. Cocher **Use Gradle Build** n'est pas nécessaire pour un premier essai.
4. Brancher le téléphone, activer le débogage USB, puis bouton « Déploiement en un clic » en haut à droite.

**Avant de publier**, dans le préréglage d'export : changer l'identifiant du paquet
(`com.tonnom.jeuxdelecture`, il ne pourra plus changer après publication) et créer une clé de
signature (à sauvegarder précieusement). `export_presets.cfg` est ignoré par Git parce qu'il peut
contenir les mots de passe de la clé.

## Organisation

```
android/
  project.godot
  scenes/main.tscn          scène de départ (le reste est construit par code)
  scripts/
    main.gd                 passe d'un écran à l'autre, bouton « retour » d'Android
    autoload/               profiles.gd (sauvegarde), speech.gd (voix), ads.gd (moment des pubs)
    data/                   games.gd (catalogue), avatars.gd
    logic/                  règles pures, testées : progression, pubs, Pont du volcan
    screens/                who_plays.gd, home.gd, game_host.gd
    games/                  un fichier par jeu (volcano_game.gd)
    ui/                     boutons, boîtes de dialogue, avatars, étoiles
  tests/run_tests.gd
  assets/                   modèles 3D (glTF/GLB uniquement), images, sons (voir CREDITS.md)
```

## À prévoir ensuite

- Vrais graphismes en 3D (voir `CREDITS.md`) : personnages, décors, avatars, écran des mondes.
- Image-indice des mots : déposer `assets/images/words/<mot>.png`, elle s'affichera toute seule.
- Sons et musique libres de droits.
- Les cinq autres jeux.
- Vrai plugin publicitaire certifié « Familles » (pubs de test pendant le développement).
- Vérifier la sauvegarde automatique d'Android (restauration des profils sur un nouveau téléphone).
