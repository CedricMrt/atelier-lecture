extends Control
## Racine de l'appli : affiche un écran à la fois
## (Démarrage → [Bienvenue, la 1re fois] → Qui joue ? → Accueil → Jeu).

const Ui = preload("res://scripts/ui/ui.gd")
const Splash = preload("res://scripts/screens/splash.gd")
const Welcome = preload("res://scripts/screens/welcome.gd")
const WhoPlays = preload("res://scripts/screens/who_plays.gd")
const Home = preload("res://scripts/screens/home.gd")
const GameHost = preload("res://scripts/screens/game_host.gd")

var _current: Control = null


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var background := Ui.sky()
	add_child(background)
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	_show_splash()


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if is_instance_valid(_current) and _current.has_method("on_back"):
			_current.on_back()


func _show(screen: Control) -> void:
	if is_instance_valid(_current):
		_current.queue_free()

	_current = screen
	add_child(screen)

	# Fondu d'entrée : les écrans ne « claquent » pas.
	screen.modulate.a = 0.0
	screen.create_tween().tween_property(screen, "modulate:a", 1.0, 0.2)


func _show_splash() -> void:
	var screen := Splash.new()
	screen.finished.connect(_after_splash)
	_show(screen)


## La bienvenue (pour les adultes) n'est montrée qu'au tout premier lancement.
func _after_splash() -> void:
	# Le SDK publicitaire démarre ici, après le chargement, jamais pendant l'écran de démarrage.
	Ads.start()

	if Settings.welcome_seen:
		_show_who_plays()
	else:
		_show_welcome()


func _show_welcome() -> void:
	var screen := Welcome.new()
	screen.done.connect(_show_who_plays)
	_show(screen)


func _show_who_plays() -> void:
	var screen := WhoPlays.new()
	screen.selected.connect(_show_home)
	_show(screen)


func _show_home(profile_id: String) -> void:
	var screen := Home.new()
	screen.setup(profile_id)
	screen.play.connect(_show_game.bind(profile_id))
	screen.change_player.connect(_show_who_plays)
	_show(screen)


func _show_game(game_id: String, profile_id: String) -> void:
	var screen := GameHost.new()
	screen.setup(profile_id, game_id)
	screen.exited.connect(_show_home.bind(profile_id))
	_show(screen)
