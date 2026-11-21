extends Control
## Affiche un personnage : portrait 3D (modèle du pack d'assets) ou, à défaut,
## le dessin de secours fait par code (modèle introuvable).

const Avatars = preload("res://scripts/data/avatars.gd")

const PORTRAIT_HEIGHT := 1.6

var avatar_id: String = "mage":
	set(value):
		avatar_id = value

		if is_node_ready():
			_rebuild()

var _has_model := false


func _init() -> void:
	custom_minimum_size = Vector2(100, 100)
	resized.connect(queue_redraw)


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()

	_has_model = false

	var avatar: Dictionary = Avatars.get_avatar(avatar_id)

	if avatar.has("model"):
		_has_model = _build_portrait(avatar["model"])

	queue_redraw()


# ---------- Portrait 3D ----------

func _build_portrait(path: String) -> bool:
	var model := _make_model(path)

	if model == null:
		return false

	var container := SubViewportContainer.new()
	container.stretch = true
	container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(container)

	# Un seul rendu suffit : le portrait est fixe (re-rendu si la taille change).
	var viewport := SubViewport.new()
	viewport.own_world_3d = true
	viewport.transparent_bg = true
	viewport.msaa_3d = Viewport.MSAA_2X
	viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	container.add_child(viewport)

	var env := Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(1.0, 0.92, 0.85)
	env.ambient_light_energy = 0.9

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	viewport.add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-35.0, 25.0, 0.0)
	sun.light_energy = 1.1
	viewport.add_child(sun)

	model.rotation.y = 0.35
	viewport.add_child(model)

	# Cadrage « buste » : de la tête jusqu'aux hanches environ.
	var camera := Camera3D.new()
	camera.fov = 28.0
	camera.position = Vector3(0.0, 1.0, 2.6)
	viewport.add_child(camera)
	camera.current = true

	container.resized.connect(func() -> void:
		viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	)

	return true


## Charge le modèle, le met à la taille du portrait, pieds à y = 0, centré.
func _make_model(path: String) -> Node3D:
	if not ResourceLoader.exists(path):
		push_warning("Personnage introuvable ou non importé : " + path)
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

	if box.size.y <= 0.0001:
		inst.queue_free()
		return null

	var s := PORTRAIT_HEIGHT / box.size.y
	var body := inst as Node3D
	body.scale = Vector3.ONE * s
	body.position = Vector3(
		-(box.position.x + box.size.x / 2.0) * s,
		-box.position.y * s,
		-(box.position.z + box.size.z / 2.0) * s,
	)

	var holder := Node3D.new()
	holder.add_child(body)
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


# ---------- Dessin de secours ----------

func _draw() -> void:
	if _has_model:
		return

	var avatar: Dictionary = Avatars.get_avatar(avatar_id)
	var color: Color = avatar["color"]
	var ears: String = avatar["ears"]

	var center := size / 2.0
	var r := minf(size.x, size.y) * 0.44
	var dark_eye := Color(0.10, 0.07, 0.06)

	if ears == "round":
		for side in [-1.0, 1.0]:
			draw_circle(center + Vector2(side * r * 0.68, -r * 0.78), r * 0.30, color.darkened(0.2))
	elif ears == "pointy":
		for side in [-1.0, 1.0]:
			var base_x: float = side * r * 0.62
			var points := PackedVector2Array([
				center + Vector2(base_x - 0.32 * r, -r * 0.55),
				center + Vector2(base_x + side * 0.10 * r, -r * 1.25),
				center + Vector2(base_x + 0.32 * r, -r * 0.55),
			])
			# Le sens des points doit rester le même pour les deux oreilles.
			if side < 0.0:
				points.reverse()
			draw_colored_polygon(points, color.darkened(0.2))

	draw_circle(center, r, color)
	draw_circle(center + Vector2(0, r * 0.30), r * 0.55, color.lightened(0.45))

	for side in [-1.0, 1.0]:
		var eye := center + Vector2(side * r * 0.38, -r * 0.12)
		draw_circle(eye, r * 0.20, Color.WHITE)
		draw_circle(eye + Vector2(0, r * 0.02), r * 0.10, dark_eye)

	draw_arc(center + Vector2(0, r * 0.18), r * 0.30, 0.2 * PI, 0.8 * PI, 16, dark_eye, maxf(2.0, r * 0.07))
