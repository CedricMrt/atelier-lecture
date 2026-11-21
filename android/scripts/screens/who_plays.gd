extends Control
## Écran « Qui joue ? » : tuiles avec personnage et prénom, bouton « + » pour créer un joueur.
## « Gérer » (protégé par une question d'adulte) permet de supprimer un profil.

signal selected(profile_id: String)

const Ui = preload("res://scripts/ui/ui.gd")
const Modal = preload("res://scripts/ui/modal.gd")
const AvatarView = preload("res://scripts/ui/avatar_view.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const AdultGate = preload("res://scripts/ui/adult_gate.gd")
const Avatars = preload("res://scripts/data/avatars.gd")

var _managing := false
var _selected_avatar: String = Avatars.LIST[0]["id"]
var _modal: Control = null

var _manage_button: Button
var _tiles: HFlowContainer


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var margin := MarginContainer.new()
	add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 36)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 14)
	margin.add_child(column)

	var top := HBoxContainer.new()
	column.add_child(top)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)

	_manage_button = Ui.button("Gérer", 26, Color(0, 0, 0, 0.35))
	_manage_button.pressed.connect(_on_manage_pressed)
	top.add_child(_manage_button)

	column.add_child(Ui.label("Qui joue ?", 72, Ui.CREAM))
	column.add_child(Ui.label("Touche ton personnage pour retrouver ta partie.", 28, Color(1, 0.89, 0.76)))

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)

	_tiles = HFlowContainer.new()
	_tiles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_tiles.alignment = FlowContainer.ALIGNMENT_CENTER
	_tiles.add_theme_constant_override("h_separation", 22)
	_tiles.add_theme_constant_override("v_separation", 22)
	scroll.add_child(_tiles)

	_refresh()


## Bouton « retour » d'Android.
func on_back() -> void:
	if is_instance_valid(_modal):
		_modal.queue_free()
	elif _managing:
		_managing = false
		_refresh()
	else:
		get_tree().quit()


func _refresh() -> void:
	for child in _tiles.get_children():
		child.queue_free()

	_manage_button.text = "Terminé" if _managing else "Gérer"
	_manage_button.visible = not Profiles.profiles.is_empty()

	for profile in Profiles.profiles:
		_tiles.add_child(_make_profile_tile(profile))

	if Profiles.can_create_profile():
		_tiles.add_child(_make_add_tile())


func _make_tile_button(color: Color) -> Button:
	var button := Button.new()
	button.custom_minimum_size = Vector2(210, 250)
	button.focus_mode = Control.FOCUS_NONE
	Ui.style_button(button, color, 28)
	return button


func _tile_content(button: Button) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 8)
	button.add_child(box)
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return box


func _make_profile_tile(profile: Dictionary) -> Button:
	var button := _make_tile_button(Color(0.30, 0.14, 0.10))
	var box := _tile_content(button)

	var avatar := AvatarView.new()
	avatar.avatar_id = profile["avatar_id"]
	avatar.custom_minimum_size = Vector2(130, 130)
	avatar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	box.add_child(avatar)

	box.add_child(Ui.label(profile["name"], 34, Ui.CREAM))

	if _managing:
		box.add_child(Ui.label("Supprimer", 26, Color(1.0, 0.55, 0.50)))
	else:
		var stars := HBoxContainer.new()
		stars.alignment = BoxContainer.ALIGNMENT_CENTER
		stars.add_theme_constant_override("separation", 8)
		var star := StarView.new()
		star.custom_minimum_size = Vector2(30, 30)
		stars.add_child(star)
		stars.add_child(Ui.label(str(profile["stars"]), 28, Ui.CREAM))
		box.add_child(stars)

	Ui.ignore_mouse(box)
	button.pressed.connect(_on_profile_pressed.bind(profile["id"]))
	return button


func _make_add_tile() -> Button:
	var button := _make_tile_button(Color(1, 1, 1, 0.12))
	var box := _tile_content(button)
	box.add_child(Ui.label("+", 110, Ui.CREAM))
	box.add_child(Ui.label("Nouveau joueur", 28, Ui.CREAM))
	Ui.ignore_mouse(box)
	button.pressed.connect(_open_create_dialog)
	return button


func _on_profile_pressed(profile_id: String) -> void:
	if _managing:
		_open_delete_dialog(profile_id)
	else:
		selected.emit(profile_id)


func _on_manage_pressed() -> void:
	if _managing:
		_managing = false
		_refresh()
		return

	_modal = AdultGate.open(self, "Gérer les joueurs", func() -> void:
		_managing = true
		_refresh()
	)


# ---------- Dialogues ----------

func _open_create_dialog() -> void:
	_modal = Modal.new()
	add_child(_modal)
	_modal.setup("Nouveau joueur")
	var box: VBoxContainer = _modal.box

	_selected_avatar = Avatars.LIST[0]["id"]

	var field := LineEdit.new()
	field.placeholder_text = "Ton prénom"
	field.max_length = Profiles.MAX_NAME_LENGTH
	field.custom_minimum_size = Vector2(520, 70)
	field.add_theme_font_size_override("font_size", 36)
	field.alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(field)

	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	box.add_child(grid)

	var group := ButtonGroup.new()

	for avatar in Avatars.LIST:
		var choice := Button.new()
		choice.toggle_mode = true
		choice.button_group = group
		choice.focus_mode = Control.FOCUS_NONE
		choice.custom_minimum_size = Vector2(130, 130)
		choice.button_pressed = avatar["id"] == _selected_avatar
		choice.add_theme_stylebox_override("normal", Ui.flat(Color(0.88, 0.82, 0.74), 20, 0, Color.WHITE, false))
		choice.add_theme_stylebox_override("hover", Ui.flat(Color(0.92, 0.86, 0.78), 20, 0, Color.WHITE, false))
		choice.add_theme_stylebox_override("pressed", Ui.flat(Color(1.0, 0.85, 0.55), 20, 6, Ui.ORANGE, false))
		choice.add_theme_stylebox_override("focus", StyleBoxEmpty.new())

		var view := AvatarView.new()
		view.avatar_id = avatar["id"]
		choice.add_child(view)
		view.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 8)
		Ui.ignore_mouse(view)

		choice.pressed.connect(func() -> void: _selected_avatar = avatar["id"])
		grid.add_child(choice)

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 20)
	box.add_child(actions)

	var cancel := Ui.button("Annuler", 30, Color(0.45, 0.35, 0.30))
	cancel.pressed.connect(_modal.queue_free)
	actions.add_child(cancel)

	var confirm := Ui.button("C’est parti !", 30)
	confirm.disabled = true
	actions.add_child(confirm)

	field.text_changed.connect(func(text: String) -> void: confirm.disabled = text.strip_edges().is_empty())

	confirm.pressed.connect(func() -> void:
		var profile := Profiles.create_profile(field.text, _selected_avatar)
		if profile.is_empty():
			return
		_modal.queue_free()
		selected.emit(profile["id"])
	)


func _open_delete_dialog(profile_id: String) -> void:
	var profile := Profiles.get_profile(profile_id)

	if profile.is_empty():
		return

	_modal = Modal.new()
	add_child(_modal)
	_modal.setup("Supprimer %s ?" % profile["name"])
	var box: VBoxContainer = _modal.box

	box.add_child(Ui.label("Sa progression sera effacée définitivement.", 28, Ui.DARK_TEXT))

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 20)
	box.add_child(actions)

	var keep := Ui.button("Garder", 30, Color(0.45, 0.35, 0.30))
	keep.pressed.connect(_modal.queue_free)
	actions.add_child(keep)

	var remove := Ui.button("Supprimer", 30, Color(0.78, 0.22, 0.20))
	remove.pressed.connect(func() -> void:
		Profiles.delete_profile(profile_id)
		_modal.queue_free()
		_refresh()
	)
	actions.add_child(remove)
