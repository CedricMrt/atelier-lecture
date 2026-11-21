extends Control
## « Dedans ou pas ? » : une lettre cible est affichée en haut, puis une suite de lettres apparaît
## quelques secondes dans un disque qui s'ouvre et se ferme. L'enfant touche la zone verte (DEDANS)
## ou la zone rouge (PAS DEDANS). Travaille l'empan visuel : plus le niveau monte, plus la suite
## est longue et courte à voir.
## Aucune image : l'arène est dessinée par code. La logique est dans logic/inside_logic.gd.

signal finished(result: Dictionary)

const Ui = preload("res://scripts/ui/ui.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const Logic = preload("res://scripts/logic/inside_logic.gd")

# Interface dessinée dans une scène de 1280 x 720, mise à l'échelle de l'écran.
const W := 1280.0
const H := 720.0
const CENTER := Vector2(640.0, 390.0)

const YELLOW := Color(1.0, 0.82, 0.20)
const GOLD := Color(1.0, 0.85, 0.3)
const OUTLINE := Color(0.22, 0.09, 0.04)

var level: int = 1
var rounds_count: int = 8

var _rounds: Array = []
var _round_index := 0
var _current: Dictionary = {}
var _correct := 0
var _errors := 0
var _combo := 0
var _best_combo := 0
var _accepting := false
var _alive := true

var _arena: Arena
var _stage: Control
var _stage_base := Vector2.ZERO
var _letters_box: HBoxContainer
var _question_mark: Label
var _target_label: Label
var _message: Label
var _counter: Label
var _score_label: Label
var _combo_label: Label


## Arène : deux zones (rouge à gauche, verte à droite) en planches, et le disque central
## dont les deux volets s'écartent (openness de 0 à 1).
class Arena extends Control:
	const BASE_W := 1280.0
	const BASE_H := 720.0
	const MID := 640.0
	const CENTER := Vector2(640.0, 390.0)
	const HOLE_R := 170.0
	const RED := Color(0.74, 0.14, 0.10)
	const GREEN := Color(0.20, 0.58, 0.20)
	const YELLOW := Color(1.0, 0.82, 0.20)
	const WOOD := Color(0.86, 0.62, 0.30)

	var openness: float = 0.0:
		set(value):
			openness = value
			queue_redraw()

	var flash_alpha: float = 0.0:
		set(value):
			flash_alpha = value
			queue_redraw()

	var flash_side: int = 1
	var flash_color: Color = Color.WHITE


	func _draw() -> void:
		var s: float = minf(size.x / BASE_W, size.y / BASE_H)

		if s <= 0.0:
			return

		var origin: Vector2 = (size - Vector2(BASE_W, BASE_H) * s) / 2.0
		var x0: float = -origin.x / s
		var x1: float = (size.x - origin.x) / s
		var y0: float = -origin.y / s
		var y1: float = (size.y - origin.y) / s
		draw_set_transform(origin, 0.0, Vector2(s, s))

		_planks(x0, MID, y0, y1, RED, 1.3)
		_planks(MID, x1, y0, y1, GREEN, 4.1)

		if flash_alpha > 0.0:
			var from_x: float = x0 if flash_side < 0 else MID
			var to_x: float = MID if flash_side < 0 else x1
			draw_rect(Rect2(from_x, y0, to_x - from_x, y1 - y0), Color(flash_color, flash_alpha))

		draw_rect(Rect2(MID - 5.0, y0, 10.0, y1 - y0), Color(1.0, 0.95, 0.8, 0.55))
		draw_rect(Rect2(x0, y0, x1 - x0, y1 - y0), Color(0.20, 0.09, 0.04), false, 24.0)

		_arrow(-1)
		_arrow(1)

		# Croix jaune sous « PAS DEDANS ».
		draw_line(Vector2(205.0, 485.0), Vector2(265.0, 545.0), YELLOW, 14.0)
		draw_line(Vector2(265.0, 485.0), Vector2(205.0, 545.0), YELLOW, 14.0)

		# Disque central.
		draw_circle(CENTER, HOLE_R + 48.0, Color(1.0, 1.0, 1.0, 0.16))
		draw_arc(CENTER, HOLE_R + 44.0, 0.0, TAU, 72, Color(1.0, 0.96, 0.85, 0.9), 6.0)
		draw_circle(CENTER, HOLE_R + 22.0, Color(0.30, 0.17, 0.07))
		draw_circle(CENTER, HOLE_R + 8.0, Color(0.55, 0.34, 0.14))
		draw_circle(CENTER, HOLE_R, Color(0.09, 0.05, 0.03))
		_shutter(-1)
		_shutter(1)


	func _planks(x_from: float, x_to: float, y0: float, y1: float, base: Color, seed_value: float) -> void:
		var plank_h: float = 96.0
		var y: float = floorf(y0 / plank_h) * plank_h
		var index: int = 0

		while y < y1:
			var shade: float = 0.9 + 0.1 * sin(seed_value + index * 2.7)
			draw_rect(Rect2(x_from, y, x_to - x_from, plank_h), Color(base.r * shade, base.g * shade, base.b * shade))
			draw_line(Vector2(x_from, y), Vector2(x_to, y), Color(0.0, 0.0, 0.0, 0.35), 4.0)

			for k in 3:
				var gy: float = y + 20.0 + k * 26.0
				var gx: float = x_from + fmod(absf(sin(seed_value + index * 5.1 + k * 1.9)) * 997.0, maxf(x_to - x_from - 200.0, 1.0))
				draw_line(Vector2(gx, gy), Vector2(gx + 140.0, gy), Color(0.0, 0.0, 0.0, 0.10), 3.0)

			y += plank_h
			index += 1


	func _arrow(side: int) -> void:
		var tip_x: float = 60.0 if side < 0 else 1220.0
		var back_x: float = 125.0 if side < 0 else 1155.0
		var points := PackedVector2Array([Vector2(tip_x, 390.0), Vector2(back_x, 345.0), Vector2(back_x, 435.0)])
		draw_colored_polygon(points, YELLOW)


	func _shutter(side: int) -> void:
		var factor: float = 1.0 - openness

		if factor < 0.04:
			return

		var edge: float = CENTER.x + side * HOLE_R
		var start_angle: float = -PI / 2.0 if side > 0 else PI / 2.0
		var points := PackedVector2Array()

		for i in 25:
			var angle: float = start_angle + PI * float(i) / 24.0
			var p: Vector2 = CENTER + Vector2(cos(angle), sin(angle)) * HOLE_R
			p.x = edge + (p.x - edge) * factor
			points.append(p)

		draw_colored_polygon(points, WOOD)
		points.append(points[0])
		draw_polyline(points, Color(0.35, 0.20, 0.08), 5.0)


func setup(p_level: int, p_rounds: int, _p_avatar_id: String) -> void:
	level = p_level
	rounds_count = p_rounds


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	clip_contents = true

	_arena = Arena.new()
	_arena.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_arena.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_arena)

	_stage = Control.new()
	_stage.size = Vector2(W, H)
	_stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_stage)
	resized.connect(_fit_stage)
	_fit_stage()

	_build_hud()
	_rounds = Logic.make_rounds(level, rounds_count)
	_run_round()


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


func _outline(label: Label, outline_size: int = 10) -> void:
	label.add_theme_color_override("font_outline_color", OUTLINE)
	label.add_theme_constant_override("outline_size", outline_size)


# ---------- Interface ----------

func _build_hud() -> void:
	# Les deux zones.
	var no_label := Ui.label("PAS\nDEDANS", 66, YELLOW)
	no_label.position = Vector2(40.0, 300.0)
	no_label.size = Vector2(400.0, 170.0)
	no_label.pivot_offset = no_label.size / 2.0
	no_label.rotation = -0.06
	_outline(no_label)
	_stage.add_child(no_label)

	var yes_label := Ui.label("DEDANS", 72, YELLOW)
	yes_label.position = Vector2(850.0, 320.0)
	yes_label.size = Vector2(400.0, 110.0)
	yes_label.pivot_offset = yes_label.size / 2.0
	yes_label.rotation = 0.04
	_outline(yes_label)
	_stage.add_child(yes_label)

	var yes_star := StarView.new()
	yes_star.position = Vector2(985.0, 450.0)
	yes_star.size = Vector2(100.0, 100.0)
	yes_star.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage.add_child(yes_star)

	# La lettre à chercher.
	var panel := Panel.new()
	panel.position = Vector2(440.0, 14.0)
	panel.size = Vector2(400.0, 104.0)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel", Ui.flat(Color(0.20, 0.08, 0.04, 0.88), 30, 5, Color(1.0, 0.95, 0.8)))
	_stage.add_child(panel)

	var look_for := Ui.label("Cherche", 34, Ui.CREAM)
	look_for.position = Vector2(18.0, 24.0)
	look_for.size = Vector2(200.0, 56.0)
	panel.add_child(look_for)

	_target_label = Ui.label("", 84, GOLD)
	_target_label.position = Vector2(225.0, 4.0)
	_target_label.size = Vector2(160.0, 96.0)
	panel.add_child(_target_label)

	# Compteurs : manche, bonnes réponses, combo.
	_counter = Ui.label("", 28, Ui.CREAM, HORIZONTAL_ALIGNMENT_LEFT)
	_counter.position = Vector2(20.0, 76.0)
	_counter.size = Vector2(200.0, 40.0)
	_outline(_counter, 6)
	_stage.add_child(_counter)

	var score_star := StarView.new()
	score_star.position = Vector2(1090.0, 16.0)
	score_star.size = Vector2(48.0, 48.0)
	score_star.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage.add_child(score_star)

	_score_label = Ui.label("0", 44, Ui.CREAM, HORIZONTAL_ALIGNMENT_LEFT)
	_score_label.position = Vector2(1146.0, 10.0)
	_score_label.size = Vector2(100.0, 60.0)
	_outline(_score_label, 8)
	_stage.add_child(_score_label)

	_combo_label = Ui.label("", 32, GOLD, HORIZONTAL_ALIGNMENT_RIGHT)
	_combo_label.position = Vector2(950.0, 68.0)
	_combo_label.size = Vector2(296.0, 44.0)
	_outline(_combo_label, 8)
	_stage.add_child(_combo_label)

	# Au centre du disque.
	_question_mark = Ui.label("?", 130, Color(0.45, 0.25, 0.08))
	_question_mark.position = CENTER - Vector2(100.0, 80.0)
	_question_mark.size = Vector2(200.0, 160.0)
	_stage.add_child(_question_mark)

	_letters_box = HBoxContainer.new()
	_letters_box.alignment = BoxContainer.ALIGNMENT_CENTER
	_letters_box.add_theme_constant_override("separation", 4)
	_letters_box.position = CENTER - Vector2(165.0, 55.0)
	_letters_box.size = Vector2(330.0, 110.0)
	_letters_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_letters_box.modulate.a = 0.0
	_stage.add_child(_letters_box)

	_message = Ui.label("", 40, Color.WHITE)
	_message.position = Vector2(0.0, 640.0)
	_message.size = Vector2(W, 60.0)
	_outline(_message, 10)
	_stage.add_child(_message)


## Remplit le disque avec la suite. Si `highlight` est dans la suite, cette lettre brille et les autres s'estompent.
func _build_letters(sequence: Array, highlight: String) -> void:
	for child in _letters_box.get_children():
		_letters_box.remove_child(child)
		child.queue_free()

	var font_size: int = 66 if sequence.size() >= 5 else 80
	var dim: bool = highlight != "" and sequence.has(highlight)

	for letter in sequence:
		var text: String = String(letter)
		var label := Ui.label(text, font_size, Color.WHITE)
		label.custom_minimum_size = Vector2(58.0, 100.0)
		_outline(label, 8)

		if dim:
			if text == highlight:
				label.add_theme_color_override("font_color", GOLD)
			else:
				label.modulate = Color(1.0, 1.0, 1.0, 0.45)

		_letters_box.add_child(label)


# ---------- Déroulement ----------

func _move_disc(open: bool, duration: float) -> void:
	var tween := create_tween().set_parallel(true)
	tween.tween_property(_arena, "openness", 1.0 if open else 0.0, duration).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(_question_mark, "modulate:a", 0.0 if open else 1.0, duration)
	await tween.finished


func _say_target() -> void:
	var target: String = _current["target"]
	await Speech.speak("Cherche la lettre %s" % target.to_lower())


func _run_round() -> void:
	_current = _rounds[_round_index]
	_accepting = false
	_counter.text = "%d / %d" % [_round_index + 1, _rounds.size()]
	_target_label.text = String(_current["target"])
	_message.text = "Regarde bien !"
	_letters_box.modulate.a = 0.0
	_build_letters(_current["sequence"], "")

	await _say_target()
	if not _alive:
		return

	await get_tree().create_timer(0.3).timeout
	if not _alive:
		return

	await _move_disc(true, 0.45)
	if not _alive:
		return

	_letters_box.modulate.a = 1.0

	await get_tree().create_timer(Logic.exposure_for(level)).timeout
	if not _alive:
		return

	_letters_box.modulate.a = 0.0

	await _move_disc(false, 0.4)
	if not _alive:
		return

	_message.text = "Dedans ou pas dedans ?"
	_accepting = true


## Touche sur la moitié gauche (PAS DEDANS) ou droite (DEDANS) de l'écran.
## _input (et non _unhandled_input) : comme dans le Pont du volcan, les Control plein écran absorbent les clics.
func _input(event: InputEvent) -> void:
	if not _accepting:
		return

	if not (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT):
		return

	var local_event := _stage.make_input_local(event) as InputEventMouseButton
	var pos: Vector2 = local_event.position

	# Le bouton « Quitter » de game_host est en haut à gauche : on ne répond pas à ce toucher.
	if pos.x < 230.0 and pos.y < 70.0:
		return

	_answer(pos.x >= W / 2.0)


func _answer(says_inside: bool) -> void:
	_accepting = false

	var is_inside: bool = _current["inside"]
	var target: String = _current["target"]
	var good: bool = says_inside == is_inside

	_flash(says_inside, good)

	if good:
		_correct += 1
		_combo += 1
		_best_combo = maxi(_best_combo, _combo)
		_message.text = "Bien !"
		_sparks()
	else:
		_errors += 1
		_combo = 0

		if is_inside:
			_message.text = "Oups ! Il y avait un %s." % target
		else:
			_message.text = "Oups ! Pas de %s ici." % target

		_shake()

	_score_label.text = str(_correct)
	_combo_label.text = "Combo x%d" % _combo if _combo >= 2 else ""

	# On rouvre le disque pour montrer la réponse, plus longtemps après une erreur.
	_build_letters(_current["sequence"], target)
	await _move_disc(true, 0.35)
	if not _alive:
		return

	_letters_box.modulate.a = 1.0

	await get_tree().create_timer(1.0 if good else 1.8).timeout
	if not _alive:
		return

	_letters_box.modulate.a = 0.0

	await _move_disc(false, 0.3)
	if not _alive:
		return

	_round_index += 1

	if _round_index >= _rounds.size():
		_finish_game()
	else:
		_run_round()


# ---------- Effets ----------

func _flash(says_inside: bool, good: bool) -> void:
	_arena.flash_side = 1 if says_inside else -1
	_arena.flash_color = Color(1.0, 0.95, 0.5) if good else Color(0.0, 0.0, 0.0)
	_arena.flash_alpha = 0.5

	var tween := create_tween()
	tween.tween_property(_arena, "flash_alpha", 0.0, 0.55)


## Gerbe d'étincelles dorées au-dessus du disque (particules CPU : légères).
func _sparks() -> void:
	var particles := CPUParticles2D.new()
	particles.position = CENTER
	particles.amount = 36
	particles.lifetime = 0.9
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.direction = Vector2(0.0, -1.0)
	particles.spread = 180.0
	particles.initial_velocity_min = 250.0
	particles.initial_velocity_max = 520.0
	particles.gravity = Vector2(0.0, 700.0)
	particles.scale_amount_min = 6.0
	particles.scale_amount_max = 12.0
	particles.color = GOLD
	_stage.add_child(particles)
	particles.emitting = true

	get_tree().create_timer(1.6).timeout.connect(particles.queue_free)


func _shake() -> void:
	var stage_tween := create_tween()
	var arena_tween := create_tween()

	for i in 4:
		var dx: float = 14.0 if i % 2 == 0 else -14.0
		stage_tween.tween_property(_stage, "position:x", _stage_base.x + dx, 0.04)
		arena_tween.tween_property(_arena, "position:x", dx, 0.04)

	stage_tween.tween_property(_stage, "position:x", _stage_base.x, 0.04)
	arena_tween.tween_property(_arena, "position:x", 0.0, 0.04)


func _finish_game() -> void:
	_accepting = false
	finished.emit({
		"stars": Logic.stars_from_errors(_errors),
		"accuracy": Logic.accuracy_from(_correct, _errors),
	})
