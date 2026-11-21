# Fabriquer le fichier `.aab` avec Godot

Résumé de la documentation Godot 4.7 et d'Android (https://docs.godotengine.org/en/4.7/tutorials/export/exporting_for_android.html).
Je n'ai pas pu lancer l'export moi-même : vérifie chaque réglage dans l'éditeur, les menus peuvent changer d'une version à l'autre.

## 1. Installer les outils (une seule fois)

1. **JDK** : OpenJDK 17 (les versions plus récentes marchent, la 17 est la plus sûre).
2. **SDK Android** : via Android Studio, ou en ligne de commande avec `sdkmanager`. Packages demandés par la doc Godot 4.7 :
   *Platform-Tools*, *Build-Tools 35.0.1*, *Platform Android 35*, *Command-line Tools*, *CMake 3.10.2.4988404*, *NDK r28b*.
   **Le Play Store exige maintenant de viser Android 16 (API 36)** : installe aussi « Android SDK Platform 36 »
   et lis plus bas la ligne « Target SDK ».
3. Godot → **Éditeur → Paramètres de l'éditeur → Export → Android** : renseigner « Java SDK Path » et « Android SDK Path ».
4. Godot → **Projet → Installer le modèle de build Android** (génère `android/build/`, ignoré par Git).
5. Installer les **modèles d'export** de la même version que Godot (Éditeur → Gérer les modèles d'export).

## 2. Créer la clé de signature (une seule fois, à garder précieusement)

```
keytool -v -genkey -keystore lettres-en-quete.keystore -alias lettres -keyalg RSA -keysize 2048 -validity 10000
```

- Garde le fichier `.keystore` et son mot de passe **hors du dépôt Git** (le `.gitignore` ignore déjà `*.keystore` et `*.jks`),
  et fais-en **deux copies** (clé USB, gestionnaire de mots de passe).
- Dans la Play Console, laisse **Play App Signing** activé (c'est la valeur par défaut) : Google garde la clé de distribution,
  et ta clé n'est que la « clé d'envoi ». Si tu la perds, Google peut la réinitialiser.
- Godot veut le **même mot de passe** pour le keystore et pour la clé.

## 3. Régler le préréglage d'export

Projet → Exporter → Ajouter… → **Android**. Réglages à vérifier :

| Réglage | Valeur |
|---|---|
| Utiliser le build Gradle (*Gradle Build → Use Gradle Build*) | **Activé** |
| Format d'export (*Export Format*) | **Export AAB** |
| Architectures | **arm64-v8a** (et armeabi-v7a pour de vieilles tablettes si tu veux) |
| Version Min SDK | 24 (Android 7) ou plus |
| **Version Target SDK** | **36** (ou plus) : exigé par le Play Store depuis le 31 août 2026 |
| Identifiant unique du paquet (*Package → Unique Name*) | `io.github.cedricmrt.lettresenquete` (proposé : **à confirmer avant le premier envoi, il ne change plus jamais** ; voir `README.md`, section « Identifiant du paquet ») |
| Nom de l'appli (*Package → Name*) | `Lettres en Quête` |
| Code de version (*Version → Code*) | `1`, puis +1 à chaque envoi |
| Nom de version (*Version → Name*) | `0.1.0` |
| Orientation | **Paysage (capteur)** : déjà réglé dans le projet |
| Mode immersif (*Screen → Immersive Mode*) | Activé (cache les barres Android) |
| Icône principale | `assets/images/logo_appli.png` (au moins 192 × 192) |
| Icône adaptative : premier plan | `assets/icons/adaptive_foreground.png` |
| Icône adaptative : fond | `assets/icons/adaptive_background.png` |
| Permissions | **Aucune cochée** (tant que la pub n'est pas branchée ; le SDK publicitaire ajoutera `INTERNET`). **Surtout pas `AD_ID`.** |
| Clé de signature en release (*Keystore → Release / Release User / Release Password*) | chemin du `.keystore`, alias, mot de passe |
| *Export With Debug* | **Décoché** pour l'envoi au Play Store |

À vérifier aussi : si le préréglage propose de **désactiver la sauvegarde automatique Android**, décide-le
selon la politique de confidentialité (section 3). Le fichier `export_presets.cfg` n'est pas versionné
(il peut contenir des mots de passe) ; l'icône monochrome (Android 13+) est facultative.

## 4. Exporter et tester

1. Projet → Exporter → préréglage Android → décocher *Export With Debug* → **Exporter le projet** → `lettres-en-quete.aab`.
2. Pour essayer sur une vraie tablette avant le Play Store : exporte aussi un **`.apk`** (même préréglage, *Export Format* = APK, avec debug),
   active le « mode développeur » + « débogage USB » sur la tablette, branche-la, et utilise le bouton Android de Godot (lecture directe).
3. Teste : démarrage, profils, voix française, jeu 1, jeu 2, bouton « retour », rotation, mise en veille et reprise.

## 5. Envoyer au Play Store

Play Console → ton appli → **Test fermé** → Créer une version → envoie le `.aab`.
Ajoute au moins 12 testeurs (adresses Gmail) et garde-les inscrits 14 jours : c'est la règle des comptes personnels récents
(voir `README.md`). Après cela, demande l'accès à la production.

## 6. 16 Ko et fichiers à vérifier

Google impose aussi que les applis ciblant les versions récentes d'Android fonctionnent sur les appareils à
« pages mémoire de 16 Ko » (rapport « pré-lancement » de la Play Console). Les versions récentes de Godot gèrent cela avec le NDK r28 :
si la Play Console signale un problème à l'envoi, note le message et reviens vers moi.
