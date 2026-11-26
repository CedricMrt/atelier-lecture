extends Control
## « Chasse aux fantômes » en 3D : écoute la consigne, puis touche le fantôme
## qui correspond. Le vaisseau de l'avatar arrive et capture le fantôme choisi
## avec un rayon magique (zap_good en cas de réussite, zap_error sinon).
## Les fantômes viennent de Ultimate Monsters (Ghost.gltf) et le véhicule
## de Ultimate Space Kit (Spaceship_RaeTheRedPanda.gltf).
## La logique (niveaux, pièges, étoiles) est dans logic/ghost_logic.gd.

signal finished(result: Dictionary)

const Ui = preload("res://scripts/ui/ui.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const Logic = preload("res://scripts/logic/ghost_logic.gd")

const W := 1280.0
const H := 720.0
const HUD_H := 120.0

const GHOST_MODEL := "res://assets/Ultimate Monsters/Flying/glTF/Ghost.gltf"
const SHIP_MODEL := "res://assets/Ultimate Space Kit - March 2023/Vehicles/GLTF/Spaceship_RaeTheRedPanda.gltf"

const SFX_GOOD := "res://assets/voix/zap_good.mp3"
const SFX_ERROR := "res://assets/voix/zap_error.mp3"

const VOICE_INTRO := "Écoute la consigne, puis touche le bon fantôme."
const VOICE_RETRY := "Écoute encore, puis essaie une autre réponse."

const GHOST_HEIGHT := 1.4
const SHIP_HEIGHT := 1.1
const GHOST_GAP := 3.2
const CAM_OFFSET := Vector3(0.0, 7.0, 8.0)
const CAM_PITCH := -42.0

const GHOST_TINTS := [
	Color(0.55, 0.75, 1.0),
	Color(1.0, 0.75, 0.45),
	Color(0.65, 1.0, 0.65),
	Color(1.0, 0.6, 0.8),
]

const GOLD := Color(1.0, 0.85, 0.3)
const OUTLINE := Color(0.12, 0.05, 0.18)

var level: int = 1
var rounds_count: int = 8
var avatar_id: String = "mage"

var _rounds: Array = []
var _round_index := 0
var _correct := 0
var _errors := 0
var _combo := 0
var _locked := true
var _alive := true

var _stage: Control
var _hud_band: ColorRect
var _container: SubViewportContainer
var _viewport: SubViewport
var _world: Node3D
var _round_root: Node3D
var _camera: Camera3D
var _ship: Node3D
var _ghosts: Array = []
var _labels: Array = []
var _sfx_player: AudioStreamPlayer

var _counter: Label
var _message: Label
var _score_label: Label
var _combo_label: Label


class SpeakerIcon extends Control:
	func _draw() -> void:
		var c: Vector2 = size / 2.0
		var body := PackedVector2Array([
			c + Vector2(-26.0, -10.0),
			c + Vector2(-14.0, -10.0),
			c + Vector2(4.0, -24.0),
			c + Vector2(4.0, 24.0),
			c + Vector2(-14.0, 10.0),
			c + Vector2(-26.0, 10.0),
		])
		draw_colored_polygon(body, Color.WHITE)
		draw_arc(c + Vector2(4.0, 0.0), 14.0, -0.9, 0.9, 12, Color.WHITE, 4.0)
		draw_arc(c + Vector2(4.0, 0.0), 26.0, -0.9, 0.9, 16, Color.WHITE, 4.0)


func setup(p_level: int, p_rounds: int, p_avatar_id: String) -> void:
	level = p_level
	rounds_count = p_rounds
	avatar_id = p_avatar_id


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	clip_contents = true

	_container = SubViewportContainer.new()
	_container.stretch = true
	_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_container)

	_viewport = SubViewport.new()
	_viewport.msaa_3d = Viewport.MSAA_2X
	_container.add_child(_viewport)

	_world = Node3D.new()
	_viewport.add_child(_world)

	_hud_band = ColorRect.new()
	_hud_band.color = Color.html("1b1030")
	_hud_band.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_hud_band)

	_stage = Control.new()
	_stage.size = Vector2(W, H)
	add_child(_stage)
	resized.connect(_fit_stage)
	_fit_stage()

	_sfx_player = AudioStreamPlayer.new()
	add_child(_sfx_player)

	_rounds = Logic.make_rounds(level, rounds_count)

	_build_world()
	_build_hud()
	_build_ship()
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

	var band_height := _stage.position.y + HUD_H * factor
	_hud_band.position = Vector2.ZERO
	_hud_band.size = Vector2(size.x, band_height)
	_container.offset_top = band_height


func _process(_delta: float) -> void:
	if _camera != null and _ship != null:
		var target := _ship.position + CAM_OFFSET
		_camera.position = _camera.position.lerp(target, clampf(_delta * 4.0, 0.0, 1.0))

	for i in _ghosts.size():
		var ghost: Node3D = _ghosts[i]

		if is_instance_valid(ghost):
			var phase: float = ghost.get_meta("phase", 0.0)
			ghost.position.y = 1.2 + sin(Time.get_ticks_msec() / 1000.0 * 2.0 + phase) * 0.12
			_update_label(i, ghost)


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
	var extent := maxf(box.size.x, box.size.y)

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
	mat.albedo_color = Color(color, 0.55)
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
	particles.lifetime = 0.7
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.direction = Vector3.UP
	particles.spread = 70.0
	particles.initial_velocity_min = 2.0
	particles.initial_velocity_max = 4.5
	particles.gravity = Vector3(0.0, -9.0, 0.0)
	particles.position = pos
	_world.add_child(particles)
	particles.emitting = true

	get_tree().create_timer(1.5).timeout.connect(particles.queue_free)


func _build_world() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color.html("120a22")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.8, 0.8, 1.0)
	env.ambient_light_energy = 0.9

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	_world.add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55.0, -25.0, 0.0)
	sun.light_color = Color(0.9, 0.9, 1.0)
	sun.light_energy = 1.1
	_world.add_child(sun)

	_camera = Camera3D.new()
	_camera.fov = 55.0
	_camera.rotation_degrees = Vector3(CAM_PITCH, 0.0, 0.0)
	_camera.position = CAM_OFFSET
	_world.add_child(_camera)
	_camera.current = true

	_build_ground()


func _build_ground() -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(60.0, 60.0)

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.16, 0.10, 0.28)

	var ground := MeshInstance3D.new()
	ground.mesh = plane
	ground.material_override = mat
	ground.position = Vector3(0.0, -0.05, -10.0)
	_world.add_child(ground)


func _build_hud() -> void:
	_counter = Ui.label("", 24, Color.html("e8dcff"), HORIZONTAL_ALIGNMENT_LEFT)
	_counter.position = Vector2(190, 26)
	_counter.size = Vector2(240, 36)
	_stage.add_child(_counter)

	var score_star := StarView.new()
	score_star.position = Vector2(1090.0, 16.0)
	score_star.size = Vector2(48.0, 48.0)
	score_star.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage.add_child(score_star)

	_score_label = Ui.label("0", 44, Ui.CREAM, HORIZONTAL_ALIGNMENT_LEFT)
	_score_label.position = Vector2(1146.0, 10.0)
	_score_label.size = Vector2(100.0, 60.0)
	_score_label.add_theme_color_override("font_outline_color", OUTLINE)
	_score_label.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_score_label)

	_combo_label = Ui.label("", 32, GOLD, HORIZONTAL_ALIGNMENT_RIGHT)
	_combo_label.position = Vector2(950.0, 68.0)
	_combo_label.size = Vector2(296.0, 44.0)
	_combo_label.add_theme_color_override("font_outline_color", OUTLINE)
	_combo_label.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_combo_label)

	_message = Ui.label("", 34, Color.WHITE)
	_message.position = Vector2(0, 662)
	_message.size = Vector2(W, 50)
	_message.add_theme_color_override("font_outline_color", OUTLINE)
	_message.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_message)


func _update_score() -> void:
	_score_label.text = str(_correct)

	if _combo >= 2:
		_combo_label.text = "Combo x%d" % _combo
	else:
		_combo_label.text = ""


func _build_ship() -> void:
	_ship = Node3D.new()
	_world.add_child(_ship)

	var model := _load_model(SHIP_MODEL, SHIP_HEIGHT)

	if model == null:
		var capsule := CapsuleMesh.new()
		capsule.radius = 0.35
		capsule.height = SHIP_HEIGHT

		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.9, 0.85, 0.4)

		var body := MeshInstance3D.new()
		body.mesh = capsule
		body.material_override = mat
		body.position.y = SHIP_HEIGHT / 2.0

		model = Node3D.new()
		model.add_child(body)

	_ship.add_child(model)
	_ship.position = Vector3(0.0, 1.0, 6.0)


func _start_round() -> void:
	for ghost in _ghosts:
		if is_instance_valid(ghost):
			ghost.queue_free()

	for label in _labels:
		if is_instance_valid(label):
			label.queue_free()

	if is_instance_valid(_round_root):
		_round_root.queue_free()

	_ghosts.clear()
	_labels.clear()
	_round_root = Node3D.new()
	_world.add_child(_round_root)

	var item: Dictionary = _rounds[_round_index]
	_counter.text = "Manche %d sur %d" % [_round_index + 1, _rounds.size()]
	_message.text = "Écoute…"

	_build_ghosts(item)
	_locked = true

	await get_tree().create_timer(0.6).timeout

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
	var first_x := -(options.size() - 1) * GHOST_GAP / 2.0

	for i in options.size():
		var ghost := _load_model(GHOST_MODEL, GHOST_HEIGHT)

		if ghost == null:
			var sphere := SphereMesh.new()
			sphere.radius = 0.6

			var mat := StandardMaterial3D.new()
			mat.albedo_color = Color(0.8, 0.8, 1.0, 0.8)
			mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

			var body := MeshInstance3D.new()
			body.mesh = sphere
			body.material_override = mat

			ghost = Node3D.new()
			ghost.add_child(body)

		_tint(ghost, GHOST_TINTS[i % GHOST_TINTS.size()])

		var holder := Node3D.new()
		holder.add_child(ghost)
		holder.position = Vector3(first_x + i * GHOST_GAP, 1.2, -2.0 - (i % 2) * 1.2)
		holder.set_meta("index", i)
		holder.set_meta("phase", float(i) * 0.7)
		_round_root.add_child(holder)
		_ghosts.append(holder)

		var label := Ui.label(str(options[i]), 30, Color.WHITE)
		label.size = Vector2(220.0, 44.0)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.add_theme_color_override("font_outline_color", OUTLINE)
		label.add_theme_constant_override("outline_size", 8)
		_stage.add_child(label)
		_labels.append(label)


func _update_label(index: int, ghost: Node3D) -> void:
	if index >= _labels.size() or not is_instance_valid(_labels[index]):
		return

	var label: Label = _labels[index]
	var screen: Vector2 = _camera.unproject_position(ghost.global_position + Vector3(0.0, 1.0, 0.0))
	label.position = screen - label.size / 2.0


func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		_handle_tap(event.position)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_tap(event.position)


func _handle_tap(screen_position: Vector2) -> void:
	if _locked or _round_index >= _rounds.size():
		return

	var best := -1
	var best_distance := 999999.0

	for i in _ghosts.size():
		var ghost: Node3D = _ghosts[i]

		if not is_instance_valid(ghost):
			continue

		var screen: Vector2 = _camera.unproject_position(ghost.global_position)
		var distance := screen.distance_to(screen_position)

		if distance < 130.0 and distance < best_distance:
			best = i
			best_distance = distance

	if best >= 0:
		_on_ghost_pressed(best)


func _on_ghost_pressed(index: int) -> void:
	if _locked or index < 0 or index >= _rounds[_round_index]["options"].size():
		return

	_locked = true
	var item: Dictionary = _rounds[_round_index]
	var correct: bool = index == int(item["correct_index"])

	if correct:
		_correct += 1
		_combo += 1
	else:
		_errors += 1
		_combo = 0

	_update_score()
	await _fly_and_zap(index, correct)

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


func _fly_and_zap(index: int, correct: bool) -> void:
	var target: Vector3 = _ghosts[index].position
	var go := create_tween()
	go.tween_property(_ship, "position", target + Vector3(0.0, 0.6, 2.0), 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

	await go.finished

	if not _alive:
		return

	_play_sfx(SFX_GOOD if correct else SFX_ERROR)
	_sparks(target, 30, GOLD if correct else Color(1.0, 0.3, 0.3))

	var back := create_tween()
	back.tween_property(_ship, "position", Vector3(0.0, 1.0, 6.0), 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	await back.finished

	if not _alive:
		return

	if not correct:
		await Speech.speak(VOICE_RETRY)
