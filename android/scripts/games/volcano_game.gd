extends Control
## « Pont du volcan » en 3D : écoute le mot, puis touche la bonne dalle de chaque rangée
## pour que le personnage saute jusqu'au coffre, au-dessus de la lave.
## Décor : KayKit Medieval Hexagon (montagnes, rochers), Pirate Kit (coffre uniquement)
## et Stylized Nature Kit (dalles).
## Le personnage est celui choisi par le joueur (voir data/avatars.gd). Les personnages KayKit
## (rig « medium ») reçoivent les animations du pack KayKit_Character_Animations : attente, saut, joie.
## Si un modèle est introuvable, une forme simple le remplace (et un avertissement
## « Modèle introuvable ou non importé » s'affiche dans la Sortie de Godot).
## La logique (mots, pièges, étoiles) est dans logic/volcano_logic.gd.

signal finished(result: Dictionary)

const Ui = preload("res://scripts/ui/ui.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const Logic = preload("res://scripts/logic/volcano_logic.gd")
const Avatars = preload("res://scripts/data/avatars.gd")

# Interface 2D dessinée dans une scène de 1280 x 720, mise à l'échelle de l'écran.
const W := 1280.0
const H := 720.0
# Bandeau du haut (boutons, cases du mot) : la vue 3D commence juste en dessous.
const HUD_H := 120.0

const HEX_NATURE := "res://assets/KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/"
const PIRATE := "res://assets/Pirate Kit - Nov 2023/glTF/"
const NATURE := "res://assets/stylized_Nature_kit/glTF/"
const RIG_ANIMS := "res://assets/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/"
const RIG_ANIMATION_FILES := [
	RIG_ANIMS + "Rig_Medium_General.glb",
	RIG_ANIMS + "Rig_Medium_MovementBasic.glb",
	RIG_ANIMS + "Rig_Medium_Simulation.glb",
]
const HERO_MODEL := "res://assets/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb"
const CHEST_CLOSED := PIRATE + "Prop_Chest_Closed.gltf"
const CHEST_MODEL := PIRATE + "Prop_Chest_Gold.gltf"
const TILE_MODEL := NATURE + "RockPath_Square_Wide.gltf"
const CLIFFS := ["mountain_A.gltf", "mountain_B.gltf", "mountain_C.gltf"]
const ROCKS := ["rock_single_A.gltf", "rock_single_B.gltf", "rock_single_C.gltf", "rock_single_D.gltf", "rock_single_E.gltf"]

const SFX_JUMP := "res://assets/voix/jump.mp3"
const SFX_ROCK_BREAK := "res://assets/voix/erreur_volcan.mp3"
const VOICE_PRAISE := "Bravo ! Tu as trouvé !"
const VOICE_RETRY := "Écoute encore, puis essaie une autre réponse."
const VOICE_INTRO := "Écoute le mot, puis touche les bonnes lettres pour traverser le pont."
const VOICE_GO := "À toi de jouer !"

# Mots cherchés dans le nom des animations (le premier mot trouvé gagne).
const ANIM_IDLE := ["idle_a", "idle"]
const ANIM_JUMP := ["jump_full_short", "jump_full_long", "jump_start", "jump"]
const ANIM_CHEER := ["cheer", "wave"]

const ROW_GAP := 2.4
const TILE_SPACING := 2.2
const TILE_SIZE := 1.8
const TILE_TOP := 0.35
const START_Z := 2.6
const HERO_HEIGHT := 1.6
const HERO_YAW := PI
const HOP_TIME := 0.5
const CAM_OFFSET := Vector3(0.0, 9.0, 7.5)
const CAM_ZOOM := Vector3(0.0, 7.2, 5.5)
const CAM_PITCH := -47.0
const TAP_RADIUS := 1.35

const TINT_CORRECT := Color(0.25, 0.85, 0.45)
const TINT_WRONG := Color(0.95, 0.25, 0.25)
const GOLD := Color(1.0, 0.85, 0.3)
const OUTLINE := Color(0.17, 0.06, 0.04)

const LAVA_SHADER := """
shader_type spatial;
render_mode unshaded;
varying vec3 wp;
void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
float wave(vec2 p) {
	return sin(p.x * 1.3 + TIME * 0.6) + sin(p.y * 1.7 - TIME * 0.5) + sin((p.x + p.y) * 0.8 + TIME * 0.4);
}
void fragment() {
	vec2 p = wp.xz;
	float v = wave(p) + 0.6 * wave(p * 2.3 + 7.0);
	v = clamp(v / 5.0 + 0.5, 0.0, 1.0);
	vec3 dark = vec3(0.30, 0.04, 0.02);
	vec3 mid = vec3(0.80, 0.22, 0.03);
	vec3 hot = vec3(1.0, 0.62, 0.15);
	vec3 col = mix(dark, mid, smoothstep(0.25, 0.65, v));
	col = mix(col, hot, smoothstep(0.72, 0.95, v));
	ALBEDO = col;
}
"""

var level: int = 1
var rounds_count: int = 5
var avatar_id: String = "mage"

var _words: Array = []
var _round_index := 0
var _letters: Array = []
var _position := 0
var _errors_here := 0
var _total_letters := 0
var _total_errors := 0
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
var _hero: Node3D
var _hero_model: Node3D
var _hero_player: AnimationPlayer
var _hero_has_emotes := false
var _embers: CPUParticles3D
var _chest: Node3D
var _chest_pos := Vector3.ZERO
var _hopping := false
var _time := 0.0
var _plane_y := TILE_TOP
var _cam_base := Vector3.ZERO
var _cam_offset := CAM_OFFSET
var _stage_base := Vector2.ZERO
var _tiles: Array = []
var _slot_labels: Array = []
var _round_nodes: Array = []
var _finish_z := 0.0
var _finish_top := 0.3
var _sfx_player: AudioStreamPlayer

var _counter: Label
var _message: Label
var _clue: TextureRect
var _score_label: Label
var _combo_label: Label


## Icône de haut-parleur dessinée par code (pas de police ni d'image à charger).
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
	_hud_band.color = Color.html("2b0f0a")
	_hud_band.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_hud_band)

	var edge := ColorRect.new()
	edge.color = Color(0.55, 0.18, 0.06)
	edge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	edge.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	edge.offset_top = -5.0
	edge.offset_bottom = 0.0
	_hud_band.add_child(edge)

	_stage = Control.new()
	_stage.size = Vector2(W, H)
	_stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_stage)
	resized.connect(_fit_stage)
	_fit_stage()

	_sfx_player = AudioStreamPlayer.new()
	add_child(_sfx_player)

	_words = Logic.pick_words(level, rounds_count)

	_build_world()
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

	# Le bandeau du haut couvre toute la largeur ; la 3D est affichée en dessous.
	var band_height := _stage_base.y + HUD_H * factor
	_hud_band.position = Vector2.ZERO
	_hud_band.size = Vector2(size.x, band_height)
	_container.offset_top = band_height


func _process(delta: float) -> void:
	_time += delta

	if _camera != null and _hero != null:
		var target := _hero.position + _cam_offset
		_cam_base = _cam_base.lerp(target, clampf(delta * 4.0, 0.0, 1.0))
		# Léger balancement : la caméra reste vivante même quand l'enfant réfléchit.
		_camera.position = _cam_base + Vector3(sin(_time * 0.6) * 0.15, sin(_time * 0.9) * 0.08, 0.0)

	if _embers != null and _hero != null:
		_embers.position = Vector3(0.0, -0.4, _hero.position.z - 3.0)

	# Petit mouvement de respiration quand le personnage attend.
	if _hero_model != null and not _hopping:
		_hero_model.position.y = sin(_time * 3.0) * 0.03


# ---------- Chargement des modèles ----------

## Charge un modèle, le met à la taille voulue, pose ses pieds à y = 0 et le centre.
## Renvoie null si le fichier est absent. La hauteur finale est dans meta « height ».
func _load_model(path: String, target: float, by_height: bool) -> Node3D:
	if not ResourceLoader.exists(path):
		push_warning("Modèle introuvable ou non importé : " + path)
		return null

	var res := load(path)

	if not (res is PackedScene):
		push_warning("Ce n'est pas une scène 3D : " + path)
		return null

	var inst: Node = res.instantiate()

	if not (inst is Node3D):
		inst.queue_free()
		return null

	var acc: Array = []
	_accumulate_aabb(inst, Transform3D.IDENTITY, acc)

	if acc.is_empty():
		push_warning("Aucun maillage dans : " + path)
		inst.queue_free()
		return null

	var box: AABB = acc[0]
	var extent := box.size.y if by_height else maxf(box.size.x, box.size.z)

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
	holder.set_meta("height", box.size.y * s)
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


func _find_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node

	for child in node.get_children():
		var found := _find_player(child)

		if found != null:
			return found

	return null


## Copie les animations du pack KayKit_Character_Animations (Rig_Medium) dans le personnage.
## Les pistes d'animation visent « Rig_Medium/Skeleton3D » : ça ne marche que si le personnage
## a la même structure (c'est le cas des personnages KayKit Adventurers 2.0 et Skeletons).
func _load_rig_animations(root: Node3D) -> void:
	if root.find_child("Skeleton3D", true, false) == null:
		push_warning("Pas de squelette dans le personnage : animations KayKit ignorées.")
		return

	var target := _find_player(root)

	if target == null:
		target = AnimationPlayer.new()
		target.name = "RigAnimations"
		root.add_child(target)

	var library: AnimationLibrary

	if target.has_animation_library(&""):
		library = target.get_animation_library(&"")
	else:
		library = AnimationLibrary.new()
		target.add_animation_library(&"", library)

	for path in RIG_ANIMATION_FILES:
		if not ResourceLoader.exists(path):
			push_warning("Fichier d'animations introuvable ou non importé : " + path)
			continue

		var scene := load(path)

		if not (scene is PackedScene):
			continue

		var inst: Node = scene.instantiate()
		var source := _find_player(inst)

		if source != null:
			for anim_name in source.get_animation_list():
				if not library.has_animation(anim_name):
					library.add_animation(anim_name, source.get_animation(anim_name))

		inst.queue_free()


## Joue la première animation dont le nom contient l'un des mots (dans l'ordre des mots).
## `fit_time` : si > 0, l'animation est accélérée ou ralentie pour durer ce temps.
func _play(keywords: Array, loop: bool, fit_time: float = 0.0) -> void:
	if _hero_player == null:
		return

	for keyword in keywords:
		for anim_name in _hero_player.get_animation_list():
			if String(anim_name).to_lower().contains(keyword):
				var animation := _hero_player.get_animation(anim_name)
				animation.loop_mode = Animation.LOOP_LINEAR if loop else Animation.LOOP_NONE

				var speed := 1.0

				if fit_time > 0.0 and animation.length > 0.01:
					speed = animation.length / fit_time

				_hero_player.play(anim_name, 0.1, speed)
				return


func _has_anim(keywords: Array) -> bool:
	if _hero_player == null:
		return false

	for anim_name in _hero_player.get_animation_list():
		for keyword in keywords:
			if String(anim_name).to_lower().contains(keyword):
				return true

	return false


func _tile_visual(size_value: float) -> Node3D:
	var model := _load_model(TILE_MODEL, size_value, false)

	if model != null:
		return model

	var box := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(size_value, TILE_TOP, size_value)
	box.mesh = mesh
	box.position.y = TILE_TOP / 2.0

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.62, 0.55, 0.50)
	box.material_override = mat

	var holder := Node3D.new()
	holder.add_child(box)
	holder.set_meta("height", TILE_TOP)
	return holder


func _tint(node: Node, color: Variant) -> void:
	var overlay: Material = null

	if color is Color:
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(color, 0.55)
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		overlay = mat

	_apply_overlay(node, overlay)


func _apply_overlay(node: Node, overlay: Material) -> void:
	if node is MeshInstance3D:
		node.material_overlay = overlay

	for child in node.get_children():
		_apply_overlay(child, overlay)


# ---------- Effets ----------

## Effet sonore court, indépendant de la voix : saut, rocher qui casse, etc.
func _play_sfx(path: String) -> void:
	if not ResourceLoader.exists(path):
		push_warning("Effet sonore introuvable ou non importé : " + path)
		return

	var sound := load(path) as AudioStream

	if sound == null or not is_instance_valid(_sfx_player):
		return

	_sfx_player.stream = sound
	_sfx_player.play()


## Gerbe d'étincelles dorées (particules CPU : légères et compatibles avec toutes les tablettes).
func _sparks(pos: Vector3, count: int, size_value: float) -> void:
	var mesh := SphereMesh.new()
	mesh.radius = size_value
	mesh.height = size_value * 2.0

	var mat := StandardMaterial3D.new()
	mat.albedo_color = GOLD
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
	particles.position = pos + Vector3(0.0, 0.2, 0.0)
	_world.add_child(particles)
	particles.emitting = true

	get_tree().create_timer(1.5).timeout.connect(particles.queue_free)


## Anneau lumineux qui grandit et s'efface (réussite, erreur, aide).
func _ring(pos: Vector3, color: Color) -> void:
	var disc := CylinderMesh.new()
	disc.top_radius = 1.0
	disc.bottom_radius = 1.0
	disc.height = 0.03
	disc.radial_segments = 24
	disc.rings = 1

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(color, 0.6)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED

	var ring := MeshInstance3D.new()
	ring.mesh = disc
	ring.material_override = mat
	ring.position = pos + Vector3(0.0, 0.05, 0.0)
	ring.scale = Vector3(0.5, 1.0, 0.5)
	_world.add_child(ring)

	var tween := ring.create_tween().set_parallel(true)
	tween.tween_property(ring, "scale", Vector3(1.6, 1.0, 1.6), 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(mat, "albedo_color:a", 0.0, 0.5)
	tween.finished.connect(ring.queue_free)


func _land_effects(pos: Vector3) -> void:
	_sparks(pos, 14, 0.06)
	_ring(pos, GOLD)


func _open_chest() -> void:
	var gold := _load_model(CHEST_MODEL, 1.15, true)

	if gold != null:
		if is_instance_valid(_chest):
			_chest.queue_free()

		gold.position = _chest_pos
		gold.scale = Vector3.ONE * 0.7
		_round_root.add_child(gold)
		_chest = gold

		var pop := create_tween()
		pop.tween_property(gold, "scale", Vector3.ONE, 0.5).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)

	_sparks(_chest_pos + Vector3(0.0, 0.6, 0.0), 40, 0.09)
	_ring(Vector3(0.0, _finish_top, _finish_z), GOLD)


# ---------- Décor 3D ----------

func _build_world() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color.html("2b0f0a")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(1.0, 0.85, 0.75)
	env.ambient_light_energy = 0.9

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	_world.add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55.0, -25.0, 0.0)
	sun.light_color = Color(1.0, 0.82, 0.65)
	sun.light_energy = 1.1
	_world.add_child(sun)

	_camera = Camera3D.new()
	_camera.fov = 55.0
	_camera.rotation_degrees = Vector3(CAM_PITCH, 0.0, 0.0)
	_cam_base = Vector3(0.0, 0.0, START_Z) + CAM_OFFSET
	_camera.position = _cam_base
	_world.add_child(_camera)
	_camera.current = true

	_build_lava()
	_build_cliffs()
	_build_bubbles()
	_build_embers()


func _build_lava() -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(140.0, 140.0)

	var shader := Shader.new()
	shader.code = LAVA_SHADER
	var mat := ShaderMaterial.new()
	mat.shader = shader

	var lava := MeshInstance3D.new()
	lava.mesh = plane
	lava.material_override = mat
	lava.position = Vector3(0.0, -0.5, -25.0)
	_world.add_child(lava)


## Montagnes de chaque côté du chemin, et quelques rochers qui sortent de la lave.
func _build_cliffs() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 20261121

	for side in [-1, 1]:
		var z := 10.0

		while z > -45.0:
			var file: String = CLIFFS[rng.randi() % CLIFFS.size()]
			var cliff := _load_model(HEX_NATURE + file, rng.randf_range(5.0, 6.5), true)

			if cliff == null:
				cliff = _fallback_rock(rng.randf_range(5.0, 6.5))

			cliff.position = Vector3(side * rng.randf_range(10.0, 11.5), -0.5, z)
			cliff.rotation.y = rng.randf_range(0.0, TAU)
			_world.add_child(cliff)
			z -= 5.0

		for i in 8:
			var rock_file: String = ROCKS[rng.randi() % ROCKS.size()]
			var rock := _load_model(HEX_NATURE + rock_file, rng.randf_range(1.2, 2.2), true)

			if rock == null:
				rock = _fallback_rock(rng.randf_range(1.2, 2.2))

			rock.position = Vector3(side * rng.randf_range(5.0, 7.0), -0.5, rng.randf_range(8.0, -40.0))
			rock.rotation.y = rng.randf_range(0.0, TAU)
			_world.add_child(rock)


func _fallback_rock(height: float) -> Node3D:
	var mesh := BoxMesh.new()
	mesh.size = Vector3(height * 0.8, height, height * 0.8)

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.25, 0.13, 0.10)

	var box := MeshInstance3D.new()
	box.mesh = mesh
	box.material_override = mat
	box.position.y = height / 2.0

	var holder := Node3D.new()
	holder.add_child(box)
	return holder


func _build_bubbles() -> void:
	var sphere := SphereMesh.new()
	sphere.radius = 0.14
	sphere.height = 0.28

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.75, 0.2)
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED

	for i in 16:
		var bubble := MeshInstance3D.new()
		bubble.mesh = sphere
		bubble.material_override = mat
		bubble.position = Vector3(randf_range(-6.0, 6.0), -0.6, randf_range(6.0, -30.0))
		_world.add_child(bubble)

		var duration := randf_range(1.2, 2.4)
		var tween := bubble.create_tween().set_loops()
		tween.tween_interval(randf_range(0.0, 2.0))
		tween.tween_property(bubble, "position:y", 0.1, duration).from(-0.6).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		tween.tween_property(bubble, "scale", Vector3.ZERO, 0.25)
		tween.tween_callback(func() -> void: bubble.scale = Vector3.ONE)


## Braises qui montent de la lave autour du personnage (36 particules seulement).
func _build_embers() -> void:
	var mesh := SphereMesh.new()
	mesh.radius = 0.05
	mesh.height = 0.1

	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh.material = mat

	var gradient := Gradient.new()
	gradient.set_color(0, Color(1.0, 0.7, 0.2, 1.0))
	gradient.set_color(1, Color(1.0, 0.3, 0.05, 0.0))

	_embers = CPUParticles3D.new()
	_embers.mesh = mesh
	_embers.amount = 36
	_embers.lifetime = 4.0
	_embers.preprocess = 4.0
	_embers.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	_embers.emission_box_extents = Vector3(7.0, 0.05, 9.0)
	_embers.direction = Vector3.UP
	_embers.spread = 15.0
	_embers.initial_velocity_min = 0.5
	_embers.initial_velocity_max = 1.4
	_embers.gravity = Vector3.ZERO
	_embers.scale_amount_min = 0.5
	_embers.scale_amount_max = 1.4
	_embers.color_ramp = gradient
	_embers.position = Vector3(0.0, -0.4, START_Z - 3.0)
	_world.add_child(_embers)


func _build_hero() -> void:
	_hero = Node3D.new()
	_world.add_child(_hero)

	# Personnage choisi par le joueur ; le Mage si l'avatar est inconnu ou le modèle absent.
	var avatar: Dictionary = Avatars.get_avatar(avatar_id)
	var model_path: String = avatar.get("model", HERO_MODEL)
	var model := _load_model(model_path, HERO_HEIGHT, true)

	if model == null and model_path != HERO_MODEL:
		model = _load_model(HERO_MODEL, HERO_HEIGHT, true)

	# Tous les personnages KayKit utilisent le rig « medium » : on leur ajoute les animations du pack.
	if model != null and avatar.get("rig", "medium") == "medium" and model.get_child_count() > 0:
		_load_rig_animations(model.get_child(0) as Node3D)

	if model == null:
		var capsule := CapsuleMesh.new()
		capsule.radius = 0.4
		capsule.height = HERO_HEIGHT

		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(1.0, 0.48, 0.10)

		var body := MeshInstance3D.new()
		body.mesh = capsule
		body.material_override = mat
		body.position.y = HERO_HEIGHT / 2.0

		model = Node3D.new()
		model.add_child(body)

	model.rotation.y = HERO_YAW
	_hero.add_child(model)
	_hero_model = model

	_hero_player = _find_player(model)
	_hero_has_emotes = _has_anim(ANIM_CHEER)

	if _hero_player != null:
		print("Animations de %s : %s" % [avatar_id, ", ".join(_hero_player.get_animation_list())])

	_play(ANIM_IDLE, true)


# ---------- Interface 2D ----------

func _outline(label: Label, outline_size: int = 8) -> void:
	label.add_theme_color_override("font_outline_color", OUTLINE)
	label.add_theme_constant_override("outline_size", outline_size)


func _build_hud() -> void:
	_clue = TextureRect.new()
	_clue.position = Vector2(1060, 132)
	_clue.size = Vector2(130, 130)
	_clue.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_clue.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_clue.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_stage.add_child(_clue)

	_counter = Ui.label("", 24, Color.html("ffe2c2"), HORIZONTAL_ALIGNMENT_LEFT)
	_counter.position = Vector2(190, 26)
	_counter.size = Vector2(240, 36)
	_stage.add_child(_counter)

	# Score et combo en haut à droite, comme dans « Dedans ou pas ? ».
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

	_message = Ui.label("", 34, Color.WHITE)
	_message.position = Vector2(0, 662)
	_message.size = Vector2(W, 50)
	_message.add_theme_color_override("font_outline_color", Color.html("2b0f0a"))
	_message.add_theme_constant_override("outline_size", 8)
	_stage.add_child(_message)


func _update_score() -> void:
	_score_label.text = str(_total_letters)

	if _combo >= 2:
		_combo_label.text = "Combo x%d" % _combo
	else:
		_combo_label.text = ""


# ---------- Déroulement d'une manche ----------

func _start_round() -> void:
	for node in _round_nodes:
		if is_instance_valid(node):
			node.queue_free()

	if is_instance_valid(_round_root):
		_round_root.queue_free()

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

	_build_slots()
	_build_course(word)
	_play(ANIM_IDLE, true)

	_locked = true

	await get_tree().create_timer(0.6).timeout
	if not _alive:
		return

	# La toute première manche : la consigne est dite une fois, avant le premier mot.
	if _round_index == 0:
		await Speech.speak(VOICE_INTRO)
		if not _alive:
			return

	await _say_current_word()
	if not _alive:
		return

	_locked = false
	_message.text = "Touche les bonnes lettres !"

	if _round_index == 0:
		Speech.speak(VOICE_GO)


func _load_clue(word: String) -> void:
	var path := "res://assets/images/words/%s.png" % word

	if ResourceLoader.exists(path):
		_clue.texture = load(path)
	else:
		_clue.texture = null


func _say_current_word() -> void:
	var item: Dictionary = _words[_round_index]
	var word: String = item["word"]
	# « spoken » ne sert qu'à la synthèse vocale : l'enregistrement MP3, lui, porte le nom du mot.
	var spoken: String = word if Speech.has_recording(word) else item.get("spoken", word)
	await Speech.speak(spoken)


## Les cases vides du mot, avec le haut-parleur juste à droite pour réécouter le mot.
func _build_slots() -> void:
	var count := _letters.size()
	var gap := 78.0
	var first_x := W / 2.0 - (count - 1) * gap / 2.0 - 80.0

	for i in count:
		var x := first_x + i * gap

		var slot := Panel.new()
		slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		slot.position = Vector2(x - 32, 22)
		slot.size = Vector2(64, 76)
		slot.add_theme_stylebox_override("panel", Ui.flat(Color(0.10, 0.03, 0.02, 0.8), 14, 4, Color(1.0, 0.89, 0.76, 0.9), false))
		_stage.add_child(slot)

		var letter := Ui.label("", 52, Color.WHITE)
		letter.size = slot.size
		slot.add_child(letter)

		_slot_labels.append(letter)
		_round_nodes.append(slot)

	var last_edge: float = first_x + (count - 1) * gap + 32.0

	var speaker := Ui.button("", 30, Ui.ORANGE)
	speaker.custom_minimum_size = Vector2(84.0, 76.0)
	speaker.size = Vector2(84.0, 76.0)
	speaker.position = Vector2(last_edge + 24.0, 22.0)

	var icon := SpeakerIcon.new()
	icon.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	speaker.add_child(icon)

	speaker.pressed.connect(func() -> void:
		if _round_index < _words.size():
			_say_current_word()
	)
	_stage.add_child(speaker)
	_round_nodes.append(speaker)


## Parcours 3D : plateforme de départ, une rangée de dalles par lettre, puis le coffre.
func _build_course(word: String) -> void:
	_round_root = Node3D.new()
	_world.add_child(_round_root)

	var start := _tile_visual(2.8)
	start.position = Vector3(0.0, 0.0, START_Z)
	_round_root.add_child(start)
	var start_top: float = start.get_meta("height")

	var columns: Array = Logic.build_columns(word, level)

	for column_index in columns.size():
		var column: Array = columns[column_index]
		var tiles_in_row: Array = []

		for row in column.size():
			var x := (row - (column.size() - 1) / 2.0) * TILE_SPACING
			var z := -column_index * ROW_GAP
			tiles_in_row.append(_create_tile(column[row], Vector3(x, 0.0, z), column_index * 0.12 + row * 0.05))

		_tiles.append(tiles_in_row)

	_finish_z = -columns.size() * ROW_GAP
	var finish := _tile_visual(3.2)
	finish.position = Vector3(0.0, 0.0, _finish_z)
	_round_root.add_child(finish)
	_finish_top = finish.get_meta("height")

	# Coffre fermé : il devient doré (avec des étincelles) quand le mot est trouvé.
	_chest = _load_model(CHEST_CLOSED, 1.0, true)

	if _chest == null:
		_chest = _load_model(CHEST_MODEL, 1.0, true)

	_chest_pos = Vector3(0.0, _finish_top, _finish_z - 0.6)

	if _chest != null:
		_chest.position = _chest_pos
		_round_root.add_child(_chest)

	_hero.position = Vector3(0.0, start_top, START_Z)
	_hero_model.rotation.y = HERO_YAW
	_hero_model.scale = Vector3.ONE
	_cam_offset = CAM_OFFSET
	_cam_base = _hero.position + _cam_offset
	_camera.position = _cam_base


func _create_tile(letter: String, pos: Vector3, delay: float) -> Dictionary:
	var root := Node3D.new()
	root.position = pos

	var visual := _tile_visual(TILE_SIZE)
	root.add_child(visual)
	var top: float = visual.get_meta("height")
	_plane_y = top

	var label := Label3D.new()
	label.text = letter
	label.font = Ui.bold_font()
	label.font_size = 220
	label.pixel_size = 0.0065
	label.outline_size = 24
	label.outline_modulate = Color(1.0, 0.95, 0.88)
	label.modulate = Ui.DARK_TEXT
	label.rotation_degrees = Vector3(-90.0, 0.0, 0.0)
	label.position = Vector3(0.0, top + 0.03, 0.0)
	root.add_child(label)

	root.scale = Vector3.ZERO
	_round_root.add_child(root)

	var pop := create_tween()
	pop.tween_interval(delay)
	pop.tween_property(root, "scale", Vector3.ONE, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

	return {"letter": letter, "node": root, "visual": visual, "pos": pos, "top": top, "done": false}


# ---------- Touches ----------

## _input (et non _unhandled_input) : le Control plein écran du jeu et celui de game_host
## absorbent les clics avant qu'ils n'arrivent à _unhandled_input.
func _input(event: InputEvent) -> void:
	if _locked or _camera == null or _position >= _tiles.size():
		return

	if not (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT):
		return

	var point: Vector2 = event.position - _container.global_position
	var origin := _camera.project_ray_origin(point)
	var direction := _camera.project_ray_normal(point)

	if absf(direction.y) < 0.001:
		return

	var ray_length := (_plane_y - origin.y) / direction.y

	if ray_length < 0.0:
		return

	var hit := origin + direction * ray_length
	var best: Dictionary = {}
	var best_distance := TAP_RADIUS

	for tile in _tiles[_position]:
		if tile["done"]:
			continue

		var pos: Vector3 = tile["pos"]
		var distance := Vector2(hit.x - pos.x, hit.z - pos.z).length()

		if distance < best_distance:
			best_distance = distance
			best = tile

	if not best.is_empty():
		_on_tile_pressed(best)


func _on_tile_pressed(tile: Dictionary) -> void:
	if tile["letter"] == _letters[_position]:
		_on_correct(tile)
	else:
		_on_wrong(tile)


func _hop_step(t: float, from: Vector3, target: Vector3) -> void:
	var s := sin(t * PI)
	_hero.position = from.lerp(target, t) + Vector3(0.0, s * 1.5, 0.0)
	_hero_model.scale = Vector3(1.0 - 0.10 * s, 1.0 + 0.18 * s, 1.0 - 0.10 * s)


## Saut vers une dalle : le personnage se tourne, s'étire en l'air, s'écrase à l'atterrissage.
func _hop_to(target: Vector3) -> void:
	var from := _hero.position
	var flat := Vector2(target.x - from.x, target.z - from.z)

	if flat.length() > 0.1:
		var yaw := atan2(flat.x, flat.y)
		var turn := create_tween()
		turn.tween_property(_hero_model, "rotation:y", lerp_angle(_hero_model.rotation.y, yaw, 1.0), 0.12)

	_hopping = true
	_hero_model.position.y = 0.0
	_play(ANIM_JUMP, false, HOP_TIME)
	_play_sfx(SFX_JUMP)

	var tween := create_tween()
	tween.tween_method(_hop_step.bind(from, target), 0.0, 1.0, HOP_TIME)
	await tween.finished

	_hopping = false

	if not _alive:
		return

	_land_effects(target)
	_hero_model.scale = Vector3(1.15, 0.82, 1.15)

	var squash := create_tween()
	squash.tween_property(_hero_model, "scale", Vector3.ONE, 0.35).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	_play(ANIM_IDLE, true)


func _on_correct(tile: Dictionary) -> void:
	_locked = true
	_total_letters += 1
	_combo += 1
	_errors_here = 0
	tile["done"] = true
	_update_score()

	_tint(tile["visual"], TINT_CORRECT)
	_slot_labels[_position].text = tile["letter"]
	_message.text = "Bien !"

	var pos: Vector3 = tile["pos"]
	await _hop_to(Vector3(pos.x, tile["top"], pos.z))
	if not _alive:
		return

	_position += 1

	if _position >= _letters.size():
		await _hop_to(Vector3(0.0, _finish_top, _finish_z))
		if not _alive:
			return
		_finish_word()
	else:
		_locked = false


func _on_wrong(tile: Dictionary) -> void:
	_total_errors += 1
	_errors_here += 1
	_combo = 0
	tile["done"] = true
	_update_score()

	_tint(tile["visual"], TINT_WRONG)
	_shake()
	_message.text = "Oups, essaie encore !"
	_play_sfx(SFX_ROCK_BREAK)

	var wrong_pos: Vector3 = tile["pos"]
	_ring(Vector3(wrong_pos.x, tile["top"], wrong_pos.z), TINT_WRONG)

	# La dalle fausse s'enfonce dans la lave.
	var node: Node3D = tile["node"]
	var fall := create_tween().set_parallel(true)
	fall.tween_property(node, "position:y", -1.4, 0.6).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	fall.tween_property(node, "rotation:z", 0.35, 0.6)

	# La bonne dalle est repérée tout de suite ; après deux erreurs, une aide vocale est ajoutée.
	var right_candidates: Array = []

	for candidate in _tiles[_position]:
		if candidate["letter"] == _letters[_position] and not candidate["done"]:
			right_candidates.append(candidate)
			var right: Node3D = candidate["node"]
			var right_pos: Vector3 = candidate["pos"]
			_ring(Vector3(right_pos.x, candidate["top"], right_pos.z), Color(1.0, 0.9, 0.4))

			var pulse := create_tween().set_loops(4)
			pulse.tween_property(right, "scale", Vector3.ONE * 1.15, 0.26).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
			pulse.tween_property(right, "scale", Vector3.ONE, 0.26).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	if _errors_here >= 2 and not right_candidates.is_empty():
		await Speech.speak(VOICE_RETRY)
		if not _alive:
			return

		await _say_current_word()


func _shake() -> void:
	var shake := create_tween()

	for i in 3:
		shake.tween_property(_camera, "h_offset", 0.12 if i % 2 == 0 else -0.12, 0.04)

	shake.tween_property(_camera, "h_offset", 0.0, 0.04)


func _finish_word() -> void:
	_message.text = "Bravo !"
	_confetti()
	_open_chest()

	# Le personnage se tourne vers l'enfant ; zoom de la caméra.
	var turn := create_tween()
	turn.tween_property(_hero_model, "rotation:y", lerp_angle(_hero_model.rotation.y, 0.0, 1.0), 0.25)

	var zoom := create_tween()
	zoom.tween_property(self, "_cam_offset", CAM_ZOOM, 0.8).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Vraie animation de joie si le personnage en a une ; sinon un petit saut de joie.
	if _hero_has_emotes:
		_play(ANIM_CHEER, false)
	else:
		_hop_to(Vector3(0.0, _finish_top, _finish_z))

	await get_tree().create_timer(0.3).timeout
	if not _alive:
		return

	await Speech.speak(VOICE_PRAISE)
	if not _alive:
		return

	await _say_current_word()

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
		piece.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
