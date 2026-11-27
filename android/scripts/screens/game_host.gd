extends Control
## Héberge un jeu : pub éventuelle AVANT le jeu (jamais pendant), le jeu,
## puis l'écran de résultat (étoiles) avec « Rejouer » et « Retour aux jeux ».

signal exited

const Ui = preload("res://scripts/ui/ui.gd")
const Modal = preload("res://scripts/ui/modal.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const VolcanoGame = preload("res://scripts/games/volcano_game.gd")
const DedansGame = preload("res://scripts/games/dedans_game.gd")
const GhostGame = preload("res://scripts/games/ghost_game.gd")

## Variable de chaque jeu qui contient le score affiché pendant la partie (l'étoile en haut à droite).
## C'est ce score qui s'ajoute au total d'étoiles du joueur.
const SCORE_PROPERTY := {
	"volcan": "_total_letters",
	"dedans": "_correct",
	"fantomes": "_points",
}

var profile_id: String = ""
var game_id: String = ""

var _game: Control = null
var _quit_button: Button
var _result_modal: Control = null


func setup(p_profile_id: String, p_game_id: String) -> void:
	profile_id = p_profile_id
	game_id = p_game_id


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	_quit_button = Ui.button("Quitter", 24, Color(0, 0, 0, 0.45))
	_quit_button.position = Vector2(16, 12)
	_quit_button.pressed.connect(_exit)
	add_child(_quit_button)

	_begin()


func on_back() -> void:
	_exit()


func _exit() -> void:
	Speech.cancel()
	exited.emit()


func _begin() -> void:
	await Ads.show_before_game(self)
	_start_game()


func _start_game() -> void:
	var profile := Profiles.get_profile(profile_id)
	var known: bool = game_id == "volcan" or game_id == "dedans" or game_id == "fantomes"

	if profile.is_empty() or not known:
		_exit()
		return

	var level := Profiles.get_level(profile, game_id)

	if game_id == "dedans":
		_game = DedansGame.new()
		_game.setup(level, 8, profile["avatar_id"])
	elif game_id == "fantomes":
		_game = GhostGame.new()
		_game.setup(level, 8, profile["avatar_id"])
	else:
		_game = VolcanoGame.new()
		_game.setup(level, 5, profile["avatar_id"])

	_game.finished.connect(_on_finished)
	add_child(_game)
	move_child(_quit_button, -1)


## Le score affiché dans le jeu ; à défaut, les 1 à 3 étoiles de la partie.
func _score_of(result: Dictionary) -> int:
	var points := int(result["stars"])

	if SCORE_PROPERTY.has(game_id) and is_instance_valid(_game):
		var raw: Variant = _game.get(SCORE_PROPERTY[game_id])

		if raw != null:
			points = maxi(int(raw), 0)

	return points


func _on_finished(result: Dictionary) -> void:
	var points := _score_of(result)

	Profiles.record_result(profile_id, {
		"game_id": game_id,
		"stars": result["stars"],
		"accuracy": result["accuracy"],
		"points": points,
	})

	var profile := Profiles.get_profile(profile_id)

	_result_modal = Modal.new()
	add_child(_result_modal)
	_result_modal.setup("Bravo %s !" % profile.get("name", ""))
	var box: VBoxContainer = _result_modal.box

	var stars := HBoxContainer.new()
	stars.alignment = BoxContainer.ALIGNMENT_CENTER
	stars.add_theme_constant_override("separation", 12)
	box.add_child(stars)

	for i in 3:
		var star := StarView.new()
		star.custom_minimum_size = Vector2(90, 90)
		star.filled = i < int(result["stars"])
		stars.add_child(star)

	if points > 0:
		box.add_child(Ui.label("+%d étoiles" % points, 40, Ui.CREAM))

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 20)
	box.add_child(actions)

	var back := Ui.button("Retour aux jeux", 30, Ui.NEUTRAL_BUTTON)
	back.pressed.connect(_exit)
	actions.add_child(back)

	var replay := Ui.button("Rejouer", 30)
	replay.pressed.connect(_replay)
	actions.add_child(replay)

	_say_result(int(result["stars"]), _result_modal)


func _say_result(stars: int, modal: Control) -> void:
	await Speech.speak("Tu as terminé la partie !" if stars >= 3 else "Tu progresses !")

	if is_instance_valid(modal) and modal == _result_modal and is_inside_tree():
		await Speech.speak("Veux-tu rejouer ?")


func _replay() -> void:
	Speech.cancel()

	if is_instance_valid(_result_modal):
		_result_modal.queue_free()

	_result_modal = null

	if is_instance_valid(_game):
		_game.queue_free()

	_begin()
