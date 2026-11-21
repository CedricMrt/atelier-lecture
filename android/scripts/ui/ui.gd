extends RefCounted
## Petits outils pour construire l'interface par code (boutons, étiquettes, styles).

const BACKGROUND := Color(0.169, 0.059, 0.039)
const ORANGE := Color(1.0, 0.48, 0.10)
const CREAM := Color(1.0, 0.95, 0.88)
const DARK_TEXT := Color(0.17, 0.10, 0.08)

const FONT_BOLD := "res://assets/fonts/static/Fredoka-Bold.ttf"

static var _bold_font: Font = null


## Police de l'appli : Fredoka Bold. Si le fichier est absent ou pas encore importé,
## on se rabat sur la police du système mise en gras.
static func bold_font() -> Font:
	if _bold_font == null:
		if ResourceLoader.exists(FONT_BOLD):
			_bold_font = load(FONT_BOLD)
		else:
			var variation := FontVariation.new()
			variation.base_font = ThemeDB.fallback_font
			variation.variation_embolden = 0.7
			_bold_font = variation
	return _bold_font


static func flat(
	color: Color,
	radius: int = 24,
	border: int = 0,
	border_color: Color = Color.WHITE,
	shadow: bool = true,
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(radius)

	if border > 0:
		style.set_border_width_all(border)
		style.border_color = border_color

	if shadow:
		style.shadow_color = Color(0, 0, 0, 0.35)
		style.shadow_size = 6
		style.shadow_offset = Vector2(0, 6)

	return style


static func style_button(target: Button, color: Color, radius: int = 24) -> void:
	var normal := flat(color, radius)
	var hover := flat(color.lightened(0.12), radius)
	var pressed := flat(color.darkened(0.2), radius, 0, Color.WHITE, false)
	var disabled := flat(color.darkened(0.45), radius, 0, Color.WHITE, false)

	for style in [normal, hover, pressed, disabled]:
		style.content_margin_left = 28
		style.content_margin_right = 28
		style.content_margin_top = 12
		style.content_margin_bottom = 12

	target.add_theme_stylebox_override("normal", normal)
	target.add_theme_stylebox_override("hover", hover)
	target.add_theme_stylebox_override("pressed", pressed)
	target.add_theme_stylebox_override("disabled", disabled)
	target.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


static func button(
	text: String,
	font_size: int = 32,
	color: Color = ORANGE,
	text_color: Color = Color.WHITE,
) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_override("font", bold_font())
	b.add_theme_font_size_override("font_size", font_size)

	for color_name in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(color_name, text_color)

	b.add_theme_color_override("font_disabled_color", Color(1, 1, 1, 0.5))
	style_button(b, color)
	return b


static func label(
	text: String,
	font_size: int = 32,
	color: Color = Color.WHITE,
	align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_CENTER,
) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = align
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.add_theme_font_override("font", bold_font())
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	return l


## Les enfants d'un bouton ne doivent pas intercepter les touches.
static func ignore_mouse(node: Node) -> void:
	if node is Control:
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE

	for child in node.get_children():
		ignore_mouse(child)
