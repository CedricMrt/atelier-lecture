# Atelier Lecture — Guide rapide

Aucune installation : tout est dans le ZIP (l'application, Node.js et les modules). Il n'y a pas besoin d'internet sur le PC.

## Première installation (une seule fois)

1. Télécharge le fichier `atelier-lecture-vX.Y.Z-windows.zip` depuis la page **Releases** de GitHub.
2. Clique droit sur le fichier, puis **Extraire tout**.
3. Choisis un dossier simple, par exemple `C:\AtelierLecture`.
   Évite le Bureau et les Documents s'ils sont synchronisés avec OneDrive : la base de données se corromprait.
4. Ouvre le dossier extrait et double-clique sur `DEMARRER.bat`.
5. Windows demande d'autoriser le pare-feu : clique sur **Autoriser l'accès** (réseaux privés **et** publics si la case existe).
   Si la fenêtre n'apparaît pas ou si les tablettes n'arrivent pas à se connecter, clic droit sur `AUTORISER-PARE-FEU.bat` puis **Exécuter en tant qu'administrateur**.

## Ajouter les élèves (une seule fois, puis à chaque nouvel élève)

1. Sur le PC, ouvre l'espace enseignant (il s'ouvre au démarrage) et connecte-toi.
2. Dans **Ajouter un élève**, écris le nom complet (visible seulement sur le PC), vérifie le prénom affiché sur la tablette, choisis un avatar, puis clique sur **Ajouter l'élève**.
3. Quand tous les élèves sont créés, clique sur **Imprimer les cartes** : chaque carte porte le prénom, l'avatar et un QR code. Découpe-les et plastifie-les.
4. Sur la tablette, l'élève présente sa carte devant la caméra pour se connecter. S'il n'a pas sa carte, il peut aussi choisir son prénom dans la liste.

Un élève sans aucun résultat peut être supprimé depuis sa fiche. Un élève qui a déjà joué ne peut pas l'être, pour ne jamais perdre son historique.

## Chaque séance

1. Allume le PC et connecte-le au Wi-Fi de l'école.
2. Double-clique sur `DEMARRER.bat`.
3. Laisse la fenêtre noire ouverte pendant toute la séance.
4. Note l'adresse affichée, par exemple `https://192.168.1.50:3000`.
   Si plusieurs adresses sont affichées, essaie d'abord la première.
5. Connecte les tablettes au même Wi-Fi, puis ouvre cette adresse dans Chrome.

### Le message « Votre connexion n'est pas privée »

C'est normal : l'application fabrique elle-même son certificat de sécurité. Sur chaque tablette, la première fois :

1. Touche **Paramètres avancés**.
2. Touche **Continuer vers … (dangereux)**.

Une fois fait, la tablette s'en souvient.

### Tester qu'une tablette atteint bien le PC

Ouvre `https://ADRESSE:3000/api/health` dans Chrome sur la tablette. Si une réponse s'affiche, tout est bon.

## Après la séance

1. Sur le PC, ouvre l'espace enseignant (il s'ouvre tout seul au démarrage).
2. Choisis un élève et consulte ses séances et ses résultats.
3. Ferme la fenêtre noire pour arrêter le serveur.

## Sauvegardes

- Une sauvegarde est faite **automatiquement à chaque démarrage** (au plus une par heure).
- Pour en faire une tout de suite : double-clique sur `SAUVEGARDER.bat`.
- Les sauvegardes sont dans le dossier `backups`. Les 30 dernières sont conservées.
- Copie de temps en temps ce dossier sur une clé USB.

### Restaurer une sauvegarde

1. Ferme la fenêtre noire (le serveur doit être arrêté).
2. Dans `backups`, repère la sauvegarde voulue : `atelier-lecture-AAAA-MM-JJ_HH-MM-SS.db`.
3. Dans `apps\server\data`, supprime les fichiers `atelier-lecture-v1.db-wal` et `atelier-lecture-v1.db-shm` s'ils existent.
4. Copie la sauvegarde dans `apps\server\data` et renomme-la **`atelier-lecture-v1.db`** (remplace l'ancien fichier).
5. Si besoin, fais de même avec le fichier `…-teachers.json` de la même date : renomme-le `teachers.json`.
6. Relance `DEMARRER.bat`.

## Si cela ne fonctionne pas

- Le PC et les tablettes sont-ils sur le **même Wi-Fi** ? Certains Wi-Fi d'école isolent les appareils entre eux : dans ce cas, demande une autre box, ou partage la connexion d'un téléphone et connecte-y le PC et les tablettes.
- La fenêtre noire est-elle toujours ouverte ?
- L'adresse tapée sur la tablette est-elle exactement celle affichée dans la fenêtre noire ?
- Rien ne s'ouvre sur la tablette : lance `AUTORISER-PARE-FEU.bat` en administrateur.
- L'adresse du PC a changé (autre Wi-Fi, redémarrage de la box) : un nouveau certificat est créé automatiquement. Sur les tablettes, accepte de nouveau l'avertissement. Pour éviter cela, demande de réserver une adresse fixe pour ce PC dans la box.
- Le Wi-Fi tombe en cours de séance : les élèves peuvent terminer ; les résultats sont envoyés quand le Wi-Fi revient.
- L'application ne se lance pas du tout : vérifie que tu as bien **extrait** le ZIP (et que tu n'ouvres pas `DEMARRER.bat` depuis l'aperçu du ZIP).
