extends RefCounted
## Armes, boucliers et objets tenus en main (onglet Main de la boutique), avec les personnages
## auxquels ils vont. `hand` : "r" main droite, "l" main gauche. Prix : voir docs/boutique.md.
## Un objet n'est proposé que s'il va au personnage du joueur (« avatars ») et si son fichier existe.

const ADV := "res://assets/KayKit_Adventurers_2.0_FREE/Assets/gltf/"
const SKE := "res://assets/KayKit_Skeletons_1.1_FREE/assets/gltf/"

## Les identifiants d'objets enregistrés dans les profils commencent par ce préfixe.
const ID_PREFIX := "weapon_"

const LIST := [
	{"id": "dagger", "label": "Dague", "scene": ADV + "dagger.gltf", "hand": "r", "price": 150, "avatars": ["knight", "barbarian", "mage", "ranger", "rogue", "rogue_hooded", "skeleton_rogue"]},
	{"id": "sword_1handed", "label": "Épée", "scene": ADV + "sword_1handed.gltf", "hand": "r", "price": 200, "avatars": ["knight", "barbarian", "rogue", "rogue_hooded"]},
	{"id": "sword_2handed", "label": "Grande épée", "scene": ADV + "sword_2handed.gltf", "hand": "r", "price": 250, "avatars": ["knight", "barbarian"]},
	{"id": "sword_2handed_color", "label": "Grande épée de couleur", "scene": ADV + "sword_2handed_color.gltf", "hand": "r", "price": 300, "avatars": ["knight", "barbarian"]},
	{"id": "axe_1handed", "label": "Hache", "scene": ADV + "axe_1handed.gltf", "hand": "r", "price": 200, "avatars": ["knight", "barbarian"]},
	{"id": "axe_2handed", "label": "Grande hache", "scene": ADV + "axe_2handed.gltf", "hand": "r", "price": 250, "avatars": ["knight", "barbarian"]},
	{"id": "bow", "label": "Arc", "scene": ADV + "bow_withString.gltf", "hand": "l", "price": 250, "avatars": ["ranger"]},
	{"id": "crossbow_1handed", "label": "Arbalète", "scene": ADV + "crossbow_1handed.gltf", "hand": "r", "price": 250, "avatars": ["ranger", "rogue", "rogue_hooded"]},
	{"id": "crossbow_2handed", "label": "Grande arbalète", "scene": ADV + "crossbow_2handed.gltf", "hand": "r", "price": 300, "avatars": ["ranger"]},
	{"id": "staff", "label": "Bâton", "scene": ADV + "staff.gltf", "hand": "r", "price": 200, "avatars": ["mage"]},
	{"id": "wand", "label": "Baguette", "scene": ADV + "wand.gltf", "hand": "r", "price": 150, "avatars": ["mage"]},
	{"id": "spellbook_closed", "label": "Grimoire fermé", "scene": ADV + "spellbook_closed.gltf", "hand": "l", "price": 200, "avatars": ["mage", "skeleton_mage"]},
	{"id": "spellbook_open", "label": "Grimoire ouvert", "scene": ADV + "spellbook_open.gltf", "hand": "l", "price": 200, "avatars": ["mage", "skeleton_mage"]},
	{"id": "mug_full", "label": "Chope pleine", "scene": ADV + "mug_full.gltf", "hand": "r", "price": 100, "avatars": ["knight", "barbarian", "mage", "ranger", "rogue", "rogue_hooded"]},
	{"id": "mug_empty", "label": "Chope vide", "scene": ADV + "mug_empty.gltf", "hand": "r", "price": 100, "avatars": ["knight", "barbarian", "mage", "ranger", "rogue", "rogue_hooded"]},
	{"id": "shield_round", "label": "Bouclier rond", "scene": ADV + "shield_round.gltf", "hand": "l", "price": 150, "avatars": ["knight", "barbarian", "rogue", "rogue_hooded"]},
	{"id": "shield_round_color", "label": "Bouclier rond de couleur", "scene": ADV + "shield_round_color.gltf", "hand": "l", "price": 200, "avatars": ["knight", "barbarian", "rogue", "rogue_hooded"]},
	{"id": "shield_round_barbarian", "label": "Bouclier du barbare", "scene": ADV + "shield_round_barbarian.gltf", "hand": "l", "price": 250, "avatars": ["knight", "barbarian"]},
	{"id": "shield_square", "label": "Bouclier carré", "scene": ADV + "shield_square.gltf", "hand": "l", "price": 150, "avatars": ["knight"]},
	{"id": "shield_square_color", "label": "Bouclier carré de couleur", "scene": ADV + "shield_square_color.gltf", "hand": "l", "price": 200, "avatars": ["knight"]},
	{"id": "shield_badge", "label": "Bouclier à écusson", "scene": ADV + "shield_badge.gltf", "hand": "l", "price": 200, "avatars": ["knight", "rogue", "rogue_hooded"]},
	{"id": "shield_badge_color", "label": "Bouclier à écusson de couleur", "scene": ADV + "shield_badge_color.gltf", "hand": "l", "price": 200, "avatars": ["knight", "rogue", "rogue_hooded"]},
	{"id": "shield_spikes", "label": "Bouclier à pointes", "scene": ADV + "shield_spikes.gltf", "hand": "l", "price": 250, "avatars": ["knight", "barbarian"]},
	{"id": "shield_spikes_color", "label": "Bouclier à pointes de couleur", "scene": ADV + "shield_spikes_color.gltf", "hand": "l", "price": 250, "avatars": ["knight", "barbarian"]},
	{"id": "skeleton_axe", "label": "Hache de squelette", "scene": SKE + "Skeleton_Axe.gltf", "hand": "r", "price": 250, "avatars": ["skeleton_warrior", "skeleton_minion"]},
	{"id": "skeleton_blade", "label": "Lame de squelette", "scene": SKE + "Skeleton_Blade.gltf", "hand": "r", "price": 250, "avatars": ["skeleton_warrior", "skeleton_minion"]},
	{"id": "skeleton_crossbow", "label": "Arbalète de squelette", "scene": SKE + "Skeleton_Crossbow.gltf", "hand": "r", "price": 250, "avatars": ["skeleton_rogue"]},
	{"id": "skeleton_staff", "label": "Bâton de squelette", "scene": SKE + "Skeleton_Staff.gltf", "hand": "r", "price": 250, "avatars": ["skeleton_mage"]},
	{"id": "skeleton_shield_large_a", "label": "Grand bouclier A", "scene": SKE + "Skeleton_Shield_Large_A.gltf", "hand": "l", "price": 250, "avatars": ["skeleton_warrior", "skeleton_minion"]},
	{"id": "skeleton_shield_large_b", "label": "Grand bouclier B", "scene": SKE + "Skeleton_Shield_Large_B.gltf", "hand": "l", "price": 250, "avatars": ["skeleton_warrior", "skeleton_minion"]},
	{"id": "skeleton_shield_small_a", "label": "Petit bouclier A", "scene": SKE + "Skeleton_Shield_Small_A.gltf", "hand": "l", "price": 200, "avatars": ["skeleton_warrior", "skeleton_minion"]},
	{"id": "skeleton_shield_small_b", "label": "Petit bouclier B", "scene": SKE + "Skeleton_Shield_Small_B.gltf", "hand": "l", "price": 200, "avatars": ["skeleton_warrior", "skeleton_minion"]},
]


static func is_weapon_id(item_id: String) -> bool:
	return item_id.begins_with(ID_PREFIX)


## L'objet d'identifiant « weapon_xxx », ou un dictionnaire vide s'il n'existe pas.
static func get_weapon(item_id: String) -> Dictionary:
	var short_id := item_id.trim_prefix(ID_PREFIX)

	for weapon in LIST:
		if weapon["id"] == short_id:
			return weapon

	return {}
