extends RefCounted
## Accessoires amovibles des personnages KayKit. Chaque accessoire est une pièce séparée du modèle,
## nommée « Personnage_Pièce » (ex. Knight_Cape, Barbarian_BearHat, Skeleton_Mage_Hat).
## Tous sont masqués, sauf ceux que le joueur a achetés et équipés dans la boutique
## (liste « equipped » de son profil, transmise par set_worn()).

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


static func is_accessory(node_name: String) -> bool:
	for accessory in ACCESSORIES:
		if node_name.ends_with("_" + accessory):
			return true

	return false


## Définit les pièces portées (celles du joueur courant).
static func set_worn(names: Array) -> void:
	worn = {}

	for node_name in names:
		worn[String(node_name)] = true


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
