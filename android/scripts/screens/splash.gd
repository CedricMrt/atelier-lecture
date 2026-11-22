extends Control
## Démarrage de l'appli, avant « Qui joue ? ».
##   1. Le logo apparaît en grand, exactement comme l'image de lancement d'Android (pas de saut visuel).
##   2. Il glisse à gauche ; à droite, le titre se forme en tuiles de lettres qui sautent l'une après l'autre.
##   3. Une barre de chargement : les modèles 3D sont chargés en tâche de fond pour que les jeux et
##      le choix du personnage s'ouvrent ensuite sans à-coup.
##   4. « Touche pour jouer ».
## La barre dure au moins MIN_SECONDS, même si tout est déjà prêt : l'animation a le temps de se jouer.

signal finished

const Ui = preload("res://scripts/ui/ui.gd")
const Avatars = preload("res://scripts/data/avatars.gd")
const VolcanoGame = preload("res://scripts/games/volcano_game.gd")

const LOGO_PATH := "res://assets/images/logo_appli.png"

const MIN_SECONDS := 3.2
const TAP_DELAY_MS := 600
const LOGO_HOLD := 0.5        # le logo reste seul, en grand, avant de glisser
const LOGO_SLIDE := 0.75
const TITLE_LINES := ["LETTRES", "EN QUÊTE"]
const SUBTITLE := "Joue, écoute, lis !"

const EDGE_FADE_SHADER := """
shader_type canvas_item;

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	vec2 d = min(UV, vec2(1.0) - UV);
	float edge = smoothstep(0.0, 0.07, min(d.x, d.y));
	COLOR = vec4(c.rgb, c.a * edge);
}
"""

const TILE_COLORS := [
	Color(0.95, 0.45, 0.10),
	Color(0.52, 0.30, 0.78),
	Color(0.98, 0.72, 0.14),
	Color(0.93, 0.36, 0.55),
	Color(0.24, 0.70, 0.40),
	Color(0.88, 0.30, 0.18),
]

const TILE_W := 70.0
const TILE_H := 82.0
const SPACE_W := 26.0

## Les modèles chargés restent ici tant que l'appli tourne : sinon Godot les libérerait
## dès la fin de l'écran de démarrage et il faudrait les recharger.
static var kept_resources: Array = []

var _paths: Array = []
var _finished_paths := {}
var _loaded_ratio := 0.0
var _all_loaded := false
var _elapsed := 0.0
var _shown_progress := 0.0
var _waiting_tap := false
var _tap_allowed_at := 0
var _leaving := false

var _logo: TextureRect
var _logo_end_scale := 0.6
var _logo_end_center := Vector2.ZERO
var _tiles: Array = []
var _subtitle: Label
var _loading_box: VBoxContainer
var _bar: ProgressBar
var _tap_label: Label


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	_animate()
	_start_loading()


## Bouton « retour » d'Android : on quitte l'appli.
func on_back() -> void:
	get_tree().quit()


# ---------- Interface ----------

func _build_ui() -> void:
	var view := get_viewport_rect().size

	# Logo : carré de la hauteur de l'écran, centré (comme l'image de lancement).
	_logo = TextureRect.new()
	_logo.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED

	if ResourceLoader.exists(LOGO_PATH):
		_logo.texture = load(LOGO_PATH)

	# Bords du carré fondus dans le dégradé du fond : on ne voit pas le cadre de l'image.
	var fade_edges := Shader.new()
	fade_edges.code = EDGE_FADE_SHADER
	var fade_material := ShaderMaterial.new()
	fade_material.shader = fade_edges
	_logo.material = fade_material

	var logo_size := view.y
	_logo.size = Vector2(logo_size, logo_size)
	_logo.pivot_offset = _logo.size / 2.0
	_logo.position = (view - _logo.size) / 2.0
	add_child(_logo)

	# Arrivée du logo : à gauche, à environ 70 % de la hauteur de l'écran.
	_logo_end_scale = minf(0.72, (view.x * 0.46) / logo_size)
	_logo_end_center = Vector2(view.x * 0.27, view.y * 0.5)

	# Colonne de droite : titre, sous-titre, barre / « Touche pour jouer ».
	var right := CenterContainer.new()
	right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(right)
	right.anchor_left = 0.5
	right.anchor_right = 1.0
	right.anchor_top = 0.0
	right.anchor_bottom = 1.0
	right.offset_left = 0.0
	right.offset_right = -view.x * 0.03
	right.offset_top = 0.0
	right.offset_bottom = 0.0

	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 16)
	right.add_child(column)

	var color_index := 0

	for line in TITLE_LINES:
		var row := HBoxContainer.new()
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		row.add_theme_constant_override("separation", 8)
		column.add_child(row)

		for i in line.length():
			var letter: String = line.substr(i, 1)

			if letter == " ":
				var gap := Control.new()
				gap.custom_minimum_size = Vector2(SPACE_W, 0.0)
				row.add_child(gap)
				continue

			var tile := _make_tile(letter, TILE_COLORS[color_index % TILE_COLORS.size()])
			row.add_child(tile)
			_tiles.append(tile)
			color_index += 1

	_subtitle = Ui.label(SUBTITLE, 36, Color.WHITE)
	_subtitle.add_theme_color_override("font_outline_color", Color(0.0, 0.2, 0.35))
	_subtitle.add_theme_constant_override("outline_size", 8)
	_subtitle.modulate.a = 0.0
	column.add_child(_subtitle)

	# Même emplacement pour la barre de chargement et pour « Touche pour jouer ».
	var bottom := CenterContainer.new()
	bottom.custom_minimum_size = Vector2(0.0, 96.0)
	column.add_child(bottom)

	_loading_box = VBoxContainer.new()
	_loading_box.add_theme_constant_override("separation", 8)
	_loading_box.modulate.a = 0.0
	bottom.add_child(_loading_box)

	_loading_box.add_child(Ui.label("Chargement…", 24, Color(1.0, 1.0, 1.0, 0.85)))

	_bar = ProgressBar.new()
	_bar.min_value = 0.0
	_bar.max_value = 1.0
	_bar.step = 0.001
	_bar.value = 0.0
	_bar.show_percentage = false
	_bar.custom_minimum_size = Vector2(420.0, 24.0)
	_bar.add_theme_stylebox_override("background", Ui.flat(Color(0.0, 0.12, 0.25, 0.45), 12, 0, Color.WHITE, false))
	_bar.add_theme_stylebox_override("fill", Ui.flat(Color(0.98, 0.72, 0.14), 12, 0, Color.WHITE, false))
	_loading_box.add_child(_bar)

	_tap_label = Ui.label("Touche pour jouer", 44, Color.WHITE)
	_tap_label.add_theme_color_override("font_outline_color", Color(0.0, 0.2, 0.35))
	_tap_label.add_theme_constant_override("outline_size", 10)
	_tap_label.visible = false
	bottom.add_child(_tap_label)


## Une tuile de lettre : carré arrondi de couleur, lettre blanche cerclée de sombre.
func _make_tile(letter: String, color: Color) -> Control:
	var tile := Control.new()
	tile.custom_minimum_size = Vector2(TILE_W, TILE_H)
	tile.pivot_offset = Vector2(TILE_W, TILE_H) / 2.0
	tile.scale = Vector2.ZERO

	var panel := Panel.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel", Ui.flat(color, 20, 4, Color(1.0, 1.0, 1.0, 0.7)))
	tile.add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var label := Ui.label(letter, 52, Color.WHITE)
	label.add_theme_color_override("font_outline_color", color.darkened(0.55))
	label.add_theme_constant_override("outline_size", 8)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tile.add_child(label)
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	return tile


# ---------- Animations ----------

func _animate() -> void:
	# Le logo glisse à gauche en rétrécissant, puis respire doucement.
	var target_position := _logo_end_center - _logo.size / 2.0
	var slide := create_tween().set_parallel(true)
	slide.tween_property(_logo, "position", target_position, LOGO_SLIDE).set_delay(LOGO_HOLD).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	slide.tween_property(_logo, "scale", Vector2.ONE * _logo_end_scale, LOGO_SLIDE).set_delay(LOGO_HOLD).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)

	var breathe := create_tween()
	breathe.tween_interval(LOGO_HOLD + LOGO_SLIDE)
	breathe.tween_callback(_start_breathing)

	# Les tuiles sautent après le début du glissement du logo.
	var start := LOGO_HOLD + LOGO_SLIDE * 0.6
	var index := 0

	for tile in _tiles:
		var tween := create_tween()
		tween.tween_interval(start + index * 0.07)
		tween.tween_property(tile, "scale", Vector2.ONE, 0.45).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.tween_callback(_start_wobble.bind(tile, index))
		index += 1

	var after_tiles := start + _tiles.size() * 0.07

	var fade_subtitle := create_tween()
	fade_subtitle.tween_interval(after_tiles)
	fade_subtitle.tween_property(_subtitle, "modulate:a", 1.0, 0.5)

	var fade_bar := create_tween()
	fade_bar.tween_interval(start)
	fade_bar.tween_property(_loading_box, "modulate:a", 1.0, 0.4)


func _start_breathing() -> void:
	var base := _logo_end_scale
	var tween := create_tween().set_loops()
	tween.tween_property(_logo, "scale", Vector2.ONE * base * 1.025, 1.4).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(_logo, "scale", Vector2.ONE * base, 1.4).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


## Balancement très léger et sans fin : le titre reste vivant.
func _start_wobble(tile: Control, index: int) -> void:
	var amplitude := 0.045 if index % 2 == 0 else -0.045
	var tween := create_tween().set_loops()
	tween.tween_property(tile, "rotation", amplitude, 0.9).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(tile, "rotation", -amplitude, 0.9).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


# ---------- Chargement ----------

## Les modèles 3D utilisés par les jeux et par le choix du personnage.
func _paths_to_preload() -> Array:
	var paths: Array = []

	for avatar in Avatars.LIST:
		paths.append(avatar["model"])

	paths.append(VolcanoGame.CHEST_CLOSED)
	paths.append(VolcanoGame.CHEST_MODEL)
	paths.append(VolcanoGame.TILE_MODEL)

	for file in VolcanoGame.CLIFFS:
		paths.append(VolcanoGame.HEX_NATURE + file)

	for file in VolcanoGame.ROCKS:
		paths.append(VolcanoGame.HEX_NATURE + file)

	for path in VolcanoGame.RIG_ANIMATION_FILES:
		paths.append(path)

	return paths


func _start_loading() -> void:
	for path in _paths_to_preload():
		if ResourceLoader.exists(path) and not _paths.has(path):
			ResourceLoader.load_threaded_request(path, "", true)
			_paths.append(path)

	_poll_loading()


func _poll_loading() -> void:
	for path in _paths:
		if _finished_paths.has(path):
			continue

		var status := ResourceLoader.load_threaded_get_status(path)

		if status == ResourceLoader.THREAD_LOAD_IN_PROGRESS:
			continue

		# Chargé, ou en échec : dans les deux cas on n'attend plus ce fichier
		# (un modèle absent est remplacé par une forme simple dans les jeux).
		_finished_paths[path] = true

		if status == ResourceLoader.THREAD_LOAD_LOADED:
			var resource: Resource = ResourceLoader.load_threaded_get(path)

			if resource != null:
				kept_resources.append(resource)

	_all_loaded = _finished_paths.size() >= _paths.size()
	_loaded_ratio = 1.0 if _paths.is_empty() else float(_finished_paths.size()) / float(_paths.size())


func _process(delta: float) -> void:
	_elapsed += delta

	if not _all_loaded:
		_poll_loading()

	# La barre avance régulièrement : jamais plus vite que le temps minimum, même si tout est en cache.
	var target := minf(_loaded_ratio, _elapsed / MIN_SECONDS)
	_shown_progress = move_toward(_shown_progress, target, delta * 1.2)
	_bar.value = _shown_progress

	if not _waiting_tap and _all_loaded and _shown_progress >= 0.999:
		_show_ready()


func _show_ready() -> void:
	_waiting_tap = true
	_tap_allowed_at = Time.get_ticks_msec() + TAP_DELAY_MS

	var hide_bar := create_tween()
	hide_bar.tween_property(_loading_box, "modulate:a", 0.0, 0.25)
	hide_bar.tween_callback(func() -> void: _loading_box.visible = false)

	_tap_label.modulate.a = 0.0
	_tap_label.visible = true

	var pulse := create_tween()
	pulse.tween_interval(0.3)
	pulse.tween_property(_tap_label, "modulate:a", 1.0, 0.4)
	pulse.tween_callback(_start_pulse)


func _start_pulse() -> void:
	var tween := create_tween().set_loops()
	tween.tween_property(_tap_label, "modulate:a", 0.5, 0.8).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(_tap_label, "modulate:a", 1.0, 0.8).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


# ---------- Sortie ----------

## _input (et non _unhandled_input) : comme dans les jeux, les Control plein écran absorbent les touches.
func _input(event: InputEvent) -> void:
	if not _waiting_tap or _leaving:
		return

	if Time.get_ticks_msec() < _tap_allowed_at:
		return

	var mouse := event as InputEventMouseButton
	var key := event as InputEventKey
	var tapped := mouse != null and mouse.pressed and mouse.button_index == MOUSE_BUTTON_LEFT
	var key_pressed := key != null and key.pressed and not key.echo

	if tapped or key_pressed:
		_leave()


func _leave() -> void:
	_leaving = true

	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.3)
	tween.tween_callback(finished.emit)
