extends RefCounted
## Petite question de calcul : un enfant de 5 à 8 ans ne la résout pas, un adulte oui.

const Ui = preload("res://scripts/ui/ui.gd")
const Modal = preload("res://scripts/ui/modal.gd")


## Ouvre la question dans `parent`. `on_success` est appelée si la réponse est bonne.
## Retourne la boîte de dialogue (pour pouvoir la fermer avec le bouton retour).
static func open(parent: Control, title: String, on_success: Callable) -> Control:
	var a: int = randi_range(6, 9)
	var b: int = randi_range(6, 9)
	var answer: int = a * b

	var options: Array = [answer]
	while options.size() < 3:
		var wrong: int = answer + (randi_range(-4, 4))
		if wrong != answer and not options.has(wrong):
			options.append(wrong)
	options.shuffle()

	var modal := Modal.new()
	parent.add_child(modal)
	modal.setup(title)

	modal.box.add_child(Ui.label("Question pour les grands : %d × %d = ?" % [a, b], 30, Ui.DARK_TEXT))

	var error_label := Ui.label("", 26, Color(0.71, 0.14, 0.09))
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 20)
	modal.box.add_child(row)

	for option in options:
		var button := Ui.button(str(option), 36)
		button.pressed.connect(func() -> void:
			if option == answer:
				modal.queue_free()
				on_success.call()
			else:
				error_label.text = "Ce n’est pas la bonne réponse."
		)
		row.add_child(button)

	modal.box.add_child(error_label)

	var cancel := Ui.button("Annuler", 28, Ui.NEUTRAL_BUTTON)
	cancel.pressed.connect(modal.queue_free)
	modal.box.add_child(cancel)

	return modal
