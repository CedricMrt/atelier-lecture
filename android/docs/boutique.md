# Boutique - catalogue valide

Document de reference avant de coder la boutique. Prix en etoiles (repere : une partie d'environ 10 questions = 100 etoiles, a ajuster).

## Regles

- Un objet achete suit le joueur, quel que soit son avatar.
- Un objet n'est propose et porte que sur les personnages compatibles (voir tableaux). S'il change d'avatar, les objets incompatibles restent possedes mais ne sont plus proposes ni portes.
- Les pieces d'origine (casque du Chevalier, etc.) ne s'affichent que sur leur personnage.
- Essayage visuel gratuit sur l'avatar d'apercu avant achat.
- Onglets : Tete, Dos, Main. Cartes : acheter / possede / equipe. Acces depuis "A quoi on joue".
- Public 5-8 ans : pas d'armes a feu, pas d'objets effrayants.
- Les prix sont regroupes dans un seul fichier du code, faciles a modifier.

## 1. Personnages pirates (achat complet, avec leur arme de base, aucun achat supplementaire)

| Personnage | Prix |
|---|---|
| Anne (Weapon_DoubleAxe) | 850 |
| Henry (Weapon_Lute) | 850 |
| Mako (Weapon_Sword) | 850 |
| Capitaine Barbarossa (Weapon_Cutlass, perroquet Ernest inclus) | 1050 |

Rig "pirate" : animations integrees (Idle, Jump, Wave, Walk, Run...). Exclus : Sharky, Skeleton (pirate).
Note : l'arme de Barbarossa est attachee a Middle1_R, les autres a Middle1_L.

## 2. Pieces d'origine des avatars KayKit (17)

| Type | Personnage et piece | Prix |
|---|---|---|
| Capes (6) | Chevalier, Mage, Ranger, Rodeur, Voleur, Squelette rodeur | 200 |
| Manteaux (2) | Squelette guerrier, Squelette sbire | 200 |
| Coiffes (6) | casque du Chevalier, chapeau du Mage, bonnet d'ours du Barbare, casque du Squelette guerrier, chapeau du Squelette mage, capuche du Squelette rodeur | 250 |
| Visiere (1) | Chevalier | 150 |
| Masque (1) | Voleur a capuche | 200 |
| Carquois (1) | Ranger | 150 |

Le Squelette mage n'a pas de cape. Le Voleur a capuche garde sa capuche integree a la tete.

## 3. Onglet Main - compatibilite par personnage

| Personnage | Objets proposes |
|---|---|
| Chevalier | epees, haches (1 et 2 mains), dague, tous les boucliers, chopes |
| Barbare | haches, epees, dague, boucliers ronds et a pointes, chopes |
| Mage | baton, baguette, grimoires, dague, chopes |
| Ranger | arc, arbaletes, dague, carquois, chopes |
| Voleur et Voleur a capuche | dague, epee 1 main, arbalete 1 main, petits boucliers (ronds / ecusson, a confirmer), chopes |
| Squelette guerrier et sbire | armes squelettes (hache, lame), grands et petits boucliers |
| Squelette mage | baton squelette, grimoires |
| Squelette rodeur | arbalete squelette, carquois, dague |

### Prix des objets de la main

| Objet | Prix |
|---|---|
| Chope pleine ou vide | 100 |
| Dague, baguette, boucliers simples (rond, carre) | 150 |
| Epee 1 main, hache 1 main, baton, grimoire ferme ou ouvert, boucliers de couleur et a ecusson | 200 |
| Epee 2 mains, hache 2 mains, arc, arbalete 1 main, boucliers a pointes et rond barbare | 250 |
| Epee 2 mains de couleur, arbalete 2 mains | 300 |
| Armes squelettes (hache, lame, arbalete, baton), grands boucliers squelettes | 250 |
| Petits boucliers squelettes | 200 |
| Armes pirates : epees, dague, hache | 300 |
| Armes pirates : sabre d'abordage, double hache, luth | 350 |

Sources : pack Adventurers (epee 1 main, epee 2 mains, epee 2 mains couleur, hache 1 et 2 mains, dague, arc, arbalete 1 et 2 mains, baton, baguette, grimoires ouvert/ferme, 9 boucliers, chopes pleine/vide, carquois) et pack Skeletons (hache, lame, arbalete, baton, 4 boucliers, carquois).

### Armes pirates pour les KayKit (sous condition)

Sabre d'abordage, 2 epees, dague, hache, double hache : Chevalier, Voleur, Voleur a capuche, Squelette guerrier, Squelette sbire. Luth : Mage, Ranger.
Condition : n'etre ajoutees que si elles s'adaptent bien a la main (taille, orientation). A verifier dans Godot ; le nom de l'os de la main des rigs KayKit reste a lire.

## 4. Apparences des fantomes (Ultimate Monsters / Flying)

| Apparence | Prix |
|---|---|
| Fantome actuel | gratuit (defaut) |
| Hywirl, Pigeon, Squidle, Tribal (pas de version Evolved) | 250 |
| Alpaking, Armabee, Glub, Goleling (version Evolved) | 450 |
| Dragon (version Evolved) | 550 |

Tribal est a regarder avant de le garder. A verifier : animations et taille dans le jeu.

## 5. Exclus

- Vehicules (Rover, vaisseaux) : oublies pour l'instant.
- Armes a feu du pack pirate : pistolet, fusil, double fusil, hache-fusil.
- Autres objets : bombe (pirate), bombe fumigene (Adventurers), crânes, os.
- Monstres : demon, Ghost_Skull.
- Pirates Sharky et Skeleton.

## 6. A faire plus tard

- Verifier l'os de la main KayKit, l'echelle des armes pirates, les animations des monstres.
- Ajuster les prix apres test du gain d'etoiles par partie.
- Mettre a jour CREDITS.md (Pirate Kit, Ultimate Monsters).
