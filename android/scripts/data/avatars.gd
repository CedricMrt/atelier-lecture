extends RefCounted
## Personnages proposés à la création d'un joueur : modèles 3D KayKit (CC0).
## Les `id` sont enregistrés dans les profils : ne pas les changer une fois publiés.
## Pour ajouter un personnage : une ligne dans LIST avec son fichier modèle.
## `rig` : "medium" pour tous les personnages KayKit (ils reçoivent les animations du pack
## KayKit_Character_Animations, voir games/volcano_game.gd).
## `color` et `ears` ne servent qu'au dessin de secours (si le modèle est introuvable).
## LEGACY : anciens avatars (dessinés par code, ou anciens personnages du Pirate Kit), gardés
## pour les profils déjà créés : ils jouent alors avec le premier personnage de LIST.

const KAYKIT := "res://assets/KayKit_Adventurers_2.0_FREE/Characters/gltf/"
const SKELETONS := "res://assets/KayKit_Skeletons_1.1_FREE/characters/gltf/"

const LIST := [
	{"id": "mage", "label": "Mage", "model": KAYKIT + "Mage.glb", "rig": "medium", "color": Color(0.58, 0.35, 0.80), "ears": "none"},
	{"id": "ranger", "label": "Ranger", "model": KAYKIT + "Ranger.glb", "rig": "medium", "color": Color(0.30, 0.72, 0.30), "ears": "none"},
	{"id": "rogue", "label": "Rôdeur", "model": KAYKIT + "Rogue.glb", "rig": "medium", "color": Color(0.90, 0.68, 0.20), "ears": "none"},
	{"id": "rogue_hooded", "label": "Voleur", "model": KAYKIT + "Rogue_Hooded.glb", "rig": "medium", "color": Color(0.60, 0.25, 0.30), "ears": "none"},
	{"id": "knight", "label": "Chevalier", "model": KAYKIT + "Knight.glb", "rig": "medium", "color": Color(0.55, 0.65, 0.78), "ears": "none"},
	{"id": "barbarian", "label": "Barbare", "model": KAYKIT + "Barbarian.glb", "rig": "medium", "color": Color(0.75, 0.40, 0.20), "ears": "none"},
	{"id": "skeleton_warrior", "label": "Squelette guerrier", "model": SKELETONS + "Skeleton_Warrior.glb", "rig": "medium", "color": Color(0.85, 0.82, 0.74), "ears": "none"},
	{"id": "skeleton_mage", "label": "Squelette mage", "model": SKELETONS + "Skeleton_Mage.glb", "rig": "medium", "color": Color(0.62, 0.55, 0.85), "ears": "none"},
	{"id": "skeleton_rogue", "label": "Squelette rôdeur", "model": SKELETONS + "Skeleton_Rogue.glb", "rig": "medium", "color": Color(0.55, 0.75, 0.60), "ears": "none"},
	{"id": "skeleton_minion", "label": "Squelette sbire", "model": SKELETONS + "Skeleton_Minion.glb", "rig": "medium", "color": Color(0.75, 0.75, 0.70), "ears": "none"},
]

const LEGACY := [
	{"id": "anne", "label": "Anne", "color": Color(0.93, 0.45, 0.15), "ears": "none"},
	{"id": "henry", "label": "Henry", "color": Color(0.30, 0.55, 0.85), "ears": "none"},
	{"id": "mako", "label": "Mako", "color": Color(0.20, 0.65, 0.55), "ears": "none"},
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
