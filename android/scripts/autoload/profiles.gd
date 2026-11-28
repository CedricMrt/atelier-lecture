extends Node
## Profils des joueurs, enregistrés sur l'appareil (user://profiles.json).
## Aucun compte, aucun serveur.

signal changed

const Progression = preload("res://scripts/logic/progression.gd")

const SAVE_PATH := "user://profiles.json"
const VERSION := 1
const MAX_PROFILES := 12
const MAX_NAME_LENGTH := 14

## Chaque profil : {id, name, avatar_id, created_at, stars, progress: {game_id: {...}},
## owned: [objets achetés], equipped: [pièces portées]}
var profiles: Array = []


func _ready() -> void:
	_load()


func can_create_profile() -> bool:
	return profiles.size() < MAX_PROFILES


func get_profile(profile_id: String) -> Dictionary:
	for profile in profiles:
		if profile["id"] == profile_id:
			return profile
	return {}


## Retourne le profil créé, ou un dictionnaire vide si le nom est vide ou s'il y a trop de profils.
func create_profile(player_name: String, avatar_id: String) -> Dictionary:
	var clean_name: String = " ".join(player_name.strip_edges().split(" ", false)).substr(0, MAX_NAME_LENGTH)

	if clean_name.is_empty() or not can_create_profile():
		return {}

	var profile := {
		"id": "%d-%d" % [int(Time.get_unix_time_from_system()), randi()],
		"name": clean_name,
		"avatar_id": avatar_id,
		"created_at": int(Time.get_unix_time_from_system()),
		"stars": 0,
		"progress": {},
		"owned": [],
		"equipped": [],
	}

	profiles.append(profile)
	_commit()
	return profile


func delete_profile(profile_id: String) -> void:
	profiles = profiles.filter(func(p): return p["id"] != profile_id)
	_commit()


## `result` : {game_id, stars (1 à 3), accuracy (0 à 1), points (facultatif)}
## Les 1 à 3 étoiles servent à la progression du niveau. Le total d'étoiles du profil augmente de
## `points` : le score affiché pendant la partie (ou, à défaut, des 1 à 3 étoiles).
func record_result(profile_id: String, result: Dictionary) -> void:
	var profile := get_profile(profile_id)

	if profile.is_empty():
		return

	var game_id: String = result["game_id"]
	var earned: int = maxi(int(result.get("points", result["stars"])), 0)
	profile["stars"] = int(profile["stars"]) + earned
	profile["progress"][game_id] = Progression.apply_result(
		profile["progress"].get(game_id, null),
		result,
		int(Time.get_unix_time_from_system()),
	)
	_commit()


func get_level(profile: Dictionary, game_id: String) -> int:
	var progress: Dictionary = profile.get("progress", {})
	if progress.has(game_id):
		return int(progress[game_id]["level"])
	return 1


# ---------- Boutique ----------

## Achète un objet : retire `price` étoiles et l'ajoute aux objets possédés.
## Faux si le profil n'existe pas, si l'objet est déjà possédé ou s'il manque des étoiles.
func buy_item(profile_id: String, item_id: String, price: int) -> bool:
	var profile := get_profile(profile_id)

	if profile.is_empty() or price < 0 or int(profile["stars"]) < price:
		return false

	if (profile["owned"] as Array).has(item_id):
		return false

	profile["stars"] = int(profile["stars"]) - price
	(profile["owned"] as Array).append(item_id)
	_commit()
	return true


## Remplace la liste des pièces portées (noms de nœuds du modèle).
func set_equipped(profile_id: String, nodes: Array) -> void:
	var profile := get_profile(profile_id)

	if profile.is_empty():
		return

	profile["equipped"] = nodes.duplicate()
	_commit()


## Les pièces portées par ce joueur.
func get_worn(profile_id: String) -> Array:
	return get_profile(profile_id).get("equipped", [])


# ---------- Sauvegarde ----------

func _commit() -> void:
	_save()
	changed.emit()


func _save() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)

	if file == null:
		# Stockage indisponible : la partie en cours continue, sans sauvegarde.
		push_warning("Impossible d'écrire %s (erreur %d)" % [SAVE_PATH, FileAccess.get_open_error()])
		return

	file.store_string(JSON.stringify({"version": VERSION, "profiles": profiles}))


func _load() -> void:
	profiles = []

	if not FileAccess.file_exists(SAVE_PATH):
		return

	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)

	if file == null:
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())

	if typeof(parsed) != TYPE_DICTIONARY or int(parsed.get("version", 0)) != VERSION:
		return

	var raw: Variant = parsed.get("profiles", [])

	if typeof(raw) != TYPE_ARRAY:
		return

	for item in raw:
		if typeof(item) == TYPE_DICTIONARY and item.has("id") and item.has("name"):
			profiles.append(_sanitize(item))


## JSON rend tous les nombres décimaux : on remet les entiers en entiers.
func _sanitize(item: Dictionary) -> Dictionary:
	var progress := {}
	var raw_progress: Variant = item.get("progress", {})

	if typeof(raw_progress) == TYPE_DICTIONARY:
		for game_id in raw_progress:
			var p: Variant = raw_progress[game_id]
			if typeof(p) != TYPE_DICTIONARY:
				continue
			progress[str(game_id)] = {
				"level": maxi(1, int(p.get("level", 1))),
				"plays": int(p.get("plays", 0)),
				"best_stars": int(p.get("best_stars", 0)),
				"last_played_at": int(p.get("last_played_at", 0)),
			}

	return {
		"id": str(item["id"]),
		"name": str(item["name"]).substr(0, MAX_NAME_LENGTH),
		"avatar_id": str(item.get("avatar_id", "mage")),
		"created_at": int(item.get("created_at", 0)),
		"stars": int(item.get("stars", 0)),
		"progress": progress,
		"owned": _strings(item.get("owned", [])),
		"equipped": _strings(item.get("equipped", [])),
	}


func _strings(raw: Variant) -> Array:
	var out: Array = []

	if typeof(raw) == TYPE_ARRAY:
		for value in raw:
			out.append(str(value))

	return out
