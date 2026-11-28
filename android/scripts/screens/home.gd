extends Control
## Écran « À quoi on joue » : barre du haut (changer de joueur, joueur, étoiles, Boutique),
## grand titre, puis les six jeux en tuiles. Fond de prairie dessiné par code.
## Les tuiles utilisent la capture du jeu (assets/images/captures/<id du jeu>.png).

signal play(game_id: String)
signal change_player
signal open_shop

const Ui = preload("res://scripts/ui/ui.gd")
const AvatarView = preload("res://scripts/ui/avatar_view.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const Games = preload("res://scripts/data/games.gd")

const CAPTURES := "res://assets/images/captures/%s.png"
const CAPTURE_ALPHA := 1.0
const CAPTURE_ALPHA_SOON := 0.35
const TILE_RADIUS := 30.0
const TILE_BORDER := 6

const PILL_COLOR := Color(1.0, 0.96, 0.86)
const SHOP_COLOR := Color(1.0, 0.62, 0.10)

var profile_id: String = ""
var _toast: Control = null


## Fond : ciel bleu, nuages et collines vertes.
class Meadow extends Control:
	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		resized.connect(queue_redraw)

	func _cloud(center: Vector2, scale_factor: float) -> void:
		var white := Color(1.0, 1.0, 1.0, 0.92)
		draw_circle(center, 26.0 * scale_factor, white)
		draw_circle(center + Vector2(30, 6) * scale_factor, 32.0 * scale_factor, white)
		draw_circle(center + Vector2(64, 8) * scale_factor, 24.0 * scale_factor, white)
		draw_circle(center + Vector2(32, 18) * scale_factor, 26.0 * scale_factor, white)

	func _draw() -> void:
		var w := size.x
		var h := size.y
		var top := Color(0.20, 0.58, 0.95)
		var bottom := Color(0.62, 0.85, 1.0)
		draw_polygon(
			PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, h), Vector2(0, h)]),
			PackedColorArray([top, top, bottom, bottom]),
		)
		_cloud(Vector2(w * 0.40, h * 0.14), 1.3)
		_cloud(Vector2(w * 0.04, h * 0.30), 1.5)
		_cloud(Vector2(w * 0.88, h * 0.34), 1.4)
		draw_circle(Vector2(w * 0.12, h * 1.10), h * 0.38, Color(0.48, 0.80, 0.32))
		draw_circle(Vector2(w * 0.82, h * 1.16), h * 0.44, Color(0.42, 0.74, 0.28))
		draw_circle(Vector2(w * 0.50, h * 1.34), h * 0.52, Color(0.36, 0.68, 0.24))


## Deux petits traits dorés de chaque côté du titre.
class Dashes extends Control:
	var flip := false

	func _init(p_flip: bool = false) -> void:
		flip = p_flip
		custom_minimum_size = Vector2(56, 70)
		size_flags_vertical = Control.SIZE_SHRINK_CENTER
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var gold := Color(1.0, 0.80, 0.15)
		var strokes := [
			[Vector2(8, 16), Vector2(46, 28)],
			[Vector2(8, 56), Vector2(46, 44)],
		]

		for stroke in strokes:
			var a: Vector2 = stroke[0]
			var b: Vector2 = stroke[1]

			if flip:
				a.x = size.x - a.x
				b.x = size.x - b.x

			draw_line(a, b, gold, 12.0, true)
			draw_circle(a, 6.0, gold)
			draw_circle(b, 6.0, gold)


## Petit sac de courses blanc pour le bouton Boutique.
class BagIcon extends Control:
	func _init() -> void:
		custom_minimum_size = Vector2(36, 40)
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var w := size.x
		var h := size.y
		draw_arc(Vector2(w * 0.5, h * 0.38), w * 0.22, PI, TAU, 16, Color.WHITE, 3.5, true)
		draw_rect(Rect2(w * 0.10, h * 0.38, w * 0.80, h * 0.58), Color.WHITE)


## Image qui remplit la tuile (comme « cover » : recadrée, jamais déformée), coins arrondis.
class TileImage extends Control:
	var texture: Texture2D
	var radius := 24.0
	var alpha := 1.0

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

	var meadow := Meadow.new()
	add_child(meadow)
	meadow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var margin := MarginContainer.new()
	add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 30)
	margin.add_theme_constant_override("margin_top", 26)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	column.add_child(_make_top_bar(profile))
	column.add_child(_make_title(profile))

	if not Speech.has_french_voice():
		var warning := Ui.label(
			"Aucune voix française n’est installée sur cet appareil : les mots ne pourront pas être dits. Un adulte peut en ajouter une dans les réglages Android (synthèse vocale).",
			22,
			Color(1.0, 0.95, 0.70),
		)
		warning.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		column.add_child(warning)

	var grid := GridContainer.new()
	grid.columns = 3
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 24)
	grid.add_theme_constant_override("v_separation", 24)
	column.add_child(grid)

	for game in Games.LIST:
		grid.add_child(_make_game_tile(profile, game))


## Bouton « retour » d'Android.
func on_back() -> void:
	change_player.emit()


## Une pastille crème arrondie qui entoure son contenu.
func _make_pill(content: Control) -> PanelContainer:
	var pill := PanelContainer.new()
	var style := Ui.flat(PILL_COLOR, 36, 0, Color.WHITE, true)
	style.content_margin_left = 14
	style.content_margin_right = 20
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	pill.add_theme_stylebox_override("panel", style)
	pill.add_child(content)
	return pill


func _make_top_bar(profile: Dictionary) -> HBoxContainer:
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 16)

	var change := Ui.button("Changer de joueur", 26, Color(0.20, 0.31, 0.52))
	change.pressed.connect(func() -> void: change_player.emit())
	top.add_child(change)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)

	# Joueur : avatar rond + prénom.
	var player := HBoxContainer.new()
	player.add_theme_constant_override("separation", 12)

	var ring := PanelContainer.new()
	ring.custom_minimum_size = Vector2(68, 68)
	ring.clip_children = CanvasItem.CLIP_CHILDREN_AND_DRAW
	ring.add_theme_stylebox_override("panel", Ui.flat(Color(0.85, 0.93, 1.0), 34, 4, Color.WHITE, false))
	var avatar := AvatarView.new()
	avatar.avatar_id = profile["avatar_id"]
	avatar.custom_minimum_size = Vector2(68, 68)
	ring.add_child(avatar)
	player.add_child(ring)
	player.add_child(Ui.label(profile["name"], 30, Ui.DARK_TEXT))
	top.add_child(_make_pill(player))

	# Étoiles.
	var stars := HBoxContainer.new()
	stars.add_theme_constant_override("separation", 10)
	var star := StarView.new()
	star.custom_minimum_size = Vector2(40, 40)
	stars.add_child(star)
	stars.add_child(Ui.label(str(profile["stars"]), 32, Ui.DARK_TEXT))
	top.add_child(_make_pill(stars))

	top.add_child(_make_shop_button())
	return top


func _make_shop_button() -> Button:
	var button := Ui.button("", 28, SHOP_COLOR)
	button.custom_minimum_size = Vector2(230, 72)

	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 10)
	button.add_child(row)
	row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	row.add_child(BagIcon.new())
	row.add_child(Ui.label("Boutique", 32, Color.WHITE))

	var badge := PanelContainer.new()
	var badge_style := Ui.flat(Color(0.90, 0.15, 0.18), 14, 2, Color.WHITE, false)
	badge_style.content_margin_left = 10
	badge_style.content_margin_right = 10
	badge_style.content_margin_top = 0
	badge_style.content_margin_bottom = 0
	badge.add_theme_stylebox_override("panel", badge_style)
	badge.add_child(Ui.label("Nouveau", 18, Color.WHITE))
	button.add_child(badge)
	badge.anchor_left = 1.0
	badge.anchor_right = 1.0
	badge.anchor_top = 0.0
	badge.anchor_bottom = 0.0
	badge.offset_left = -104.0
	badge.offset_right = 8.0
	badge.offset_top = -16.0
	badge.offset_bottom = 14.0

	Ui.ignore_mouse(row)
	Ui.ignore_mouse(badge)
	button.pressed.connect(_on_shop_pressed)
	return button


## La boutique n'est pas encore codée : un petit message, en attendant.
func _on_shop_pressed() -> void:
	open_shop.emit()


func _show_toast(text: String) -> void:
	if is_instance_valid(_toast):
		_toast.queue_free()

	var panel := PanelContainer.new()
	var style := Ui.flat(Color(0.07, 0.14, 0.25, 0.92), 28, 0, Color.WHITE, false)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	panel.add_theme_stylebox_override("panel", style)
	panel.add_child(Ui.label(text, 30, Ui.CREAM))
	Ui.ignore_mouse(panel)
	add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_MINSIZE, 70)
	_toast = panel

	var tween := panel.create_tween()
	tween.tween_interval(1.8)
	tween.tween_property(panel, "modulate:a", 0.0, 0.4)
	tween.tween_callback(panel.queue_free)


func _make_title(profile: Dictionary) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 18)

	var title := Ui.label("À quoi on joue, %s ?" % profile["name"], 60, Ui.CREAM)
	title.add_theme_color_override("font_outline_color", Color(0.18, 0.45, 0.80))
	title.add_theme_constant_override("outline_size", 16)

	row.add_child(Dashes.new(false))
	row.add_child(title)
	row.add_child(Dashes.new(true))
	return row


## La capture du jeu, ou null s'il n'y en a pas (jeux pas encore écrits).
func _capture_for(game_id: String) -> Texture2D:
	var path := CAPTURES % game_id

	if ResourceLoader.exists(path):
		return load(path) as Texture2D

	return null


func _make_game_tile(_profile: Dictionary, game: Dictionary) -> Button:
	var available: bool = game["available"]
	var color: Color = game["color"]
	var tile_color := color

	if not available:
		tile_color = color.darkened(0.25).lerp(Color(0.55, 0.58, 0.60), 0.45)

	var button := Button.new()
	button.custom_minimum_size = Vector2(320, 170)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.size_flags_vertical = Control.SIZE_EXPAND_FILL
	button.focus_mode = Control.FOCUS_NONE
	button.disabled = not available

	var border_color := tile_color.lightened(0.20)
	button.add_theme_stylebox_override("normal", Ui.flat(tile_color, int(TILE_RADIUS), TILE_BORDER, border_color, true))
	button.add_theme_stylebox_override("hover", Ui.flat(tile_color.lightened(0.08), int(TILE_RADIUS), TILE_BORDER, border_color, true))
	button.add_theme_stylebox_override("pressed", Ui.flat(tile_color.darkened(0.15), int(TILE_RADIUS), TILE_BORDER, border_color, false))
	button.add_theme_stylebox_override("disabled", Ui.flat(tile_color, int(TILE_RADIUS), TILE_BORDER, border_color, true))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())

	var capture := _capture_for(game["id"])

	if capture != null:
		var picture := TileImage.new()
		picture.texture = capture
		picture.radius = TILE_RADIUS - float(TILE_BORDER)
		picture.alpha = CAPTURE_ALPHA if available else CAPTURE_ALPHA_SOON
		picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(picture)
		picture.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, TILE_BORDER)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	button.add_child(box)
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var top_gap := Control.new()
	top_gap.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(top_gap)

	if not available:
		var soon_style := Ui.flat(Color(0.20, 0.27, 0.40, 0.92), 22, 0, Color.WHITE, false)
		soon_style.content_margin_left = 22
		soon_style.content_margin_right = 22
		soon_style.content_margin_top = 4
		soon_style.content_margin_bottom = 4
		var soon := PanelContainer.new()
		soon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		soon.add_theme_stylebox_override("panel", soon_style)
		soon.add_child(Ui.label("Bientôt", 28, Ui.CREAM))
		box.add_child(soon)

		var mid_gap := Control.new()
		mid_gap.size_flags_vertical = Control.SIZE_EXPAND_FILL
		box.add_child(mid_gap)

	var title := Ui.label(game["title"], 38, Color.WHITE if available else Color(1, 1, 1, 0.85))
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_color_override("font_outline_color", Color(0.04, 0.04, 0.10, 0.95))
	title.add_theme_constant_override("outline_size", 10)
	box.add_child(title)

	var bottom_pad := Control.new()
	bottom_pad.custom_minimum_size = Vector2(0, 12)
	box.add_child(bottom_pad)

	Ui.ignore_mouse(box)
	button.pressed.connect(func() -> void: play.emit(game["id"]))
	return button
