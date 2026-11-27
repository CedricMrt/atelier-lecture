extends Control
## « Chasse aux fantômes » : décor spatial, sol lunaire, véhicule à gauche, fantômes à droite.
## L'enfant écoute la consigne, puis touche le bon fantôme : le véhicule lance un éclair.
## Fantômes : Ultimate Monsters (Ghost.gltf). Véhicule : Ultimate Space Kit (Rover_1.gltf).
## L'espace, les planètes, le sol lunaire et l'éclair sont dessinés par code.
## La logique (niveaux, pièges, étoiles) est dans logic/ghost_logic.gd.

signal finished(result: Dictionary)

const Ui = preload("res://scripts/ui/ui.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const Logic = preload("res://scripts/logic/ghost_logic.gd")

const W := 1280.0
const H := 720.0

const GHOST_MODEL := "res://assets/Ultimate Monsters/Flying/glTF/Ghost.gltf"
const CAR_MODEL := "res://assets/Ultimate Space Kit - March 2023/Vehicles/GLTF/Rover_1.gltf"

const SFX_GOOD := "res://assets/voix/zap_good.mp3"
const SFX_ERROR := "res://assets/voix/zap_error.mp3"

const VOICE_INTRO := "Écoute bien, puis touche le bon fantôme."
const VOICE_RETRY := "Écoute encore, puis essaie une autre réponse."

const GHOST_SIZE := 3.0
const CAR_SIZE := 3.0
## Si la voiture regarde du mauvais côté, change cette valeur (PI / 2.0, -PI / 2.0, 0.0 ou PI).
const CAR_YAW := PI / 2.0
const CAR_POS := Vector3(-5.2, -1.9, 0.0)
const CAM_POS := Vector3(0.0, 1.2, 12.0)
## Pieds des fantômes : deux colonnes, une rangée haute et une rangée basse.
const GHOST_SPOTS := [
	Vector3(0.0, 0.5, 0.0),
	Vector3(2.0, -1.6, 0.0),
	Vector3(3.8, 0.5, 0.0),
	Vector3(5.5, -1.6, 0.0),
]

const TEAL := Color(0.45, 1.0, 0.9, 0.5)
const GOLD := Color(1.0, 0.85, 0.3)
const OUTLINE := Color(0.02, 0.1, 0.14)

var level: int = 1
var rounds_count: int = 8
var avatar_id: String = "mage"

var _rounds: Array = []
var _round_index := 0
var _correct := 0
var _errors := 0
var _combo := 0
var _points := 0
var _locked := true
var _alive := true
var _time := 0.0

var _backdrop: Control
var _container: SubViewportContainer
var _viewport: SubViewport
var _world: Node3D
var _round_root: Node3D
var _camera: Camera3D
var _car: Node3D
var _ghosts: Array = []
var _panels: Array = []
var _sfx_player: AudioStreamPlayer

var _stage: Control
var _fx: Control
var _bar_label: Label
var _counter: Label
var _message: Label
var _score_label: Label
var _combo_label: Label


## Espace, nébuleuses, étoiles, planètes et sol lunaire : tout est dessiné par code.
class Backdrop extends Control:
	var _stars: Array = []
	var _craters: Array = []
	var _rocks: Array = []

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		var rng := RandomNumberGenerator.new()
		rng.seed = 777

		for i in 110:
			_stars.append(Vector3(rng.randf(), rng.randf() * 0.8, rng.randf_range(0.8, 2.4)))

		for i in 9:
			_craters.append(Vector3(rng.randf(), rng.randf(), rng.randf_range(0.6, 1.4)))

		for i in 14:
			_rocks.append(Vector3(rng.randf(), rng.randf(), rng.randf_range(0.5, 1.2)))

	func _ellipse(center: Vector2, radius: float, squash: float, color: Color) -> void:
		draw_set_transform(center, 0.0, Vector2(1.0, squash))
		draw_circle(Vector2.ZERO, radius, color)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	func _draw() -> void:
		var w := size.x
		var h := size.y

		if w <= 0.0 or h <= 0.0:
			return

		var top := Color(0.01, 0.01, 0.07)
		var bottom := Color(0.14, 0.07, 0.32)
		var steps := 24
		var sky_h := h * 0.84

		for i in steps:
			var t := float(i) / float(steps - 1)
			draw_rect(Rect2(0.0, sky_h * float(i) / steps, w, sky_h / steps + 1.0), top.lerp(bottom, pow(t, 1.6)))

		for k in 4:
			draw_circle(Vector2(w * 0.68, h * 0.36), h * (0.34 - k * 0.07), Color(0.65, 0.25, 0.85, 0.05))
			draw_circle(Vector2(w * 0.3, h * 0.5), h * (0.3 - k * 0.06), Color(0.1, 0.7, 0.85, 0.04))

		for star in _stars:
			draw_circle(Vector2(star.x * w, star.y * h), star.z, Color(1.0, 1.0, 1.0, 0.8))

		var earth := Vector2(w * 0.12, h * 0.22)
		var er := h * 0.1

		for k in 3:
			draw_circle(earth, er * (1.5 - k * 0.2), Color(0.4, 0.7, 1.0, 0.06))

		draw_circle(earth, er, Color(0.12, 0.35, 0.8))
		_ellipse(earth + Vector2(-er * 0.25, -er * 0.2), er * 0.4, 0.7, Color(0.25, 0.65, 0.35))
		_ellipse(earth + Vector2(er * 0.35, er * 0.3), er * 0.28, 0.8, Color(0.25, 0.65, 0.35))
		_ellipse(earth + Vector2(er * 0.1, -er * 0.55), er * 0.3, 0.3, Color(1.0, 1.0, 1.0, 0.55))

		var planet := Vector2(w * 0.9, h * 0.45)
		var pr := h * 0.07
		draw_circle(planet, pr, Color(0.85, 0.5, 0.3))
		_ellipse(planet + Vector2(-pr * 0.2, -pr * 0.3), pr * 0.5, 0.3, Color(0.95, 0.65, 0.4))
		draw_set_transform(planet, -0.35, Vector2(1.0, 0.28))
		draw_arc(Vector2.ZERO, pr * 1.8, 0.0, TAU, 48, Color(0.95, 0.8, 0.6, 0.8), 5.0)
		draw_arc(Vector2.ZERO, pr * 1.55, 0.0, TAU, 48, Color(0.95, 0.8, 0.6, 0.5), 3.0)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

		draw_rect(Rect2(0.0, h * 0.74, w, h * 0.07), Color(0.6, 0.35, 0.9, 0.1))

		var ground := PackedVector2Array()

		for i in 21:
			var x := w * float(i) / 20.0
			ground.append(Vector2(x, h * 0.8 + sin(float(i) * 0.7) * h * 0.012))

		ground.append(Vector2(w, h))
		ground.append(Vector2(0.0, h))
		draw_colored_polygon(ground, Color(0.58, 0.58, 0.66))
		draw_rect(Rect2(0.0, h * 0.9, w, h * 0.1), Color(0.42, 0.42, 0.52))

		for crater in _craters:
			var center := Vector2(crater.x * w, h * (0.84 + crater.y * 0.14))
			var radius: float = h * 0.03 * crater.z * (0.8 + crater.y)
			_ellipse(center, radius, 0.3, Color(0.7, 0.7, 0.78))
			_ellipse(center + Vector2(0.0, radius * 0.05), radius * 0.82, 0.3, Color(0.36, 0.36, 0.45))

		for rock in _rocks:
			var base := Vector2(rock.x * w, h * (0.83 + rock.y * 0.14))
			_ellipse(base, h * 0.014 * rock.z, 0.7, Color(0.3, 0.3, 0.38))


## Éclair dessiné par code, du véhicule jusqu'au fantôme touché.
class Fx extends Control:
	var _from := Vector2.ZERO
	var _to := Vector2.ZERO
	var _color := Color.WHITE
	var _remaining := 0.0
	var _rng := RandomNumberGenerator.new()

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		_rng.randomize()

	func fire(from: Vector2, to: Vector2, color: Color, duration: float) -> void:
		_from = from
		_to = to
		_color = color
		_remaining = duration
		queue_redraw()

	func _process(delta: float) -> void:
		if _remaining > 0.0:
			_remaining -= delta
			queue_redraw()

	func _jagged(offset: float) -> PackedVector2Array:
		var points := PackedVector2Array()
		var segments := 14
		var direction := _to - _from
		var normal := direction.orthogonal().normalized()

		for i in segments + 1:
			var t := float(i) / float(segments)
			var p := _from + direction * t

			if i > 0 and i < segments:
				p += normal * _rng.randf_range(-offset, offset)

			points.append(p)

		return points

	func _draw() -> void:
		if _remaining <= 0.0:
			return

		var main := _jagged(30.0)
		draw_polyline(main, Color(_color, 0.3), 20.0, true)
		draw_polyline(main, _color, 9.0, true)
		draw_polyline(main, Color.WHITE, 3.5, true)
		var branch := _jagged(44.0)
		draw_polyline(branch, Color(_color, 0.55), 4.0, true)


class SpeakerIcon extends Control:
	func _draw() -> void:
		var c: Vector2 = size / 2.0
		var body := PackedVector2Array([
			c + Vector2(-20.0, -8.0),
			c + Vector2(-10.0, -8.0),
			c + Vector2(4.0, -20.0),
			c + Vector2(4.0, 20.0),
			c + Vector2(-10.0, 8.0),
			c + Vector2(-20.0, 8.0),
		])
		draw_colored_polygon(body, Color.WHITE)
		draw_arc(c + Vector2(4.0, 0.0), 12.0, -0.9, 0.9, 12, Color.WHITE, 4.0)
		draw_arc(c + Vector2(4.0, 0.0), 22.0, -0.9, 0.9, 16, Color.WHITE, 4.0)


func setup(p_level: int, p_rounds: int, p_avatar_id: String) -> void:
	level = p_level
	rounds_count = p_rounds
	avatar_id = p_avatar_id


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	clip_contents = true

	_backdrop = Backdrop.new()
	_backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_backdrop)

	_container = SubViewportContainer.new()
	_container.stretch = true
	_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_container)

	_viewport = SubViewport.new()
	_viewport.msaa_3d = Viewport.MSAA_2X
	_viewport.transparent_bg = true
	_container.add_child(_viewport)

	_world = Node3D.new()
	_viewport.add_child(_world)

	_stage = Control.new()
	_stage.size = Vector2(W, H)
	_stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_stage)
	resized.connect(_fit_stage)
	_fit_stage()

	_fx = Fx.new()
	_fx.size = Vector2(W, H)
	_stage.add_child(_fx)

	_sfx_player = AudioStreamPlayer.new()
	add_child(_sfx_player)

	_rounds = Logic.make_rounds(level, rounds_count)

	_build_world()
	_build_hud()
	_build_car()
	_start_round()


func _exit_tree() -> void:
	_alive = false
	Speech.cancel()


func _fit_stage() -> void:
	var factor := minf(size.x / W, size.y / H)

	if factor <= 0.0:
		return

	_stage.scale = Vector2(factor, factor)
	_stage.position = (size - Vector2(W, H) * factor) / 2.0


## Coordonnées écran -> coordonnées de la scène 2D (1280 x 720).
func _to_stage(point: Vector2) -> Vector2:
	return (point - _stage.position) / maxf(_stage.scale.x, 0.001)


## Centre du corps du fantôme : cible du toucher et de l'éclair.
func _center(holder: Node3D) -> Vector3:
	return holder.global_position + Vector3(0.0, GHOST_SIZE * 0.5, 0.3)


## Bas du corps : l'étiquette est posée là pour laisser voir le visage.
func _label_spot(holder: Node3D) -> Vector3:
	return holder.global_position + Vector3(0.0, GHOST_SIZE * 0.2, 0.3)


func _process(delta: float) -> void:
	_time += delta

	if _car != null:
		_car.position.y = CAR_POS.y + sin(_time * 3.0) * 0.03

	for i in _ghosts.size():
		var holder: Node3D = _ghosts[i]

		if not is_instance_valid(holder):
			continue

		var base: Vector3 = holder.get_meta("base", holder.position)
		var phase: float = holder.get_meta("phase", 0.0)
		holder.position = base + Vector3(cos(_time * 1.1 + phase) * 0.1, sin(_time * 1.8 + phase) * 0.18, 0.0)

		if i < _panels.size() and is_instance_valid(_panels[i]) and _camera != null:
			var panel: Control = _panels[i]
			panel.position = _to_stage(_camera.unproject_position(_label_spot(holder))) - panel.size / 2.0


func _load_model(path: String, target: float) -> Node3D:
	if not ResourceLoader.exists(path):
		push_warning("Modèle introuvable ou non importé : " + path)
		return null

	var res := load(path)

	if not (res is PackedScene):
		return null

	var inst: Node = res.instantiate()

	if not (inst is Node3D):
		inst.queue_free()
		return null

	var acc: Array = []
	_accumulate_aabb(inst, Transform3D.IDENTITY, acc)

	if acc.is_empty():
		inst.queue_free()
		return null

	var box: AABB = acc[0]
	var extent := maxf(box.size.x, maxf(box.size.y, box.size.z))

	if extent <= 0.0001:
		inst.queue_free()
		return null

	var s := target / extent
	var model := inst as Node3D
	model.scale = Vector3.ONE * s
	model.position = Vector3(
		-(box.position.x + box.size.x / 2.0) * s,
		-box.position.y * s,
		-(box.position.z + box.size.z / 2.0) * s,
	)

	var holder := Node3D.new()
	holder.add_child(model)
	return holder


func _accumulate_aabb(node: Node, xf: Transform3D, acc: Array) -> void:
	if node is MeshInstance3D and node.mesh != null:
		var box: AABB = xf * node.mesh.get_aabb()

		if acc.is_empty():
			acc.append(box)
		else:
			acc[0] = (acc[0] as AABB).merge(box)

	for child in node.get_children():
		if child is Node3D:
			_accumulate_aabb(child, xf * child.transform, acc)


func _tint(node: Node, color: Color) -> void:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_apply_overlay(node, mat)


func _apply_overlay(node: Node, overlay: Material) -> void:
	if node is MeshInstance3D:
		node.material_overlay = overlay

	for child in node.get_children():
		_apply_overlay(child, overlay)


func _play_sfx(path: String) -> void:
	if not ResourceLoader.exists(path):
		push_warning("Effet sonore introuvable ou non importé : " + path)
		return

	var sound := load(path) as AudioStream

	if sound == null or not is_instance_valid(_sfx_player):
		return

	_sfx_player.stream = sound
	_sfx_player.play()


func _sparks(pos: Vector3, count: int, color: Color) -> void:
	var mesh := SphereMesh.new()
	mesh.radius = 0.07
	mesh.height = 0.14

	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mesh.material = mat

	var particles := CPUParticles3D.new()
	particles.mesh = mesh
	particles.amount = count
	particles.lifetime = 0.8
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.direction = Vector3.UP
	particles.spread = 180.0
	particles.initial_velocity_min = 2.0
	particles.initial_velocity_max = 5.0
	particles.gravity = Vector3(0.0, -4.0, 0.0)
	particles.position = pos
	_world.add_child(particles)
	particles.emitting = true

	get_tree().create_timer(1.6).timeout.connect(particles.queue_free)


func _build_world() -> void:
	var env := Environment.new()
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.75, 0.95, 1.0)
	env.ambient_light_energy = 1.0

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	_world.add_child(world_env)

	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-15.0, -25.0, 0.0)
	light.light_color = Color(0.8, 1.0, 0.95)
	light.light_energy = 1.0
	_world.add_child(light)

	_camera = Camera3D.new()
	_camera.fov = 40.0
	_camera.position = CAM_POS
	_world.add_child(_camera)
	_camera.current = true


func _build_hud() -> void:
	var bar := Panel.new()
	bar.position = Vector2(W / 2.0 - 190.0, 16.0)
	bar.size = Vector2(380.0, 88.0)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_theme_stylebox_override("panel", Ui.flat(Color(0.03, 0.1, 0.14, 0.92), 44, 5, Color(0.3, 0.9, 0.85), false))
	_stage.add_child(bar)

	_bar_label = Ui.label("", 46, Color.WHITE)
	_bar_label.position = Vector2(0.0, 0.0)
	_bar_label.size = Vector2(380.0, 88.0)
	_bar_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_bar_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_child(_bar_label)

	var speaker := Ui.button("", 30, Ui.ORANGE)
	speaker.custom_minimum_size = Vector2(92.0, 72.0)
	speaker.size = Vector2(92.0, 72.0)
	speaker.position = Vector2(W / 2.0 + 206.0, 24.0)

	var icon := SpeakerIcon.new()
	icon.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	speaker.add_child(icon)

	speaker.pressed.connect(func() -> void:
		if _round_index < _rounds.size():
			Speech.speak(_rounds[_round_index]["spoken"])
	)
	_stage.add_child(speaker)

	_counter = Ui.label("", 22, Color.html("bff7ee"))
	_counter.position = Vector2(W / 2.0 - 150.0, 108.0)
	_counter.size = Vector2(300.0, 30.0)
	_counter.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_counter.add_theme_color_override("font_outline_color", OUTLINE)
	_counter.add_theme_constant_override("outline_size", 6)
	_stage.add_child(_counter)

	var score_star := StarView.new()
	score_star.filled = true
	score_star.position = Vector2(1090.0, 18.0)
	score_star.size = Vector2(48.0, 48.0)
	score_star.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage.add_child(score_star)

	_score_label = Ui.label("0", 44, Ui.CREAM, HORIZONTAL_ALIGNMENT_LEFT)
	_score_label.position = Vector2(1146.0, 10.0)
	_score_label.size = Vector2(110.0, 60.0)
	_score_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_score_label.add_theme_color_override("font_outline_color", OUTLINE)
	_score_label.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_score_label)

	_combo_label = Ui.label("", 30, GOLD, HORIZONTAL_ALIGNMENT_RIGHT)
	_combo_label.position = Vector2(950.0, 70.0)
	_combo_label.size = Vector2(296.0, 44.0)
	_combo_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_combo_label.add_theme_color_override("font_outline_color", OUTLINE)
	_combo_label.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_combo_label)

	_message = Ui.label("", 32, Color.WHITE)
	_message.position = Vector2(0.0, 664.0)
	_message.size = Vector2(W, 48.0)
	_message.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_message.add_theme_color_override("font_outline_color", OUTLINE)
	_message.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_message)


func _update_score() -> void:
	_score_label.text = str(_points)

	if _combo >= 2:
		_combo_label.text = "Combo x%d" % _combo
	else:
		_combo_label.text = ""


func _build_car() -> void:
	_car = Node3D.new()
	_car.position = CAR_POS
	_world.add_child(_car)

	var model := _load_model(CAR_MODEL, CAR_SIZE)

	if model == null:
		var box := BoxMesh.new()
		box.size = Vector3(2.6, 0.9, 1.3)

		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.9, 0.9, 0.95)

		var body := MeshInstance3D.new()
		body.mesh = box
		body.material_override = mat
		body.position.y = 0.6

		model = Node3D.new()
		model.add_child(body)
	else:
		model.rotation.y = CAR_YAW

	_car.add_child(model)


func _recoil() -> void:
	var tween := create_tween()
	tween.tween_property(_car, "position:x", CAR_POS.x - 0.25, 0.08)
	tween.tween_property(_car, "position:x", CAR_POS.x, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _start_round() -> void:
	for ghost in _ghosts:
		if is_instance_valid(ghost):
			ghost.queue_free()

	for panel in _panels:
		if is_instance_valid(panel):
			panel.queue_free()

	if is_instance_valid(_round_root):
		_round_root.queue_free()

	_ghosts.clear()
	_panels.clear()
	_round_root = Node3D.new()
	_world.add_child(_round_root)

	var item: Dictionary = _rounds[_round_index]
	_counter.text = "Manche %d sur %d" % [_round_index + 1, _rounds.size()]
	_message.text = "Écoute…"

	var shown: String = item["spoken"]

	if item["mode"] != "syllabe":
		shown = String(item["spoken"]).get_slice("le son ", 1).trim_suffix(".")

	_bar_label.text = shown
	_bar_label.add_theme_font_size_override("font_size", 46 if shown.length() <= 8 else 30)

	_build_ghosts(item)
	_locked = true

	await get_tree().create_timer(0.7).timeout

	if not _alive:
		return

	if _round_index == 0:
		await Speech.speak(VOICE_INTRO)

		if not _alive:
			return

	await Speech.speak(item["spoken"])

	if not _alive:
		return

	_locked = false
	_message.text = item["prompt"]


func _build_ghosts(item: Dictionary) -> void:
	var options: Array = item["options"]

	for i in options.size():
		var spot: Vector3 = GHOST_SPOTS[i % GHOST_SPOTS.size()]
		var model := _load_model(GHOST_MODEL, GHOST_SIZE)

		if model == null:
			var sphere := SphereMesh.new()
			sphere.radius = GHOST_SIZE * 0.4
			sphere.height = GHOST_SIZE * 0.8

			var mat := StandardMaterial3D.new()
			mat.albedo_color = Color(0.5, 1.0, 0.9, 0.8)
			mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

			var body := MeshInstance3D.new()
			body.mesh = sphere
			body.material_override = mat
			body.position.y = GHOST_SIZE * 0.4

			model = Node3D.new()
			model.add_child(body)

		_tint(model, TEAL)

		var holder := Node3D.new()
		holder.add_child(model)
		holder.position = spot
		holder.scale = Vector3.ZERO
		holder.set_meta("base", spot)
		holder.set_meta("phase", float(i) * 1.3)
		holder.set_meta("gone", false)
		_round_root.add_child(holder)
		_ghosts.append(holder)

		var appear := create_tween()
		appear.tween_interval(0.12 * i)
		appear.tween_property(holder, "scale", Vector3.ONE, 0.5).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

		var label_text := str(options[i])
		var panel := Panel.new()
		panel.size = Vector2(clampf(30.0 + label_text.length() * 19.0, 64.0, 150.0), 42.0)
		panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
		panel.modulate.a = 0.0
		panel.add_theme_stylebox_override("panel", Ui.flat(Color(0.07, 0.3, 0.38, 0.95), 12, 3, Color(0.85, 1.0, 0.97), false))

		var text := Ui.label(label_text, 28, Color.WHITE)
		text.size = panel.size
		text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		text.mouse_filter = Control.MOUSE_FILTER_IGNORE
		panel.add_child(text)
		_stage.add_child(panel)
		_panels.append(panel)

		var fade := panel.create_tween()
		fade.tween_interval(0.12 * i + 0.2)
		fade.tween_property(panel, "modulate:a", 1.0, 0.3)


func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		_handle_tap(event.position)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_tap(event.position)


func _handle_tap(screen_position: Vector2) -> void:
	if _locked or _round_index >= _rounds.size():
		return

	var best := -1
	var best_distance := size.y * 0.2

	for i in _ghosts.size():
		var holder: Node3D = _ghosts[i]

		if not is_instance_valid(holder) or bool(holder.get_meta("gone", false)):
			continue

		var distance := _camera.unproject_position(_center(holder)).distance_to(screen_position)

		if distance < best_distance:
			best = i
			best_distance = distance

	if best >= 0:
		_on_ghost_pressed(best)


func _remove_ghost(index: int) -> void:
	var holder: Node3D = _ghosts[index]
	holder.set_meta("gone", true)

	var tween := create_tween().set_parallel(true)
	tween.tween_property(holder, "scale", Vector3.ZERO, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)

	if index < _panels.size() and is_instance_valid(_panels[index]):
		tween.tween_property(_panels[index], "modulate:a", 0.0, 0.25)


func _popup(pos: Vector2) -> void:
	var label := Ui.label("+10", 64, GOLD)
	label.size = Vector2(200.0, 80.0)
	label.position = pos - Vector2(100.0, 40.0)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_color_override("font_outline_color", OUTLINE)
	label.add_theme_constant_override("outline_size", 10)
	_stage.add_child(label)

	var tween := label.create_tween().set_parallel(true)
	tween.tween_property(label, "position:y", label.position.y - 90.0, 0.9)
	tween.tween_property(label, "modulate:a", 0.0, 0.5).set_delay(0.4)
	tween.finished.connect(label.queue_free)

	for k in 3:
		var star := StarView.new()
		star.filled = true
		star.size = Vector2(40.0, 40.0)
		star.mouse_filter = Control.MOUSE_FILTER_IGNORE
		star.position = pos + Vector2((k - 1) * 62.0 - 20.0, 34.0 + (k % 2) * 18.0)
		_stage.add_child(star)

		var star_tween := star.create_tween().set_parallel(true)
		star_tween.tween_property(star, "position:y", star.position.y - 60.0, 0.9)
		star_tween.tween_property(star, "modulate:a", 0.0, 0.5).set_delay(0.4)
		star_tween.finished.connect(star.queue_free)


func _on_ghost_pressed(index: int) -> void:
	if _locked or index < 0 or index >= _ghosts.size():
		return

	_locked = true
	var item: Dictionary = _rounds[_round_index]
	var correct: bool = index == int(item["correct_index"])
	var holder: Node3D = _ghosts[index]
	var center := _center(holder)

	_message.text = ""
	_play_sfx(SFX_GOOD if correct else SFX_ERROR)
	_recoil()

	var origin := _to_stage(_camera.unproject_position(_car.global_position + Vector3(1.0, 1.7, 0.0)))
	var target := _to_stage(_camera.unproject_position(center))
	_fx.fire(origin, target, Color(0.55, 0.95, 1.0) if correct else Color(1.0, 0.35, 0.6), 0.5)

	await get_tree().create_timer(0.35).timeout

	if not _alive:
		return

	if correct:
		_correct += 1
		_combo += 1
		_points += 10
		_update_score()
		_sparks(center, 30, Color(0.8, 0.4, 1.0))
		_sparks(center, 20, GOLD)
		_popup(target)
		_remove_ghost(index)

		await get_tree().create_timer(1.0).timeout

		if not _alive:
			return

		_round_index += 1

		if _round_index >= _rounds.size():
			finished.emit({
				"stars": Logic.stars_from_errors(_errors),
				"accuracy": Logic.accuracy_from(_correct, _errors),
			})
		else:
			_start_round()
	else:
		_errors += 1
		_combo = 0
		_update_score()
		_sparks(center, 24, Color(1.0, 0.3, 0.4))
		_remove_ghost(index)

		await get_tree().create_timer(0.5).timeout

		if not _alive:
			return

		await Speech.speak(VOICE_RETRY)

		if not _alive:
			return

		_locked = false
		_message.text = item["prompt"]
