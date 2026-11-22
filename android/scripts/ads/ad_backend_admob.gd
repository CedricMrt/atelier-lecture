extends "res://scripts/ads/ad_backend.gd"
## Fournisseur AdMob, via le plugin « AdMob » de Poing Studios (Asset Library de Godot, Godot 4.5 ou plus).
##
## Les classes du plugin (MobileAds, InterstitialAdLoader…) ne sont JAMAIS nommées directement ici :
## on les cherche par leur nom au moment de s'en servir. Ainsi ce fichier se lit sans erreur même quand le plugin
## n'est pas installé (PC, éditeur), et un nom qui changerait dans une version du plugin ne casse qu'un seul endroit :
## les chaînes de caractères ci-dessous (documentation : poingstudios.github.io/godot-admob-plugin).

const AdConfig = preload("res://scripts/data/ad_config.gd")

## Une pub préchargée « périme » après environ une heure : on la jette et on en charge une neuve.
const MAX_AGE_MS := 50 * 60 * 1000
const RETRY_MS := 30 * 1000

var _started := false
var _interstitial: Object = null
var _loading := false
var _loaded_at := 0
var _next_try_at := 0


func start() -> void:
	if _started:
		return

	_started = true

	if AdConfig.interstitial_unit_id().is_empty():
		push_warning("Ads : aucun ID d'unité publicitaire (scripts/data/ad_config.gd) : pas de pub dans cette version.")
		return

	if _script_of("MobileAds") == null:
		push_warning("Ads : classe « MobileAds » introuvable (plugin AdMob activé ?).")
		return

	# Règles « Familles » de Google Play : traitement destiné aux enfants (donc pas de personnalisation), contenu « G ».
	# La doc du plugin déconseille de mettre aussi « under age of consent » à vrai : le premier l'emporte déjà.
	# La configuration est posée AVANT l'initialisation du SDK.
	var configuration: Variant = _new("RequestConfiguration")

	if configuration != null:
		var child_directed: Dictionary = _constant("RequestConfiguration", "TagForChildDirectedTreatment", {})
		configuration.tag_for_child_directed_treatment = child_directed.get("TRUE", 1)
		configuration.max_ad_content_rating = _constant("RequestConfiguration", "MAX_AD_CONTENT_RATING_G", "G")
		_static_call("MobileAds", "set_request_configuration", [configuration])
	else:
		push_warning("Ads : « RequestConfiguration » introuvable : le mode enfants n'a PAS pu être activé, pas de pub.")
		return

	_static_call("MobileAds", "initialize", [])
	_load()


func is_ready() -> bool:
	if _interstitial != null and Time.get_ticks_msec() - _loaded_at > MAX_AGE_MS:
		_discard()

	if _interstitial == null:
		_load()
		return false

	return true


func show_ad() -> void:
	if not is_ready():
		closed.emit()
		return

	var ad: Object = _interstitial
	_interstitial = null

	var content_callback: Variant = _new("FullScreenContentCallback")

	if content_callback == null:
		_finish(ad)
		return

	# Arguments facultatifs : le plugin peut transmettre un objet d'erreur ou rien.
	content_callback.on_ad_dismissed_full_screen_content = func() -> void: _finish(ad)
	content_callback.on_ad_failed_to_show_full_screen_content = func(_error = null) -> void: _finish(ad)
	ad.full_screen_content_callback = content_callback
	ad.show()


func _finish(ad: Object) -> void:
	ad.destroy()
	closed.emit()
	_load()


func _load() -> void:
	if _loading or _interstitial != null:
		return

	if Time.get_ticks_msec() < _next_try_at:
		return

	var loader: Variant = _new("InterstitialAdLoader")
	var load_callback: Variant = _new("InterstitialAdLoadCallback")
	var request: Variant = _new("AdRequest")

	if loader == null or load_callback == null or request == null:
		push_warning("Ads : classes du plugin introuvables (InterstitialAdLoader…) : pas de pub.")
		_next_try_at = Time.get_ticks_msec() + RETRY_MS
		return

	_loading = true
	load_callback.on_ad_loaded = _on_loaded
	load_callback.on_ad_failed_to_load = _on_failed
	loader.load(AdConfig.interstitial_unit_id(), request, load_callback)


func _on_loaded(ad: Object) -> void:
	_loading = false
	_interstitial = ad
	_loaded_at = Time.get_ticks_msec()


func _on_failed(_error = null) -> void:
	_loading = false
	_interstitial = null
	_next_try_at = Time.get_ticks_msec() + RETRY_MS


func _discard() -> void:
	if _interstitial != null:
		_interstitial.destroy()

	_interstitial = null


## Retrouve un script du plugin d'après son nom de classe (« class_name »).
func _script_of(class_name_: String) -> Script:
	for entry in ProjectSettings.get_global_class_list():
		if entry.get("class", "") == class_name_:
			return load(entry.get("path", "")) as Script

	return null


## Crée un objet du plugin (script GDScript, ou classe native si le plugin en fournit).
func _new(class_name_: String) -> Variant:
	var script := _script_of(class_name_)

	if script != null:
		return script.new()

	if ClassDB.class_exists(class_name_):
		return ClassDB.instantiate(class_name_)

	return null


## Lit une constante ou une énumération d'une classe du plugin ; « fallback » si elle n'existe pas.
func _constant(class_name_: String, constant_name: String, fallback: Variant) -> Variant:
	var script := _script_of(class_name_)

	if script != null:
		var constants := script.get_script_constant_map()

		if constants.has(constant_name):
			return constants[constant_name]

	return fallback


## Appelle une fonction « static » d'une classe du plugin.
func _static_call(class_name_: String, method: String, args: Array) -> Variant:
	var script := _script_of(class_name_)

	if script == null:
		return null

	return script.callv(method, args)
