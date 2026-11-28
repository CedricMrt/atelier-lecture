extends Control
## Racine de l'appli : affiche un écran à la fois
## (Démarrage → Qui joue ? → Accueil → Jeu).

const Ui = preload("res://scripts/ui/ui.gd")
const Splash = preload("res://scripts/screens/splash.gd")
const WhoPlays = preload("res://scripts/screens/who_plays.gd")
const Home = preload("res://scripts/screens/home.gd")
const GameHost = preload("res://scripts/screens/game_host.gd")
const Outfit = preload("res://scripts/logic/avatar_outfit.gd")

var _current: Control = null


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	# Les accessoires des personnages (cape, casque, chapeau…) sont masqués partout, dans tous les jeux.
	get_tree().node_added.connect(_on_node_added)

	var background := Ui.sky()
	add_child(background)
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	_show_splash()


func _on_node_added(node: Node) -> void:
	if Outfit.HIDE_ALL and node is MeshInstance3D and Outfit.is_accessory(String(node.name)):
		node.visible = false


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


func _after_splash() -> void:
	# Le SDK publicitaire démarre ici, après le chargement, jamais pendant l'écran de démarrage.
	Ads.start()
	_show_who_plays()


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
