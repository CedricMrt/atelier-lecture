extends Control
## « Pont du volcan » : écoute le mot, puis touche les bonnes lettres pour traverser la lave.
## Version provisoire : décor et personnage dessinés par code (2D). Les vrais modèles
## 3D remplaceront _build_background() et _build_hero() sans changer le déroulement.

signal finished(result: Dictionary)

const Ui = preload("res://scripts/ui/ui.gd")
const AvatarView = preload("res://scripts/ui/avatar_view.gd")
const Dot = preload("res://scripts/ui/dot.gd")
const Logic = preload("res://scripts/logic/volcano_logic.gd")

# Le jeu est dessiné dans une scène de 1280 x 720, mise à l'échelle de l'écran.
const W := 1280.0
const H := 720.0
const TILE_W := 120.0
const TILE_H := 100.0
const START_X := 130.0
const START_Y := 470.0
const HERO_OFFSET_Y := -145.0

const TILE_COLORS := {
	"normal": Color(0.80, 0.72, 0.64),
	"correct": Color(0.25, 0.75, 0.42),
	"wrong": Color(0.90, 0.28, 0.30),
}

var level: int = 1
var rounds_count: int = 5
var avatar_id: String = "renard"

var _words: Array = []
var _round_index := 0
var _letters: Array = []
var _position := 0
var _errors_here := 0
var _total_letters := 0
var _total_errors := 0
var _locked := true
var _alive := true

var _stage: Control
var _stage_base := Vector2.ZERO
var _tiles: Array = []         # Array (par colonne) d'Array de {letter, x, y, button}
var _slot_labels: Array = []
var _round_nodes: Array = []

var _hero: Control
var _hero_body: Control
var _counter: Label
var _message: Label
var _clue: TextureRect


func setup(p_level: int, p_rounds: int, p_avatar_id: String) -> void:
	level = p_level
	rounds_count = p_rounds
	avatar_id = p_avatar_id


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	clip_contents = true

	_stage = Control.new()
	_stage.size = Vector2(W, H)
	add_child(_stage)
	resized.connect(_fit_stage)
	_fit_stage()

	_words = Logic.pick_words(level, rounds_count)

	_build_background()
	_build_hud()
	_build_hero()
	_start_round()


func _exit_tree() -> void:
	_alive = false
	Speech.cancel()


func _fit_stage() -> void:
	var factor := minf(size.x / W, size.y / H)

	if factor <= 0.0:
		return

	_stage.scale = Vector2(factor, factor)
	_stage_base = (size - Vector2(W, H) * factor) / 2.0
	_stage.position = _stage_base


# ---------- Décor provisoire (à remplacer par les vrais modèles) ----------

func _build_background() -> void:
	var sky := ColorRect.new()
	sky.color = Color.html("2b0f0a")
	sky.size = Vector2(W, H)
	_stage.add_child(sky)

	# Parois de la grotte
	var wall_color := Color.html("170705")
	for points in [
		PackedVector2Array([Vector2(0, 0), Vector2(260, 0), Vector2(0, 380)]),
		PackedVector2Array([Vector2(W, 0), Vector2(W - 300, 0), Vector2(W, 330)]),
		PackedVector2Array([Vector2(0, H), Vector2(0, 560), Vector2(200, H)]),
	]:
		var wall := Polygon2D.new()
		wall.polygon = points
		wall.color = wall_color
		_stage.add_child(wall)

	# Lave : bandes de couleurs qui respirent
	var base := ColorRect.new()
	base.color = Color.html("7d1d0b")
	base.position = Vector2(0, 275)
	base.size = Vector2(W, H - 275)
	_stage.add_child(base)

	var bands := ["7d1d0b", "b3360d", "e0561a", "f58a2b"]

	for i in bands.size():
		var band := ColorRect.new()
		band.color = Color.html(bands[i])
		band.color.a = 0.9
		band.position = Vector2(0, 330 + i * 95 - 55)
		band.size = Vector2(W, 110)
		_stage.add_child(band)

		var tween := band.create_tween().set_loops()
		tween.tween_property(band, "modulate:a", 0.7, 1.2 + i * 0.26).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		tween.tween_property(band, "modulate:a", 1.0, 1.2 + i * 0.26).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Bulles de lave
	for i in 16:
		var bubble := Dot.new()
		bubble.radius = randf_range(5.0, 14.0)
		var start_y := randf_range(380.0, H - 30.0)
		bubble.position = Vector2(randf_range(40.0, W - 40.0), start_y)
		_stage.add_child(bubble)

		var duration := randf_range(1.4, 2.6)
		var rise := randf_range(30.0, 70.0)
		var tween := bubble.create_tween().set_loops().set_parallel(true)
		tween.tween_property(bubble, "position:y", start_y - rise, duration).from(start_y).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		tween.tween_property(bubble, "modulate:a", 0.0, duration).from(1.0)
		tween.tween_property(bubble, "scale", Vector2(1.6, 1.6), duration).from(Vector2.ONE)


func _build_hud() -> void:
	var speaker := Ui.button("Écouter", 30, Ui.ORANGE)
	speaker.position = Vector2(1040, 24)
	speaker.custom_minimum_size = Vector2(170, 80)
	speaker.pressed.connect(func() -> void:
		if _round_index < _words.size():
			_say_current_word()
	)
	_stage.add_child(speaker)

	# Image-indice : affichée seulement si le fichier du mot existe.
	_clue = TextureRect.new()
	_clue.position = Vector2(1060, 120)
	_clue.size = Vector2(130, 130)
	_clue.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_clue.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_stage.add_child(_clue)

	_counter = Ui.label("", 24, Color.html("ffe2c2"), HORIZONTAL_ALIGNMENT_LEFT)
	_counter.position = Vector2(190, 26)
	_counter.size = Vector2(240, 36)
	_stage.add_child(_counter)

	_message = Ui.label("", 34, Color.WHITE)
	_message.position = Vector2(0, 662)
	_message.size = Vector2(W, 50)
	_message.add_theme_color_override("font_outline_color", Color.html("2b0f0a"))
	_message.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_message)


func _build_hero() -> void:
	_hero = Control.new()
	_hero.position = Vector2(START_X, START_Y)
	_hero.z_index = 10

	_hero_body = AvatarView.new()
	_hero_body.avatar_id = avatar_id
	_hero_body.size = Vector2(100, 100)
	_hero_body.position = Vector2(-50, HERO_OFFSET_Y)
	_hero.add_child(_hero_body)

	_stage.add_child(_hero)


# ---------- Déroulement d'une manche ----------

func _start_round() -> void:
	for node in _round_nodes:
		if is_instance_valid(node):
			node.queue_free()

	_round_nodes.clear()
	_tiles.clear()
	_slot_labels.clear()

	var item: Dictionary = _words[_round_index]
	var word: String = item["word"]

	_letters = Logic.letters_of(word)
	_position = 0
	_errors_here = 0

	_load_clue(word)
	_counter.text = "Mot %d sur %d" % [_round_index + 1, _words.size()]
	_message.text = "Écoute le mot…"
	_hero.position = Vector2(START_X, START_Y)

	_build_slots()
	_build_tiles(word)

	_locked = true

	await get_tree().create_timer(0.35).timeout
	if not _alive:
		return

	await _say_current_word()
	if not _alive:
		return

	_locked = false
	_message.text = "Touche les bonnes lettres !"


func _load_clue(word: String) -> void:
	var path := "res://assets/images/words/%s.png" % word

	if ResourceLoader.exists(path):
		_clue.texture = load(path)
	else:
		_clue.texture = null


func _say_current_word() -> void:
	var item: Dictionary = _words[_round_index]
	var spoken: String = item.get("spoken", item["word"])
	await Speech.speak(spoken)


func _build_slots() -> void:
	var count := _letters.size()
	var gap := 78.0
	var first_x := W / 2.0 - (count - 1) * gap / 2.0 - 80.0

	for i in count:
		var x := first_x + i * gap

		var slot := Panel.new()
		slot.position = Vector2(x - 32, 34)
		slot.size = Vector2(64, 76)
		slot.add_theme_stylebox_override("panel", Ui.flat(Color(0, 0, 0, 0.4), 14, 4, Color(1.0, 0.89, 0.76, 0.9), false))
		_stage.add_child(slot)

		var letter := Ui.label("", 52, Color.WHITE)
		letter.size = slot.size
		slot.add_child(letter)

		_slot_labels.append(letter)
		_round_nodes.append(slot)


func _build_tiles(word: String) -> void:
	var columns: Array = Logic.build_columns(word, level)
	var count := columns.size()
	var column_gap := minf(170.0, 880.0 / maxf(1.0, count - 1.0))
	var total_width := (count - 1) * column_gap
	var first_x := 300.0 + (880.0 - total_width) / 2.0

	for column_index in count:
		var column: Array = columns[column_index]
		var x := first_x + column_index * column_gap
		var rows := column.size()
		var tiles_in_column: Array = []

		for row in rows:
			var y := 440.0 if rows == 1 else 270.0 + row * 330.0 / (rows - 1)
			tiles_in_column.append(_create_tile(column[row], x, y, column_index))

		_tiles.append(tiles_in_column)


func _create_tile(letter: String, x: float, y: float, column: int) -> Dictionary:
	var button := Button.new()
	button.text = letter
	button.focus_mode = Control.FOCUS_NONE
	button.size = Vector2(TILE_W, TILE_H)
	button.position = Vector2(x - TILE_W / 2.0, y - TILE_H / 2.0)
	button.pivot_offset = button.size / 2.0
	button.add_theme_font_override("font", Ui.bold_font())
	button.add_theme_font_size_override("font_size", 68)

	for color_name in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_disabled_color"]:
		button.add_theme_color_override(color_name, Ui.DARK_TEXT)

	var tile := {"letter": letter, "x": x, "y": y, "button": button}
	_set_tile_state(tile, "normal")

	button.pressed.connect(_on_tile_pressed.bind(tile, column))
	_stage.add_child(button)
	_round_nodes.append(button)

	return tile


func _set_tile_state(tile: Dictionary, state: String) -> void:
	var button: Button = tile["button"]
	var color: Color = TILE_COLORS[state]

	for style_name in ["normal", "hover", "pressed", "disabled"]:
		var style := Ui.flat(color, 22)
		style.content_margin_left = 0
		style.content_margin_right = 0
		button.add_theme_stylebox_override(style_name, style)

	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


# ---------- Réponses ----------

func _on_tile_pressed(tile: Dictionary, column: int) -> void:
	if _locked or column != _position:
		return

	if tile["letter"] == _letters[column]:
		_on_correct(tile, column)
	else:
		_on_wrong(tile, column)


func _on_correct(tile: Dictionary, column: int) -> void:
	_locked = true
	_total_letters += 1
	_errors_here = 0

	_set_tile_state(tile, "correct")
	_slot_labels[column].text = tile["letter"]
	_message.text = "Bien !"

	# Saut vers la dalle : déplacement horizontal + arc vertical.
	var move := create_tween()
	move.tween_property(_hero, "position", Vector2(tile["x"], tile["y"]), 0.46).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	var jump := create_tween()
	jump.tween_property(_hero_body, "position:y", HERO_OFFSET_Y - 90.0, 0.23).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	jump.tween_property(_hero_body, "position:y", HERO_OFFSET_Y, 0.23).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	await get_tree().create_timer(0.52).timeout
	if not _alive:
		return

	_position += 1

	if _position >= _letters.size():
		_finish_word()
	else:
		_locked = false


func _on_wrong(tile: Dictionary, column: int) -> void:
	_total_errors += 1
	_errors_here += 1

	var button: Button = tile["button"]
	_set_tile_state(tile, "wrong")
	button.disabled = true
	_shake()
	_message.text = "Oups, essaie encore !"

	# La dalle fausse tombe dans la lave.
	var fall := create_tween().set_parallel(true)
	fall.tween_property(button, "position:y", button.position.y + 160.0, 0.52).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	fall.tween_property(button, "modulate:a", 0.0, 0.52)

	if _errors_here >= 2:
		# Aide : on redit le mot et on fait briller la bonne dalle.
		_say_current_word()

		for candidate in _tiles[column]:
			if candidate["letter"] == _letters[column]:
				var right: Button = candidate["button"]
				var pulse := create_tween().set_loops(4)
				pulse.tween_property(right, "scale", Vector2(1.15, 1.15), 0.26).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
				pulse.tween_property(right, "scale", Vector2.ONE, 0.26).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


func _shake() -> void:
	var shake := create_tween()

	for i in 3:
		shake.tween_property(_stage, "position", _stage_base + Vector2(8 if i % 2 == 0 else -8, 0), 0.03)

	shake.tween_property(_stage, "position", _stage_base, 0.03)


func _finish_word() -> void:
	_message.text = "Bravo !"
	_confetti()

	await get_tree().create_timer(0.3).timeout
	if not _alive:
		return

	_say_current_word()

	await get_tree().create_timer(1.9).timeout
	if not _alive:
		return

	_round_index += 1

	if _round_index >= _words.size():
		_finish_game()
	else:
		_start_round()


func _confetti() -> void:
	var colors := [Color.html("ff7a1a"), Color.html("ffd23f"), Color.html("3fbf6b"), Color.html("4db8ff"), Color.html("ff6bb5")]

	for i in 36:
		var piece := ColorRect.new()
		piece.color = colors.pick_random()
		piece.size = Vector2(randf_range(10.0, 18.0), randf_range(16.0, 26.0))
		piece.position = Vector2(randf_range(300.0, 1180.0), randf_range(-30.0, 80.0))
		piece.rotation = randf_range(0.0, PI)
		piece.z_index = 30
		_stage.add_child(piece)

		var duration := randf_range(1.1, 1.9)
		var tween := piece.create_tween().set_parallel(true)
		tween.tween_property(piece, "position:y", H + 40.0, duration).set_delay(randf_range(0.0, 0.3)).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tween.tween_property(piece, "rotation", piece.rotation + randf_range(PI, 3.0 * PI), duration)
		tween.finished.connect(piece.queue_free)


func _finish_game() -> void:
	_locked = true
	finished.emit({
		"stars": Logic.stars_from_errors(_total_errors),
		"accuracy": Logic.accuracy_from(_total_letters, _total_errors),
	})
