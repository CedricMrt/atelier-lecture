# Boutique - catalogue valide

Document de reference avant de coder la boutique. Aucun prix fixe pour l'instant.

## Regles

- Un objet achete suit le joueur, quel que soit son avatar.
- Un objet n'est propose et porte que sur les personnages compatibles (voir tableaux). S'il change d'avatar, les objets incompatibles restent possedes mais ne sont plus proposes ni portes.
- Les pieces d'origine (casque du Chevalier, etc.) ne s'affichent que sur leur personnage.
- Essayage visuel sur l'avatar d'apercu avant achat.
- Onglets : Tete, Dos, Main. Cartes : acheter / possede / equipe. Acces depuis "A quoi on joue".
- Public 5-8 ans : pas d'armes a feu, pas d'objets effrayants.

## 1. Personnages pirates (achat complet, avec leur arme de base, aucun achat supplementaire)

- Anne (Weapon_DoubleAxe)
- Capitaine Barbarossa (Weapon_Cutlass, perroquet Ernest inclus)
- Henry (Weapon_Lute)
- Mako (Weapon_Sword)

Rig "pirate" : animations integrees (Idle, Jump, Wave, Walk, Run...). Exclus : Sharky, Skeleton (pirate).
Note : l'arme de Barbarossa est attachee a Middle1_R, les autres a Middle1_L.

## 2. Pieces d'origine des avatars KayKit (17)

| Type | Personnage et piece |
|---|---|
| Capes (6) | Chevalier, Mage, Ranger, Rodeur, Voleur, Squelette rodeur |
| Manteaux (2) | Squelette guerrier, Squelette sbire |
| Coiffes (6) | casque du Chevalier, chapeau du Mage, bonnet d'ours du Barbare, casque du Squelette guerrier, chapeau du Squelette mage, capuche du Squelette rodeur |
| Visiere (1) | Chevalier |
| Masque (1) | Voleur a capuche |
| Carquois (1) | Ranger |

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

Sources : pack Adventurers (epee 1 main, epee 2 mains, epee 2 mains couleur, hache 1 et 2 mains, dague, arc, arbalete 1 et 2 mains, baton, baguette, grimoires ouvert/ferme, 9 boucliers, chopes pleine/vide, carquois) et pack Skeletons (hache, lame, arbalete, baton, 4 boucliers, carquois).

### Armes pirates pour les KayKit (sous condition)

Sabre d'abordage, 2 epees, dague, hache, double hache : Chevalier, Voleur, Voleur a capuche, Squelette guerrier, Squelette sbire. Luth : Mage, Ranger.
Condition : n'etre ajoutees que si elles s'adaptent bien a la main (taille, orientation). A verifier dans Godot ; le nom de l'os de la main des rigs KayKit reste a lire.

## 4. Apparences des fantomes (Ultimate Monsters / Flying)

- Fantome actuel : gratuit, par defaut.
- Version Evolved quand elle existe : Alpaking, Armabee, Dragon, Glub, Goleling.
- Sans version Evolved : Hywirl, Pigeon, Squidle, Tribal (Tribal a regarder avant de le garder).
- A verifier : animations et taille dans le jeu.

## 5. Exclus

- Vehicules (Rover, vaisseaux) : oublies pour l'instant.
- Armes a feu du pack pirate : pistolet, fusil, double fusil, hache-fusil.
- Autres objets : bombe (pirate), bombe fumigene (Adventurers), crânes, os.
- Monstres : demon, Ghost_Skull.
- Pirates Sharky et Skeleton.

## 6. A faire plus tard

- Grille de prix.
- Verifier l'os de la main KayKit, l'echelle des armes pirates, les animations des monstres.
- Mettre a jour CREDITS.md (Pirate Kit, Ultimate Monsters).
