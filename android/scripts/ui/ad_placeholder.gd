extends Control
## SIMULATION de pub avant un jeu : utilisée seulement en développement quand le vrai SDK n'est pas disponible
## (éditeur sur ordinateur, plugin AdMob pas installé). Jamais dans une version publiée.

signal closed

const Ui = preload("res://scripts/ui/ui.gd")
const Modal = preload("res://scripts/ui/modal.gd")

const WAIT_SECONDS := 2


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var modal := Modal.new()
	add_child(modal)
	modal.setup("Publicité (simulation)")

	var info := Ui.label("Ici s’affichera une publicité de test, avant le jeu.", 28, Ui.DARK_TEXT)
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info.custom_minimum_size = Vector2(560, 0)
	modal.box.add_child(info)

	var button := Ui.button("Fermer", 32)
	button.disabled = true
	button.pressed.connect(func() -> void:
		closed.emit()
		queue_free()
	)
	modal.box.add_child(button)

	for remaining in range(WAIT_SECONDS, 0, -1):
		button.text = "Fermer (%d)" % remaining
		await get_tree().create_timer(1.0).timeout

	button.text = "Fermer"
	button.disabled = false
