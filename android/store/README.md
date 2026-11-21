# Publier « Lettres en Quête » sur le Google Play Store

Ce dossier contient tout ce qu'il faut préparer pour la fiche du Play Store.
Toutes les informations de l'éditeur sont renseignées ; il manque les captures d'écran et la mise en ligne de la page de confidentialité.

| Fichier | Contenu |
|---|---|
| `icon-512.png` | Icône de l'appli pour la fiche (512 × 512, obligatoire) |
| `feature-graphic-1024x500.png` | Image de présentation en haut de la fiche (1024 × 500, obligatoire) |
| `listing-fr.md` | Titre, descriptions, catégorie, réponses aux questionnaires (public cible, classification) |
| `privacy-policy-fr.md` | Politique de confidentialité (obligatoire pour une appli d'enfants) |
| `data-safety.md` | Réponses au formulaire « Sécurité des données » |
| `export-android.md` | Fabriquer le fichier `.aab` avec Godot, étape par étape |
| `../assets/icons/` | Icône adaptative Android (premier plan + fond), à brancher dans l'export |

## Ce qui manque encore et ne peut pas être fait ici

- **Les captures d'écran** : il faut au moins 2 captures de téléphone, et si possible 7 et 10 pouces
  (paysage). À prendre dans Godot ou sur la tablette quand les jeux seront finis.
- **Le vrai SDK publicitaire** (voir `data-safety.md`) : la pub est encore simulée.
- **Un compte développeur Google Play** (frais uniques, vérification d'identité) : https://play.google.com/console
- **Une adresse web publique pour la politique de confidentialité** (voir plus bas).

## Les règles du Play Store qui comptent pour cette appli (vérifiées en novembre 2026)

1. **Version d'Android visée** : depuis le 31 août 2026, une nouvelle appli doit viser **Android 16 (API 36)** ou plus.
   Source : https://developer.android.com/google/play/requirements/target-sdk
2. **Format** : le Play Store n'accepte que des fichiers **`.aab`** (pas `.apk`) pour les nouvelles applis.
3. **Comptes personnels créés après le 13 novembre 2023** (ton cas : compte personnel) : avant de publier pour tout le monde, il faut un
   **test fermé avec au moins 12 testeurs inscrits en continu pendant 14 jours**, puis demander l'accès à la production
   (examen par Google, en général sous 7 jours). Source : https://support.google.com/googleplay/android-developer/answer/14151465
   Un compte « organisation » n'a pas cette obligation.
4. **Programme « Familles »** (appli pour enfants) : https://support.google.com/googleplay/android-developer/answer/9893335
   - choisir la tranche d'âge **6-8 ans** (la tranche « 5 ans et moins » est réservée aux tout-petits) ;
   - **uniquement des SDK publicitaires auto-certifiés « Familles »**, **sans publicité personnalisée** ni remarketing ;
   - **pas d'interstitiel au lancement de l'appli** ; une pub qui interrompt le jeu doit pouvoir être **fermée au bout de 5 secondes** ;
   - une seule pub à la fois à l'écran ; pubs clairement distinctes du jeu, sans piège à clics ;
   - **ne pas envoyer l'identifiant publicitaire Android** ; ne pas demander la permission `AD_ID` ; pas de localisation ;
   - politique de confidentialité exacte, conforme au **RGPD** et au **COPPA** (États-Unis).
5. **Politique de confidentialité en ligne** : le Play Store demande l'adresse d'une **page web publique** (pas un PDF).
   Options simples : une page GitHub Pages, un Google Sites, ou en attendant la version affichée du fichier
   `privacy-policy-fr.md` sur GitHub une fois la branche fusionnée dans `main`.

## Identifiant du paquet (« package name »)

C'est le nom technique unique de l'appli sur Android, de la forme `lettres.separees.par.des.points`.
Il n'y a **rien à demander ni à acheter** : tu le choisis toi-même, une seule fois, et Google vérifie à l'envoi
qu'il n'est pas déjà pris. **Après la première publication, il ne peut plus jamais changer.**

Règles : au moins deux segments séparés par des points ; chaque segment commence par une lettre ; seulement des
minuscules, des chiffres et des tirets bas (`_`) ; pas de tiret `-`, pas d'accent, pas d'espace.

Par convention on écrit un nom de site à l'envers (`com.exemple.appli`). Comme tu n'as pas de site à toi, la
convention des projets GitHub est d'utiliser `io.github.` + ton nom d'utilisateur GitHub :

```
io.github.cedricmrt.lettresenquete
```

**C'est la valeur choisie** (elle ne s'affiche jamais aux enfants, qui voient « Lettres en Quête »). Ne la change plus.

## Page de confidentialité (GitHub Pages)

Adresse publique à donner au Play Store : **https://cedricmrt.github.io/atelier-lecture/confidentialite.html**
(page d'accueil du site : https://cedricmrt.github.io/atelier-lecture/).

Le site est fabriqué à partir de `privacy-policy-fr.md` par `site/build_site.py` et publié par la branche `gh-pages`
(qui ne contient que ces pages). **Mise en service, une seule fois** : sur GitHub, dépôt → *Settings* → *Pages* →
*Build and deployment* → *Source : Deploy from a branch* → *Branch : `gh-pages`*, dossier **`/ (root)`** → *Save*.
Après 1 à 2 minutes, l'adresse ci-dessus s'ouvre (le haut de la page *Pages* affiche « Your site is live at… »).

**Pour modifier la politique plus tard** : modifie `privacy-policy-fr.md` (et la date), puis demande-moi de régénérer
la branche `gh-pages` (ou lance `python3 android/store/site/build_site.py <dossier>` avec le module `markdown`, et
copie le résultat dans la branche `gh-pages`). Le Play Store lit la page en ligne : tant qu'elle n'est pas à jour,
la politique publique reste l'ancienne.

## Ordre conseillé

1. Terminer les jeux et brancher la pub « Familles » (ou publier d'abord sans pub, c'est permis).
2. Mettre la page de confidentialité en ligne (section ci-dessus), puis reporter son adresse dans la Play Console.
3. Fabriquer le `.aab` (`export-android.md`), le tester sur une vraie tablette avec le fichier `.apk` de test.
4. Créer l'appli dans la Play Console, remplir « Contenu de l'appli » (public cible, pubs, classification, sécurité des données).
5. Lancer le **test fermé** (12 testeurs, 14 jours), puis demander la production.
