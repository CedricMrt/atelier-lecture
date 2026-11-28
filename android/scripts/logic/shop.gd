extends RefCounted
## Catalogue de la boutique et règles d'achat : pièces d'origine des personnages KayKit (onglets Tête et Dos)
## et objets tenus en main (onglet Main, voir weapons.gd).
## Les pièces sont repérées dans le modèle du personnage : seules celles qui existent sont proposées.
## Prix : voir docs/boutique.md. La visière du casque est vendue avec le casque.

const Avatars = preload("res://scripts/data/avatars.gd")
const Outfit = preload("res://scripts/logic/avatar_outfit.gd")
const Weapons = preload("res://scripts/data/weapons.gd")

const PIECES := {
	"Cape": {"slot": "back", "label": "Cape", "price": 200},
	"Cloak": {"slot": "back", "label": "Manteau", "price": 200},
	"Quiver": {"slot": "back", "label": "Carquois", "price": 150},
	"Helmet": {"slot": "head", "label": "Casque", "price": 250},
	"HelmetVisor": {"slot": "head", "label": "Visière", "price": 150},
	"Hat": {"slot": "head", "label": "Chapeau", "price": 250},
	"BearHat": {"slot": "head", "label": "Bonnet d'ours", "price": 250},
	"Hood": {"slot": "head", "label": "Capuche", "price": 250},
	"Mask": {"slot": "head", "label": "Masque", "price": 200},
}


## Type de pièce d'après le nom du nœud (« Knight_Cape » → « Cape »), ou "" si inconnu.
static func piece_of(node_name: String) -> String:
	var piece := node_name.get_slice("_", node_name.get_slice_count("_") - 1)
	return piece if PIECES.has(piece) else ""


## Les objets en vente pour ce personnage : {id, avatar_id, piece, label, slot, price, nodes}.
## `slot` : head, back, hand_r (main droite) ou hand_l (main gauche) ; un seul objet par emplacement.
static func items_for(avatar_id: String) -> Array:
	var items: Array = []
	var path: String = Avatars.get_avatar(avatar_id).get("model", "")

	if not ResourceLoader.exists(path):
		return items

	var res := load(path)

	if not (res is PackedScene):
		return items

	var inst: Node = (res as PackedScene).instantiate()
	var names: Array = []

	for mesh in inst.find_children("*", "MeshInstance3D", true, false):
		names.append(String(mesh.name))

	inst.free()

	for node_name in names:
		var piece := piece_of(node_name)

		if piece.is_empty() or piece == "HelmetVisor" or not Outfit.is_accessory(node_name):
			continue

		var info: Dictionary = PIECES[piece]
		var parts: Array = [node_name]
		var price: int = info["price"]

		if piece == "Helmet":
			var visor: String = node_name.trim_suffix("Helmet") + "HelmetVisor"

			if names.has(visor):
				parts.append(visor)
				price += int(PIECES["HelmetVisor"]["price"])

		items.append({
			"id": node_name,
			"avatar_id": avatar_id,
			"piece": piece,
			"label": info["label"],
			"slot": info["slot"],
			"price": price,
			"nodes": parts,
		})

	for weapon in Weapons.LIST:
		if not (weapon["avatars"] as Array).has(avatar_id):
			continue

		if not ResourceLoader.exists(String(weapon["scene"])):
			continue

		var weapon_id: String = Weapons.ID_PREFIX + String(weapon["id"])

		items.append({
			"id": weapon_id,
			"avatar_id": avatar_id,
			"piece": "Weapon",
			"label": weapon["label"],
			"slot": "hand_" + String(weapon["hand"]),
			"price": weapon["price"],
			"nodes": [weapon_id],
		})

	return items


static func is_owned(profile: Dictionary, item: Dictionary) -> bool:
	return (profile.get("owned", []) as Array).has(String(item["id"]))


static func is_equipped(profile: Dictionary, item: Dictionary) -> bool:
	return (profile.get("equipped", []) as Array).has(String(item["id"]))


## Liste des pièces portées après un appui sur l'objet : on l'enlève s'il est porté,
## sinon on le met à la place de celui du même emplacement (tête, dos, main droite ou main gauche).
static func after_toggle(profile: Dictionary, items: Array, item: Dictionary) -> Array:
	var equipped: Array = (profile.get("equipped", []) as Array).duplicate()

	if is_equipped(profile, item):
		for node_name in item["nodes"]:
			equipped.erase(node_name)

		return equipped

	for other in items:
		if other["slot"] == item["slot"]:
			for node_name in other["nodes"]:
				equipped.erase(node_name)

	equipped.append_array(item["nodes"])
	return equipped
