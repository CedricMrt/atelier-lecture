extends RefCounted
## Personnages proposés à la création d'un joueur : modèles 3D des packs d'assets.
## Les `id` sont enregistrés dans les profils : ne pas les changer une fois publiés.
## Pour ajouter un personnage : une ligne dans LIST avec son fichier modèle.
## `rig` : "medium" pour les personnages KayKit (ils reçoivent les animations du pack
## KayKit_Character_Animations, voir games/volcano_game.gd).
## `color` et `ears` ne servent qu'au dessin de secours (si le modèle est introuvable).
## LEGACY : anciens avatars dessinés par code, gardés pour les profils déjà créés
## (ils jouent alors avec le personnage par défaut).

const PIRATE := "res://assets/Pirate Kit - Nov 2023/glTF/"
const KAYKIT := "res://assets/KayKit_Adventurers_2.0_FREE/Characters/gltf/"

const LIST := [
	{"id": "anne", "label": "Anne", "model": PIRATE + "Characters_Anne.gltf", "color": Color(0.93, 0.45, 0.15), "ears": "none"},
	{"id": "henry", "label": "Henry", "model": PIRATE + "Characters_Henry.gltf", "color": Color(0.30, 0.55, 0.85), "ears": "none"},
	{"id": "mako", "label": "Mako", "model": PIRATE + "Characters_Mako.gltf", "color": Color(0.20, 0.65, 0.55), "ears": "none"},
	{"id": "mage", "label": "Mage", "model": KAYKIT + "Mage.glb", "rig": "medium", "color": Color(0.58, 0.35, 0.80), "ears": "none"},
	{"id": "ranger", "label": "Ranger", "model": KAYKIT + "Ranger.glb", "rig": "medium", "color": Color(0.30, 0.72, 0.30), "ears": "none"},
	{"id": "rogue", "label": "Rôdeur", "model": KAYKIT + "Rogue.glb", "rig": "medium", "color": Color(0.90, 0.68, 0.20), "ears": "none"},
	{"id": "knight", "label": "Chevalier", "model": KAYKIT + "Knight.glb", "rig": "medium", "color": Color(0.55, 0.65, 0.78), "ears": "none"},
]

const LEGACY := [
	{"id": "renard", "label": "Renard", "color": Color(0.93, 0.45, 0.15), "ears": "pointy"},
	{"id": "panda", "label": "Panda", "color": Color(0.35, 0.35, 0.38), "ears": "round"},
	{"id": "lion", "label": "Lion", "color": Color(0.90, 0.68, 0.20), "ears": "round"},
	{"id": "grenouille", "label": "Grenouille", "color": Color(0.30, 0.72, 0.30), "ears": "none"},
	{"id": "pieuvre", "label": "Pieuvre", "color": Color(0.72, 0.32, 0.70), "ears": "none"},
	{"id": "licorne", "label": "Licorne", "color": Color(0.95, 0.55, 0.80), "ears": "pointy"},
	{"id": "hibou", "label": "Hibou", "color": Color(0.58, 0.40, 0.25), "ears": "pointy"},
	{"id": "dragon", "label": "Dragon", "color": Color(0.20, 0.65, 0.55), "ears": "pointy"},
	{"id": "robot", "label": "Robot", "color": Color(0.55, 0.65, 0.78), "ears": "none"},
	{"id": "chat", "label": "Chat", "color": Color(0.80, 0.78, 0.74), "ears": "pointy"},
	{"id": "dino", "label": "Dinosaure", "color": Color(0.45, 0.70, 0.25), "ears": "none"},
	{"id": "pingouin", "label": "Pingouin", "color": Color(0.25, 0.35, 0.55), "ears": "round"},
]


static func get_avatar(id: String) -> Dictionary:
	for avatar in LIST:
		if avatar["id"] == id:
			return avatar

	for avatar in LEGACY:
		if avatar["id"] == id:
			return avatar

	return LIST[0]
