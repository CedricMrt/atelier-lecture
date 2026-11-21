extends Control
## Écran de bienvenue, montré une seule fois (au tout premier lancement sur l'appareil).
## Il s'adresse aux adultes : maison comme classe, sans compte, joueurs propres à chaque tablette.

signal done

const Ui = preload("res://scripts/ui/ui.gd")
const Modal = preload("res://scripts/ui/modal.gd")

const POINTS := [
	"Pas de compte à créer : tout reste sur cette tablette (ou ce téléphone).",
	"Chaque enfant crée son joueur : il retrouve ses étoiles et son niveau en choisissant son personnage.",
	"En classe, même avec un seul compte Google sur plusieurs tablettes : les joueurs ne sont pas partagés, chaque tablette garde les siens.",
	"Pour supprimer un joueur, une question pour les grands est posée.",
]


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var modal := Modal.new()
	add_child(modal)
	modal.setup("Bienvenue !")

	for text in POINTS:
		modal.box.add_child(_point(text))

	if not Speech.has_french_voice():
		var warning := _point("Aucune voix française n’est installée : les mots ne pourront pas être dits. Un adulte peut en ajouter une dans les réglages Android (synthèse vocale).")
		warning.add_theme_color_override("font_color", Color(0.70, 0.32, 0.04))
		modal.box.add_child(warning)

	var button := Ui.button("C’est parti !", 36)
	button.pressed.connect(_on_start)
	modal.box.add_child(button)


## Bouton « retour » d'Android : on quitte l'appli.
func on_back() -> void:
	get_tree().quit()


func _point(text: String) -> Label:
	var label := Ui.label("•  " + text, 26, Ui.DARK_TEXT, HORIZONTAL_ALIGNMENT_LEFT)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.custom_minimum_size = Vector2(760.0, 0.0)
	return label


func _on_start() -> void:
	Settings.mark_welcome_seen()
	done.emit()
