# Brancher la vraie publicité (AdMob) : marche à suivre

Le code est prêt : `scripts/autoload/ads.gd` (quand), `scripts/ads/ad_backend_admob.gd` (comment),
`scripts/data/ad_config.gd` (identifiants). **Sans le plugin, l'appli fonctionne quand même** :
sur PC, une fenêtre de simulation ; dans une version publiée, aucune pub.

## ⚠️ À savoir avant de choisir : certification « Familles »

L'appli vise des enfants de 6 à 8 ans : Google Play n'autorise **que des SDK publicitaires auto-certifiés « Familles »**.

- Le plugin utilisé (Poing Studios, gratuit, Asset Library de Godot) embarque le « **Next-Gen Google Mobile Ads SDK** »
  (`com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk`).
- Dans la liste officielle des SDK certifiés « Familles » que j'ai consultée en novembre 2026 figure
  `com.google.android.gms:play-services-ads` (version 19.0.0 ou plus), **pas** ce nouveau SDK. À ce jour je ne peux pas
  affirmer que le plugin est accepté pour une appli « Familles ».
- Le dépôt de la bibliothèque Android du plugin a été archivé en mars 2026.

**Comment lever le doute (avant de dépenser du temps) :**

1. Play Console → **Play SDK Console** : cherche « Google Mobile Ads » ; c'est la référence qui dit si le SDK est certifié.
2. Après un premier envoi en test, la Play Console affiche des **avertissements** si un SDK n'est pas conforme.
3. Au besoin, demande au support AdMob : « Le Next-Gen Google Mobile Ads SDK est-il certifié Google Play Families ? »

**Solution toujours possible :** publier d'abord **sans pub** (permis, et le plus simple pour réussir le test fermé de 14 jours),
puis ajouter la pub dans une mise à jour quand le point est clair. Le code gère ce cas : l'ID d'unité vide = aucune pub.

## Étapes

### 1. Compte AdMob (une fois)
1. https://admob.google.com → se connecter avec le compte Google de l'éditeur → créer le compte.
2. *Applications → Ajouter une application* → Android → « Non, elle n'est pas encore publiée » → nom « Lettres en Quête ».
3. Dans *Paramètres de l'appli* (ou lors de la création) : indiquer que l'appli est **destinée aux enfants** (traitement
   destiné aux enfants activé).
4. *Blocage des annonces → Catégories sensibles* : bloquer tout ce qui n'est pas pour enfants (jeux d'argent, rencontres, alcool, etc.).
5. Noter l'**ID de l'appli** (`ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ`, avec un `~`).
6. *Blocs d'annonces → Ajouter un bloc → Interstitielle* → nom « Avant un jeu ». Noter l'**ID du bloc**
   (`ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`, avec un `/`).

### 2. Installer le plugin dans Godot
1. Godot → onglet **AssetLib** → chercher « AdMob » (Poing Studios) → Télécharger → Installer (tout cocher).
2. *Projet → Réglages du projet → Plugins* : cocher **Activer** pour le plugin.
3. *Projet → Réglages du projet → Admob → General → Android* : cocher **Enabled** et coller l'**ID de l'appli** (celui avec `~`).
   Pour les essais, tu peux garder l'ID d'appli de test de Google : `ca-app-pub-3940256099942544~3347511713`.
4. *Projet → Installer un modèle de compilation Android* (une fois), puis dans le préréglage d'export Android :
   cocher **Use Gradle Build**.
5. Valider les nouveaux fichiers créés par Godot (`.uid`, `.import`) avec Git, sauf `export_presets.cfg` et `android/android/build/` (ignorés).

### 3. Mettre ton ID d'unité
Dans `scripts/data/ad_config.gd`, renseigner `INTERSTITIAL_ANDROID` avec l'ID du bloc (avec `/`).
- En développement (export « avec debug », éditeur) : **toujours les pubs de test** de Google, jamais tes vraies pubs.
- En version publiée (export sans debug) : ton ID.
- **Ne jamais cliquer sur de vraies pubs avec son propre compte** (Google peut suspendre le compte).

### 4. Retirer l'identifiant publicitaire (obligatoire « Familles »)
Le SDK de Google réclame la permission `AD_ID`. Une appli « Familles » ne doit **pas** l'avoir.
C'est **automatique** : le petit plugin `addons/no_ad_id/` (déjà dans le dépôt) ajoute au manifeste de chaque export Android
la consigne `tools:node="remove"` pour cette permission. Il suffit qu'il soit **activé** (*Projet → Réglages du projet → Plugins*).
Rien à modifier à la main dans `android/android/build/`.

**Vérifier sur l'APK/AAB exporté** (PowerShell, adapter le chemin de l'APK) :

```
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.1\aapt2.exe" dump permissions "C:\chemin\vers\lettres-en-quete.apk"
```

La liste doit contenir `INTERNET` et `ACCESS_NETWORK_STATE`, et **ne pas** contenir `com.google.android.gms.permission.AD_ID`.
Si la compilation Gradle se plaint d'un préfixe `tools` inconnu, dis-le : on ajoutera la déclaration `xmlns:tools` dans le modèle.
Dans la Play Console, rubrique « Contenu de l'appli → ID de publicité » : réponse **Non**.

### 5. Essayer sur la tablette
1. Export avec debug, installation sur un appareil réel (les pubs ne s'affichent pas dans l'éditeur sur PC).
2. Lancer l'appli, choisir un joueur, jouer un 1ᵉʳ jeu (pas de pub), en lancer d'autres : à partir du 4ᵉ jeu, ou après 3 minutes
   si un jeu a déjà eu sa pub, une pub « Test Ad » apparaît avant le jeu.
3. Journal (`adb logcat`) : chercher « Ads : » pour les messages d'avertissement.
4. Si une classe du plugin est signalée « introuvable » : corriger le nom **uniquement** dans `ad_backend_admob.gd`.

### 6. Avant la publication
- `data-safety.md` : répondre « Oui » à la collecte (voir ce fichier) ; relire la politique de confidentialité (section 4).
- Play Console → Contenu de l'appli → **Pubs : oui** ; Public cible : 6-8 ans ; ID de publicité : non.
- Les pubs interstitielles doivent pouvoir être fermées par l'adulte/l'enfant ; AdMob le gère pour les pubs standard.
- Construire l'export **sans debug** pour la publication (sinon la simulation et les pubs de test restent actives).
