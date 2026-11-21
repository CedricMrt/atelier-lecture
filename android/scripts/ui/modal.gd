extends Control
## Boîte de dialogue centrée, avec fond assombri qui bloque les touches derrière.
## Usage : var m := Modal.new(); parent.add_child(m); m.setup("Titre"); m.box.add_child(...)

const Ui = preload("res://scripts/ui/ui.gd")

var box: VBoxContainer


func setup(title: String) -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.6)
	add_child(dim)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var center := CenterContainer.new()
	add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", Ui.flat(Ui.CREAM, 32, 0, Color.WHITE, true))
	center.add_child(panel)

	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 32)
	panel.add_child(margin)

	box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 20)
	margin.add_child(box)

	box.add_child(Ui.label(title, 44, Ui.DARK_TEXT))
