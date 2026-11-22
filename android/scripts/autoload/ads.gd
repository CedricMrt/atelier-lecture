extends Node
## Publicité avant un jeu. Ce nœud décide du MOMENT (règles dans logic/ad_rules.gd) et pilote le fournisseur.
## L'état est en mémoire seulement : il repart à zéro à chaque lancement de l'appli,
## donc le tout premier jeu de la session n'a jamais de pub.
##
## Fournisseurs :
##   - Android + plugin AdMob installé : vraie pub (scripts/ads/ad_backend_admob.gd), en mode « enfants » ;
##   - sinon, en développement seulement (éditeur, export avec debug) : fenêtre de simulation ;
##   - sinon (version publiée sans pub prête) : aucune pub, le jeu démarre directement.

const AdRules = preload("res://scripts/logic/ad_rules.gd")
const AdPlaceholder = preload("res://scripts/ui/ad_placeholder.gd")

const BACKEND_SCRIPT := "res://scripts/ads/ad_backend_admob.gd"
const PLUGIN_CLASS := "MobileAds"

var _state: Dictionary = AdRules.initial_state()
var _backend: Node = null
var _started := false


## À appeler une fois, quand l'écran de démarrage est fini (pas pendant le chargement).
func start() -> void:
	if _started:
		return

	_started = true

	if not OS.has_feature("android"):
		return

	if not _plugin_installed():
		push_warning("Ads : plugin AdMob absent (voir store/ads-setup.md) : pas de vraie pub.")
		return

	var script := load(BACKEND_SCRIPT) as Script

	if script == null or not script.can_instantiate():
		push_warning("Ads : %s ne se charge pas (erreur de script ?)." % BACKEND_SCRIPT)
		return

	_backend = script.new()
	add_child(_backend)
	_backend.start()


## À appeler (avec await) quand un jeu va démarrer. Rend la main quand le jeu peut commencer.
func show_before_game(parent: Control) -> void:
	var previous := _state
	var decision: Dictionary = AdRules.decide(_state, Time.get_ticks_msec())
	_state = decision["next"]

	if not decision["show"]:
		return

	if _backend != null:
		if _backend.is_ready():
			_backend.show_ad()
			await _backend.closed
			return

		# Pas de pub prête (pas de réseau, chargement en cours) : on ne perd pas le tour, ce sera pour une prochaine fois.
		_state = previous
		return

	if OS.is_debug_build():
		var placeholder := AdPlaceholder.new()
		parent.add_child(placeholder)
		await placeholder.closed
		return

	_state = previous


## Le plugin ajoute ses classes (MobileAds…) : on regarde si elles existent, sans jamais les nommer dans du code compilé ici.
func _plugin_installed() -> bool:
	if ClassDB.class_exists(PLUGIN_CLASS):
		return true

	for entry in ProjectSettings.get_global_class_list():
		if entry.get("class", "") == PLUGIN_CLASS:
			return true

	return false
