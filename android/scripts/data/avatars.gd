extends RefCounted
## Personnages proposés à la création d'un joueur : modèles 3D KayKit (CC0).
## Les `id` sont enregistrés dans les profils : ne pas les changer une fois publiés.
## Pour ajouter un personnage : une ligne dans LIST avec son fichier modèle.
## `rig` : "medium" pour tous les personnages KayKit (ils reçoivent les animations du pack
## KayKit_Character_Animations, voir games/volcano_game.gd).
## `color` et `ears` ne servent qu'au dessin de secours (si le modèle est introuvable).
## Un profil dont l'avatar n'existe plus dans LIST joue avec le premier personnage de LIST.

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


static func get_avatar(id: String) -> Dictionary:
	for avatar in LIST:
		if avatar["id"] == id:
			return avatar

	return LIST[0]
