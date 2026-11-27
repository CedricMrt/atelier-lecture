extends Control
## Écran d'accueil d'un joueur : les six jeux, chacun avec sa capture d'écran en fond de tuile
## (assets/images/captures/<id du jeu>.png), en transparence pour garder le titre lisible.

signal play(game_id: String)
signal change_player

const Ui = preload("res://scripts/ui/ui.gd")
const AvatarView = preload("res://scripts/ui/avatar_view.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const Games = preload("res://scripts/data/games.gd")

const CAPTURES := "res://assets/images/captures/%s.png"
## Opacité de la capture (0 = invisible, 1 = pleine) et rayon des coins de la tuile.
const CAPTURE_ALPHA := 0.45
const TILE_RADIUS := 24.0

var profile_id: String = ""


## Image qui remplit la tuile (comme « cover » : recadrée, jamais déformée), coins arrondis.
class TileImage extends Control:
	var texture: Texture2D
	var radius := 24.0
	var alpha := 0.45

	func _draw() -> void:
		if texture == null or size.x <= 1.0 or size.y <= 1.0:
			return

		var tex_size := texture.get_size()
		var factor := maxf(size.x / tex_size.x, size.y / tex_size.y)
		var origin := (tex_size - size / factor) / 2.0
		var r := minf(radius, minf(size.x, size.y) / 2.0)
		var corners := [
			[Vector2(r, r), PI],
			[Vector2(size.x - r, r), PI * 1.5],
			[Vector2(size.x - r, size.y - r), 0.0],
			[Vector2(r, size.y - r), PI * 0.5],
		]
		var points := PackedVector2Array()
		var uvs := PackedVector2Array()
		var colors := PackedColorArray()

		for corner in corners:
			var center: Vector2 = corner[0]
			var start: float = corner[1]

			for i in 7:
				var angle := start + (PI * 0.5) * float(i) / 6.0
				var p := center + Vector2(cos(angle), sin(angle)) * r
				points.append(p)
				uvs.append((origin + p / factor) / tex_size)
				colors.append(Color(1.0, 1.0, 1.0, alpha))

		draw_polygon(points, colors, uvs, texture)


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


## La capture du jeu, ou null s'il n'y en a pas (jeux pas encore écrits).
func _capture_for(game_id: String) -> Texture2D:
	var path := CAPTURES % game_id

	if ResourceLoader.exists(path):
		return load(path) as Texture2D

	return null


func _make_game_tile(profile: Dictionary, game: Dictionary) -> Button:
	var available: bool = game["available"]
	var color: Color = game["color"]

	var button := Button.new()
	button.custom_minimum_size = Vector2(360, 190)
	button.focus_mode = Control.FOCUS_NONE
	button.disabled = not available
	Ui.style_button(button, color if available else color.darkened(0.5), 28)

	var capture := _capture_for(game["id"])

	if capture != null:
		var picture := TileImage.new()
		picture.texture = capture
		picture.radius = TILE_RADIUS
		picture.alpha = CAPTURE_ALPHA if available else CAPTURE_ALPHA * 0.5
		picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(picture)
		picture.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 10)
	button.add_child(box)
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var title := Ui.label(game["title"], 36, Color.WHITE)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_color_override("font_outline_color", Color(0.04, 0.04, 0.10, 0.95))
	title.add_theme_constant_override("outline_size", 10)
	box.add_child(title)

	var meta := "Niveau %d" % Profiles.get_level(profile, game["id"]) if available else "Bientôt"
	var meta_label := Ui.label(meta, 26, Color(1, 1, 1, 0.92))
	meta_label.add_theme_color_override("font_outline_color", Color(0.04, 0.04, 0.10, 0.95))
	meta_label.add_theme_constant_override("outline_size", 8)
	box.add_child(meta_label)

	Ui.ignore_mouse(box)
	button.pressed.connect(func() -> void: play.emit(game["id"]))
	return button
