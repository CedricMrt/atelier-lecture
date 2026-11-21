extends Control
## Héberge un jeu : pub éventuelle AVANT le jeu (jamais pendant), le jeu,
## puis l'écran de résultat (étoiles) avec « Rejouer » et « Retour aux jeux ».

signal exited

const Ui = preload("res://scripts/ui/ui.gd")
const Modal = preload("res://scripts/ui/modal.gd")
const StarView = preload("res://scripts/ui/star_view.gd")
const AdPlaceholder = preload("res://scripts/ui/ad_placeholder.gd")
const VolcanoGame = preload("res://scripts/games/volcano_game.gd")

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


## Bouton « retour » d'Android.
func on_back() -> void:
	_exit()


func _exit() -> void:
	Speech.cancel()
	exited.emit()


func _begin() -> void:
	if Ads.should_show_ad_before_game():
		var ad := AdPlaceholder.new()
		add_child(ad)
		await ad.closed

	_start_game()


func _start_game() -> void:
	var profile := Profiles.get_profile(profile_id)

	if profile.is_empty() or game_id != "volcan":
		_exit()
		return

	# Le niveau est lu une seule fois par partie : il change à la fin, pas pendant.
	var level := Profiles.get_level(profile, game_id)

	_game = VolcanoGame.new()
	_game.setup(level, 5, profile["avatar_id"])
	_game.finished.connect(_on_finished)
	add_child(_game)
	move_child(_quit_button, -1)


func _on_finished(result: Dictionary) -> void:
	Profiles.record_result(profile_id, {
		"game_id": game_id,
		"stars": result["stars"],
		"accuracy": result["accuracy"],
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

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 20)
	box.add_child(actions)

	var back := Ui.button("Retour aux jeux", 30, Color(0.45, 0.35, 0.30))
	back.pressed.connect(_exit)
	actions.add_child(back)

	var replay := Ui.button("Rejouer", 30)
	replay.pressed.connect(_replay)
	actions.add_child(replay)


func _replay() -> void:
	if is_instance_valid(_result_modal):
		_result_modal.queue_free()
	if is_instance_valid(_game):
		_game.queue_free()

	_begin()
