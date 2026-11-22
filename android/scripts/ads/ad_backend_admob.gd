extends "res://scripts/ads/ad_backend.gd"
## Fournisseur AdMob, via le plugin « AdMob » de Poing Studios (Asset Library de Godot, Godot 4.5 ou plus).
##
## ATTENTION : ce fichier utilise les classes du plugin (MobileAds, InterstitialAdLoader…). Il n'est donc chargé
## par l'autoload Ads que si le plugin est installé ET qu'on tourne sur Android. Sans le plugin, il n'est jamais lu.
## Les noms viennent de la documentation du plugin (poingstudios.github.io/godot-admob-plugin) : si Godot signale une erreur sur l'un d'eux à la première
## compilation, c'est ICI qu'il faut le corriger (et nulle part ailleurs).

const AdConfig = preload("res://scripts/data/ad_config.gd")

## Une pub préchargée « périme » après environ une heure : on la jette et on en charge une neuve.
const MAX_AGE_MS := 50 * 60 * 1000
const RETRY_MS := 30 * 1000

var _started := false
var _interstitial: InterstitialAd = null
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

	# Règles « Familles » de Google Play : traitement destiné aux enfants (donc pas de personnalisation), contenu « G ».
	# La doc du plugin déconseille de mettre aussi « under age of consent » à vrai : le premier l'emporte déjà.
	# La configuration est posée AVANT l'initialisation du SDK.
	var configuration := RequestConfiguration.new()
	configuration.tag_for_child_directed_treatment = RequestConfiguration.TagForChildDirectedTreatment.TRUE
	configuration.max_ad_content_rating = RequestConfiguration.MAX_AD_CONTENT_RATING_G
	MobileAds.set_request_configuration(configuration)
	MobileAds.initialize()

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

	var ad := _interstitial
	_interstitial = null

	var content_callback := FullScreenContentCallback.new()
	# Arguments facultatifs : le plugin peut transmettre un objet d'erreur ou rien.
	content_callback.on_ad_dismissed_full_screen_content = func() -> void: _finish(ad)
	content_callback.on_ad_failed_to_show_full_screen_content = func(_error = null) -> void: _finish(ad)
	ad.full_screen_content_callback = content_callback
	ad.show()


func _finish(ad: InterstitialAd) -> void:
	ad.destroy()
	closed.emit()
	_load()


func _load() -> void:
	if _loading or _interstitial != null:
		return

	if Time.get_ticks_msec() < _next_try_at:
		return

	_loading = true

	var load_callback := InterstitialAdLoadCallback.new()
	load_callback.on_ad_loaded = _on_loaded
	load_callback.on_ad_failed_to_load = _on_failed
	InterstitialAdLoader.new().load(AdConfig.interstitial_unit_id(), AdRequest.new(), load_callback)


func _on_loaded(ad: InterstitialAd) -> void:
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
