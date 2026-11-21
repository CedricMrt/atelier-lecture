extends Node
## Réglages de l'appareil (pas ceux d'un joueur) : enregistrés dans user://settings.json.
## Pour l'instant : l'écran de bienvenue (pour les adultes) n'est montré qu'au tout premier lancement.
## Ces réglages sont propres à chaque tablette, comme les profils.

const SAVE_PATH := "user://settings.json"
const VERSION := 1

var welcome_seen := false


func _ready() -> void:
	_load()


func mark_welcome_seen() -> void:
	welcome_seen = true
	_save()


func _save() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)

	if file == null:
		push_warning("Impossible d'écrire %s (erreur %d)" % [SAVE_PATH, FileAccess.get_open_error()])
		return

	file.store_string(JSON.stringify({"version": VERSION, "welcome_seen": welcome_seen}))


func _load() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return

	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)

	if file == null:
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())

	if typeof(parsed) != TYPE_DICTIONARY or int(parsed.get("version", 0)) != VERSION:
		return

	welcome_seen = bool(parsed.get("welcome_seen", false))
