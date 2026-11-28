extends RefCounted
## Accessoires amovibles des personnages KayKit. Chaque accessoire est une pièce séparée du modèle,
## nommée « Personnage_Pièce » (ex. Knight_Cape, Barbarian_BearHat, Skeleton_Mage_Hat).
## Tous sont masqués, sauf ceux que le joueur a achetés et équipés dans la boutique
## (liste « equipped » de son profil, transmise par set_worn()).
## Les armes, boucliers et objets tenus en main (voir weapons.gd) sont fixés à l'os de la main
## du squelette du personnage du joueur.

const Weapons = preload("res://scripts/data/weapons.gd")

## Mettre false pour tout réafficher (personnages d'origine).
const HIDE_ALL := true

const ACCESSORIES := [
	"Cape",
	"Cloak",
	"Helmet",
	"HelmetVisor",
	"Hat",
	"BearHat",
	"Hood",
	"Mask",
	"Quiver",
]

## Pièces à montrer (noms de nœuds). Vide : tous les accessoires sont masqués.
static var worn: Dictionary = {}
## Objets tenus en main par le joueur (identifiants « weapon_xxx »).
static var weapon_ids: Array = []
## Fichier du modèle du personnage du joueur (pour repérer son squelette). Vide : aucune arme posée.
static var model_path := ""


static func is_accessory(node_name: String) -> bool:
	for accessory in ACCESSORIES:
		if node_name.ends_with("_" + accessory):
			return true

	return false


## Définit ce que porte le joueur courant : pièces du modèle et objets tenus en main.
static func set_worn(names: Array, p_model_path: String = "") -> void:
	worn = {}
	weapon_ids = []
	model_path = p_model_path

	for entry in names:
		var item_id := String(entry)

		if Weapons.is_weapon_id(item_id):
			weapon_ids.append(item_id)
		else:
			worn[item_id] = true


## Vrai si cette pièce doit être cachée : c'est un accessoire que le joueur ne porte pas.
static func is_hidden(node_name: String) -> bool:
	return HIDE_ALL and is_accessory(node_name) and not worn.has(node_name)


## Masque les accessoires non portés du personnage `root` (le modèle chargé, ou un nœud qui le contient).
static func apply(root: Node) -> void:
	if root == null:
		return

	for node in root.find_children("*", "MeshInstance3D", true, false):
		if is_hidden(String(node.name)):
			node.visible = false


## Ce squelette est-il celui du modèle du joueur ? (le modèle chargé porte le chemin de son fichier)
static func owns_skeleton(skeleton: Node) -> bool:
	if model_path.is_empty():
		return false

	var node := skeleton.get_parent()

	while node != null:
		if node.scene_file_path == model_path:
			return true

		node = node.get_parent()

	return false


## Nom de l'os de la main (« handslot » en priorité), ou "" s'il n'y en a pas.
static func hand_bone(skeleton: Skeleton3D, left: bool) -> String:
	var side := "l" if left else "r"

	for prefix in ["handslot", "hand"]:
		for i in skeleton.get_bone_count():
			var bone_name := skeleton.get_bone_name(i)
			var low := bone_name.to_lower()

			if low.begins_with(prefix) and low.ends_with(side):
				return bone_name

	return ""


## Remplace les objets tenus en main par ceux de `ids` (identifiants « weapon_xxx »).
static func attach_list(skeleton: Skeleton3D, ids: Array) -> void:
	for child in skeleton.get_children():
		if child.has_meta("shop_weapon"):
			skeleton.remove_child(child)
			child.queue_free()

	for entry in ids:
		var weapon := Weapons.get_weapon(String(entry))

		if weapon.is_empty():
			continue

		var bone := hand_bone(skeleton, String(weapon["hand"]) == "l")

		if bone.is_empty():
			var names := PackedStringArray()

			for i in skeleton.get_bone_count():
				names.append(skeleton.get_bone_name(i))

			push_warning("Os de la main introuvable pour %s. Os du squelette : %s" % [entry, ", ".join(names)])
			continue

		var res := load(String(weapon["scene"]))

		if not (res is PackedScene):
			continue

		var attachment := BoneAttachment3D.new()
		attachment.name = "ShopWeapon_" + String(entry)
		attachment.set_meta("shop_weapon", true)
		skeleton.add_child(attachment)
		attachment.bone_name = bone
		attachment.add_child((res as PackedScene).instantiate())
