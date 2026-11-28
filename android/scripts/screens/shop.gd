extends Control
## Boutique (étape 1) : onglets Tête et Dos avec les pièces d'origine du personnage du joueur.
## L'onglet Main arrive à l'étape 2. On peut essayer un objet sur le personnage avant de l'acheter.

signal closed

const Ui = preload("res://scripts/ui/ui.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const ShopPreview = preload("res://scripts/ui/shop_preview.gd")
const ItemThumb = preload("res://scripts/ui/item_thumb.gd")
const Shop = preload("res://scripts/logic/shop.gd")
const Outfit = preload("res://scripts/logic/avatar_outfit.gd")

const TABS := [
	{"slot": "head", "label": "Tête"},
	{"slot": "back", "label": "Dos"},
	{"slot": "hand", "label": "Main"},
]

const PILL_COLOR := Color(1.0, 0.96, 0.86)
const CARD_COLOR := Color(0.97, 0.93, 0.86)
const BUY_GREEN := Color(0.30, 0.70, 0.20)
const EQUIPPED_ORANGE := Color(0.95, 0.65, 0.10)
const TAB_ON := Color(0.17, 0.45, 0.95)
const TAB_OFF := Color(0.55, 0.75, 1.0)

var profile_id: String = ""

var _items: Array = []
var _tab := "head"
var _trying: Dictionary = {}
var _preview: Control = null
var _grid: GridContainer = null
var _stars_label: Label = null
var _try_label: Label = null
var _tab_buttons := {}
var _toast: Control = null


## Fond : ciel bleu clair avec quelques nuages.
class ShopSky extends Control:
	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		resized.connect(queue_redraw)

	func _cloud(center: Vector2, k: float) -> void:
		var white := Color(1.0, 1.0, 1.0, 0.9)
		draw_circle(center, 26.0 * k, white)
		draw_circle(center + Vector2(30, 6) * k, 32.0 * k, white)
		draw_circle(center + Vector2(64, 8) * k, 24.0 * k, white)
		draw_circle(center + Vector2(32, 18) * k, 26.0 * k, white)

	func _draw() -> void:
		var w := size.x
		var h := size.y
		var top := Color(0.30, 0.68, 0.98)
		var bottom := Color(0.72, 0.90, 1.0)
		draw_polygon(
			PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, h), Vector2(0, h)]),
			PackedColorArray([top, top, bottom, bottom]),
		)
		_cloud(Vector2(w * 0.02, h * 0.22), 1.4)
		_cloud(Vector2(w * 0.90, h * 0.30), 1.5)
		_cloud(Vector2(w * 0.55, h * 0.88), 1.3)


## Flèche blanche vers la gauche (bouton Retour).
class ArrowIcon extends Control:
	func _init() -> void:
		custom_minimum_size = Vector2(40, 32)
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var w := size.x
		var h := size.y
		draw_colored_polygon(PackedVector2Array([
			Vector2(0, h * 0.5),
			Vector2(w * 0.45, 0),
			Vector2(w * 0.45, h * 0.3),
			Vector2(w, h * 0.3),
			Vector2(w, h * 0.7),
			Vector2(w * 0.45, h * 0.7),
			Vector2(w * 0.45, h),
		]), Color.WHITE)


func setup(p_profile_id: String) -> void:
	profile_id = p_profile_id


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var profile := Profiles.get_profile(profile_id)

	if profile.is_empty():
		closed.emit()
		return

	_items = Shop.items_for(profile["avatar_id"])

	var sky := ShopSky.new()
	add_child(sky)
	sky.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var margin := MarginContainer.new()
	add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 30)
	margin.add_theme_constant_override("margin_top", 24)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 14)
	margin.add_child(column)

	column.add_child(_make_top_bar(profile))

	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 28)
	column.add_child(body)

	# À gauche : le personnage sur son socle.
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_stretch_ratio = 0.8
	body.add_child(left)

	_preview = ShopPreview.new()
	_preview.avatar_id = profile["avatar_id"]
	_preview.shown = Profiles.get_worn(profile_id).duplicate()
	_preview.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_child(_preview)

	_try_label = Ui.label("", 24, Ui.DARK_TEXT)
	_try_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	left.add_child(_try_label)

	# À droite : les onglets et les objets.
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_stretch_ratio = 1.5
	right.add_theme_constant_override("separation", 14)
	body.add_child(right)

	right.add_child(_make_tabs())

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	right.add_child(scroll)

	_grid = GridContainer.new()
	_grid.columns = 3
	_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_grid.add_theme_constant_override("h_separation", 18)
	_grid.add_theme_constant_override("v_separation", 18)
	scroll.add_child(_grid)

	_refresh_grid()


## Bouton « retour » d'Android.
func on_back() -> void:
	closed.emit()


func _make_pill(content: Control) -> PanelContainer:
	var pill := PanelContainer.new()
	var style := Ui.flat(PILL_COLOR, 36, 0, Color.WHITE, true)
	style.content_margin_left = 16
	style.content_margin_right = 22
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	pill.add_theme_stylebox_override("panel", style)
	pill.add_child(content)
	return pill


func _make_top_bar(profile: Dictionary) -> HBoxContainer:
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 16)

	var back := Ui.button("", 28, Color(0.16, 0.42, 0.92))
	back.custom_minimum_size = Vector2(200, 64)
	var back_row := HBoxContainer.new()
	back_row.alignment = BoxContainer.ALIGNMENT_CENTER
	back_row.add_theme_constant_override("separation", 12)
	back.add_child(back_row)
	back_row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	back_row.add_child(ArrowIcon.new())
	back_row.add_child(Ui.label("Retour", 30, Color.WHITE))
	Ui.ignore_mouse(back_row)
	back.pressed.connect(func() -> void: closed.emit())
	top.add_child(back)

	var spacer_left := Control.new()
	spacer_left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer_left)

	var plaque := PanelContainer.new()
	var wood := Ui.flat(Color(0.62, 0.38, 0.19), 20, 5, Color(0.45, 0.26, 0.12), true)
	wood.content_margin_left = 46
	wood.content_margin_right = 46
	wood.content_margin_top = 4
	wood.content_margin_bottom = 8
	plaque.add_theme_stylebox_override("panel", wood)
	var title := Ui.label("Boutique", 56, Color.WHITE)
	title.add_theme_color_override("font_outline_color", Color(0.35, 0.20, 0.10))
	title.add_theme_constant_override("outline_size", 8)
	plaque.add_child(title)
	top.add_child(plaque)

	var spacer_right := Control.new()
	spacer_right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer_right)

	var stars := HBoxContainer.new()
	stars.add_theme_constant_override("separation", 10)
	var star := StarView.new()
	star.custom_minimum_size = Vector2(44, 44)
	stars.add_child(star)
	_stars_label = Ui.label(str(profile["stars"]), 36, Ui.DARK_TEXT)
	stars.add_child(_stars_label)
	top.add_child(_make_pill(stars))

	return top


func _make_tabs() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)

	for tab in TABS:
		var button := Ui.button(tab["label"], 34, TAB_OFF)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(_select_tab.bind(tab["slot"]))
		_tab_buttons[tab["slot"]] = button
		row.add_child(button)

	_style_tabs()
	return row


func _style_tabs() -> void:
	for slot in _tab_buttons:
		var button: Button = _tab_buttons[slot]
		var selected: bool = slot == _tab
		var style := Ui.flat(TAB_ON if selected else TAB_OFF, 26, 4 if selected else 0, Color.WHITE, selected)
		style.content_margin_left = 20
		style.content_margin_right = 20
		style.content_margin_top = 10
		style.content_margin_bottom = 10

		for state in ["normal", "hover", "pressed", "disabled"]:
			button.add_theme_stylebox_override(state, style)


func _select_tab(slot: String) -> void:
	_tab = slot
	_trying = {}
	_style_tabs()
	_refresh_grid()
	_update_preview()


func _refresh_grid() -> void:
	for child in _grid.get_children():
		_grid.remove_child(child)
		child.queue_free()

	var profile := Profiles.get_profile(profile_id)
	var shown := _items.filter(func(item: Dictionary) -> bool: return item["slot"] == _tab)

	if shown.is_empty():
		var text := "Les armes et les boucliers arrivent bientôt !" if _tab == "hand" else "Rien à acheter ici pour ce personnage."
		var message := Ui.label(text, 28, Ui.DARK_TEXT)
		message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		message.custom_minimum_size = Vector2(460, 80)
		_grid.add_child(message)
		return

	for item in shown:
		_grid.add_child(_make_card(profile, item))


func _make_card(profile: Dictionary, item: Dictionary) -> PanelContainer:
	var owned := Shop.is_owned(profile, item)
	var equipped := Shop.is_equipped(profile, item)

	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(190, 250)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var style := Ui.flat(CARD_COLOR, 30, 6 if equipped else 0, Ui.GOLD, true)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	card.add_theme_stylebox_override("panel", style)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	card.add_child(box)

	# Toucher l'image = essayer l'objet sur le personnage.
	var pick := Button.new()
	pick.flat = true
	pick.focus_mode = Control.FOCUS_NONE
	pick.custom_minimum_size = Vector2(0, 120)
	pick.size_flags_vertical = Control.SIZE_EXPAND_FILL
	pick.pressed.connect(_try_on.bind(item))
	box.add_child(pick)

	var thumb := ItemThumb.new()
	thumb.avatar_id = item["avatar_id"]
	thumb.nodes = item["nodes"]
	thumb.from_behind = item["slot"] == "back"
	pick.add_child(thumb)
	thumb.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var price_row := HBoxContainer.new()
	price_row.alignment = BoxContainer.ALIGNMENT_CENTER
	price_row.add_theme_constant_override("separation", 8)
	var star := StarView.new()
	star.custom_minimum_size = Vector2(30, 30)
	price_row.add_child(star)
	price_row.add_child(Ui.label(str(item["price"]), 30, Ui.DARK_TEXT))
	box.add_child(price_row)

	var text := "Acheter"
	var color := BUY_GREEN

	if equipped:
		text = "✓ Équipé"
		color = EQUIPPED_ORANGE
	elif owned:
		text = "✓ Possédé"

	var action := Ui.button(text, 28, color)
	action.pressed.connect(_on_action.bind(item))
	box.add_child(action)

	return card


func _try_on(item: Dictionary) -> void:
	if _trying.get("id", "") == item["id"]:
		_trying = {}
	else:
		_trying = item

	_update_preview()


## Montre sur le personnage les pièces portées, avec l'objet à l'essai à la place de celui du même emplacement.
func _update_preview() -> void:
	var nodes: Array = Profiles.get_worn(profile_id).duplicate()
	var profile := Profiles.get_profile(profile_id)

	if not _trying.is_empty():
		for other in _items:
			if other["slot"] == _trying["slot"]:
				for node_name in other["nodes"]:
					nodes.erase(node_name)

		nodes.append_array(_trying["nodes"])

	(_preview as Object).call("show_pieces", nodes)

	if not _trying.is_empty() and not Shop.is_owned(profile, _trying):
		_try_label.text = "Tu l’essaies ! Appuie sur Acheter pour le garder."
	else:
		_try_label.text = ""


func _on_action(item: Dictionary) -> void:
	var profile := Profiles.get_profile(profile_id)

	if Shop.is_owned(profile, item):
		Profiles.set_equipped(profile_id, Shop.after_toggle(profile, _items, item))
	else:
		if not Profiles.buy_item(profile_id, item["id"], item["price"]):
			var missing := int(item["price"]) - int(profile["stars"])
			_show_toast("Il te manque %d étoiles" % maxi(missing, 1))
			return

		Profiles.set_equipped(profile_id, Shop.after_toggle(profile, _items, item))
		_show_toast("Bravo, c’est à toi !")

	_trying = {}
	_refresh_all()


func _refresh_all() -> void:
	var profile := Profiles.get_profile(profile_id)
	_stars_label.text = str(profile["stars"])
	Outfit.set_worn(Profiles.get_worn(profile_id))
	_refresh_grid()
	_update_preview()


func _show_toast(text: String) -> void:
	if is_instance_valid(_toast):
		_toast.queue_free()

	var panel := PanelContainer.new()
	var style := Ui.flat(Color(0.07, 0.14, 0.25, 0.92), 28, 0, Color.WHITE, false)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	panel.add_theme_stylebox_override("panel", style)
	panel.add_child(Ui.label(text, 30, Ui.CREAM))
	Ui.ignore_mouse(panel)
	add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_MINSIZE, 70)
	_toast = panel

	var tween := panel.create_tween()
	tween.tween_interval(1.8)
	tween.tween_property(panel, "modulate:a", 0.0, 0.4)
	tween.tween_callback(panel.queue_free)
