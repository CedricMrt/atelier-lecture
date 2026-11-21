extends Node
## Publicité avant un jeu : ce nœud ne décide que du MOMENT (voir logic/ad_rules.gd).
## L'état est en mémoire seulement : il repart à zéro à chaque lancement de l'appli,
## donc le tout premier jeu de la session n'a jamais de pub.

const AdRules = preload("res://scripts/logic/ad_rules.gd")

var _state: Dictionary = AdRules.initial_state()


## À appeler quand un jeu va démarrer. Retourne true s'il faut afficher une pub avant.
func should_show_ad_before_game() -> bool:
	var decision: Dictionary = AdRules.decide(_state, Time.get_ticks_msec())
	_state = decision["next"]
	return decision["show"]
