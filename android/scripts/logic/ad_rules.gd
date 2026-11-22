extends RefCounted
## Règles d'affichage de la publicité avant un jeu.
##
## Contraintes Google Play « Familles » : pas de pub à l'ouverture de l'appli,
## pas en plein jeu, fermable facilement, une seule à la fois, et jamais trop
## souvent. Ce module décide QUE du moment ; l'affichage réel est dans
## autoload/ads.gd et ads/ad_backend_admob.gd.

const GAMES_BETWEEN_ADS := 3
const MIN_MS_BETWEEN_ADS := 3 * 60 * 1000


static func initial_state() -> Dictionary:
	# last_ad_at = -1 : aucune pub depuis le lancement de l'appli.
	return {"games_since_ad": 0, "last_ad_at": -1}


## Appelé quand un jeu va démarrer. Retourne {show, next}.
static func decide(state: Dictionary, now_ms: int) -> Dictionary:
	var games_since_ad: int = int(state["games_since_ad"]) + 1
	var last_ad_at: int = int(state["last_ad_at"])

	var enough_games: bool = games_since_ad > GAMES_BETWEEN_ADS
	var enough_time: bool = last_ad_at < 0 or now_ms - last_ad_at >= MIN_MS_BETWEEN_ADS

	if enough_games and enough_time:
		return {"show": true, "next": {"games_since_ad": 0, "last_ad_at": now_ms}}

	return {"show": false, "next": {"games_since_ad": games_since_ad, "last_ad_at": last_ad_at}}
