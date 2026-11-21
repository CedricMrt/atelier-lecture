extends Control
## Écran d'accueil d'un joueur : les six jeux.

signal play(game_id: String)
signal change_player

const Ui = preload("res://scripts/ui/ui.gd")
const AvatarView = preload("res://scripts/ui/avatar_view.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const Games = preload("res://scripts/data/games.gd")

var profile_id: String = ""


func setup(p_profile_id: String) -> void:
	profile_id = p_profile_id


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var profile := Profiles.get_profile(profile_id)

	if profile.is_empty():
		change_player.emit()
		return

	var margin := MarginContainer.new()
	add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 30)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	# Barre du haut : changer de joueur, et le joueur courant.
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 14)
	column.add_child(top)

	var change := Ui.button("Changer de joueur", 26, Color(0, 0, 0, 0.35))
	change.pressed.connect(func() -> void: change_player.emit())
	top.add_child(change)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)

	var avatar := AvatarView.new()
	avatar.avatar_id = profile["avatar_id"]
	avatar.custom_minimum_size = Vector2(56, 56)
	top.add_child(avatar)
	top.add_child(Ui.label(profile["name"], 30, Ui.CREAM))

	var star := StarView.new()
	star.custom_minimum_size = Vector2(36, 36)
	top.add_child(star)
	top.add_child(Ui.label(str(profile["stars"]), 30, Ui.CREAM))

	column.add_child(Ui.label("À quoi on joue, %s ?" % profile["name"], 56, Ui.CREAM))

	if not Speech.has_french_voice():
		var warning := Ui.label(
			"Aucune voix française n’est installée sur cet appareil : les mots ne pourront pas être dits. Un adulte peut en ajouter une dans les réglages Android (synthèse vocale).",
			22,
			Color(1.0, 0.85, 0.55),
		)
		warning.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		column.add_child(warning)

	var center := CenterContainer.new()
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(center)

	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 24)
	grid.add_theme_constant_override("v_separation", 24)
	center.add_child(grid)

	for game in Games.LIST:
		grid.add_child(_make_game_tile(profile, game))


## Bouton « retour » d'Android.
func on_back() -> void:
	change_player.emit()


func _make_game_tile(profile: Dictionary, game: Dictionary) -> Button:
	var available: bool = game["available"]
	var color: Color = game["color"]

	var button := Button.new()
	button.custom_minimum_size = Vector2(360, 190)
	button.focus_mode = Control.FOCUS_NONE
	button.disabled = not available
	Ui.style_button(button, color if available else color.darkened(0.5), 28)

	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 10)
	button.add_child(box)
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var title := Ui.label(game["title"], 36, Color.WHITE)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(title)

	var meta := "Niveau %d" % Profiles.get_level(profile, game["id"]) if available else "Bientôt"
	box.add_child(Ui.label(meta, 26, Color(1, 1, 1, 0.85)))

	Ui.ignore_mouse(box)
	button.pressed.connect(func() -> void: play.emit(game["id"]))
	return button
