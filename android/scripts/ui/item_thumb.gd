extends SubViewportContainer
## Petite vignette 3D d'un objet de la boutique : la pièce seule prise sur le modèle du personnage,
## ou l'arme / le bouclier seul (identifiant « weapon_xxx »).

const Avatars = preload("res://scripts/data/avatars.gd")
const Weapons = preload("res://scripts/data/weapons.gd")

var avatar_id := "mage"
var nodes: Array = []
var from_behind := false


func _init() -> void:
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(120, 110)


func _ready() -> void:
	_build()


func _build() -> void:
	var weapon := {}

	if not nodes.is_empty() and Weapons.is_weapon_id(String(nodes[0])):
		weapon = Weapons.get_weapon(String(nodes[0]))

	var is_weapon := not weapon.is_empty()
	var path: String = String(weapon["scene"]) if is_weapon else String(Avatars.get_avatar(avatar_id).get("model", ""))

	if not ResourceLoader.exists(path):
		return

	var res := load(path)

	if not (res is PackedScene):
		return

	var inst: Node = (res as PackedScene).instantiate()

	if not (inst is Node3D):
		inst.queue_free()
		return
	inst.set_meta("no_weapons", true)

	var viewport := SubViewport.new()
	viewport.own_world_3d = true
	viewport.transparent_bg = true
	viewport.msaa_3d = Viewport.MSAA_2X
	viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	add_child(viewport)

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

	var holder := Node3D.new()
	viewport.add_child(holder)
	holder.add_child(inst)

	# Pour une pièce du personnage, seule cette pièce reste visible.
	if not is_weapon:
		for mesh in inst.find_children("*", "MeshInstance3D", true, false):
			mesh.visible = nodes.has(String(mesh.name))

	var acc: Array = []
	_accumulate_aabb(inst, Transform3D.IDENTITY, acc)

	if acc.is_empty():
		return

	var box: AABB = acc[0]
	(inst as Node3D).position = -box.get_center()
	holder.rotation.y = (PI + 0.45) if from_behind else 0.45

	var longest := maxf(box.size.x, box.size.y)

	if is_weapon:
		longest = maxf(longest, box.size.z)

	var camera := Camera3D.new()
	camera.fov = 30.0
	camera.near = 0.01
	var half := longest * 0.5 * 1.2
	camera.position = Vector3(0.0, 0.0, half / tan(deg_to_rad(15.0)) + box.size.z * 0.5)
	viewport.add_child(camera)
	camera.current = true

	resized.connect(func() -> void:
		viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	)


func _accumulate_aabb(node: Node, xf: Transform3D, acc: Array) -> void:
	if node is MeshInstance3D and node.mesh != null and node.visible:
		var box: AABB = xf * node.mesh.get_aabb()

		if acc.is_empty():
			acc.append(box)
		else:
			acc[0] = (acc[0] as AABB).merge(box)

	for child in node.get_children():
		if child is Node3D:
			_accumulate_aabb(child, xf * child.transform, acc)
