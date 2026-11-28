extends RefCounted
## Accessoires amovibles des personnages KayKit. Chaque accessoire est une pièce séparée du modèle,
## nommée « Personnage_Pièce » (ex. Knight_Cape, Barbarian_BearHat, Skeleton_Mage_Hat).
## Pour l'instant tous sont masqués : on voit les personnages de base.
## Plus tard, la boutique réaffichera ceux que le joueur a achetés (liste dans son profil).

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


static func is_accessory(node_name: String) -> bool:
	for accessory in ACCESSORIES:
		if node_name.ends_with("_" + accessory):
			return true

	return false


## Masque les accessoires du personnage `root` (le modèle chargé, ou un nœud qui le contient).
static func apply(root: Node) -> void:
	if not HIDE_ALL or root == null:
		return

	for node in root.find_children("*", "MeshInstance3D", true, false):
		if is_accessory(String(node.name)):
			node.visible = false
