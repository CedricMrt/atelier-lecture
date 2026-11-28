extends Control
## Aperçu 3D du personnage sur un petit socle, qu'on fait tourner du doigt.
## show_pieces() choisit les accessoires visibles et les objets tenus en main (portés, ou à l'essai).

const Avatars = preload("res://scripts/data/avatars.gd")
const Outfit = preload("res://scripts/logic/avatar_outfit.gd")
const Weapons = preload("res://scripts/data/weapons.gd")

const HEIGHT := 1.7

var avatar_id := "mage"
var shown: Array = []

var _pivot: Node3D = null
var _model: Node3D = null


func _init() -> void:
	custom_minimum_size = Vector2(300, 420)
	mouse_filter = Control.MOUSE_FILTER_STOP


func _ready() -> void:
	_build()


func show_pieces(names: Array) -> void:
	shown = names
	_apply_pieces()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and _pivot != null:
		if (event.button_mask & MOUSE_BUTTON_MASK_LEFT) != 0:
			_pivot.rotation.y += event.relative.x * 0.012


func _apply_pieces() -> void:
	if _model == null:
		return

	var weapon_ids: Array = []

	for entry in shown:
		if Weapons.is_weapon_id(String(entry)):
			weapon_ids.append(String(entry))

	for mesh in _model.find_children("*", "MeshInstance3D", true, false):
		var mesh_name := String(mesh.name)

		if Outfit.is_accessory(mesh_name):
			mesh.visible = shown.has(mesh_name)

	var skeletons := _model.find_children("*", "Skeleton3D", true, false)

	if not skeletons.is_empty():
		Outfit.attach_list(skeletons[0] as Skeleton3D, weapon_ids)


func _build() -> void:
	var container := SubViewportContainer.new()
	container.stretch = true
	container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(container)
	container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var viewport := SubViewport.new()
	viewport.own_world_3d = true
	viewport.transparent_bg = true
	viewport.msaa_3d = Viewport.MSAA_2X
	viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	container.add_child(viewport)

	var env := Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(1.0, 0.95, 0.90)
	env.ambient_light_energy = 0.9
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	viewport.add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-35.0, 25.0, 0.0)
	sun.light_energy = 1.1
	viewport.add_child(sun)

	_add_disc(viewport, 1.05, 1.10, 0.12, Color(0.45, 0.75, 0.30), -0.26)
	_add_disc(viewport, 0.75, 0.80, 0.20, Color(0.86, 0.78, 0.60), -0.10)

	_pivot = Node3D.new()
	_pivot.rotation.y = 0.35
	viewport.add_child(_pivot)

	var path: String = Avatars.get_avatar(avatar_id).get("model", "")
	_model = _make_model(path)

	if _model != null:
		_pivot.add_child(_model)

	var camera := Camera3D.new()
	camera.fov = 28.0
	camera.position = Vector3(0.0, 0.95, 4.8)
	viewport.add_child(camera)
	camera.current = true

	_apply_pieces()


func _add_disc(parent: Node, top: float, bottom: float, height: float, color: Color, y: float) -> void:
	var mesh := CylinderMesh.new()
	mesh.top_radius = top
	mesh.bottom_radius = bottom
	mesh.height = height
	var disc_material := StandardMaterial3D.new()
	disc_material.albedo_color = color
	mesh.material = disc_material

	var disc := MeshInstance3D.new()
	disc.mesh = mesh
	disc.position = Vector3(0.0, y, 0.0)
	parent.add_child(disc)


## Charge le modèle, le met à la bonne taille, pieds à y = 0, centré. Les accessoires ne comptent pas dans la taille.
func _make_model(path: String) -> Node3D:
	if not ResourceLoader.exists(path):
		return null

	var res := load(path)

	if not (res is PackedScene):
		return null

	var inst: Node = (res as PackedScene).instantiate()

	if not (inst is Node3D):
		inst.queue_free()
		return null

	var acc: Array = []
	_accumulate_aabb(inst, Transform3D.IDENTITY, acc)

	if acc.is_empty() or (acc[0] as AABB).size.y <= 0.0001:
		inst.queue_free()
		return null

	var box: AABB = acc[0]
	var s := HEIGHT / box.size.y
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
	if node is MeshInstance3D and node.mesh != null and not Outfit.is_accessory(String(node.name)):
		var box: AABB = xf * node.mesh.get_aabb()

		if acc.is_empty():
			acc.append(box)
		else:
			acc[0] = (acc[0] as AABB).merge(box)

	for child in node.get_children():
		if child is Node3D:
			_accumulate_aabb(child, xf * child.transform, acc)
