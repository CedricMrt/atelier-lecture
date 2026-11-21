extends RefCounted
## Niveaux adaptatifs et étoiles. Pas de nœud ici : facile à tester.

const Games = preload("res://scripts/data/games.gd")

const LEVEL_UP_ACCURACY := 0.85
const LEVEL_DOWN_ACCURACY := 0.6


static func empty_progress() -> Dictionary:
	return {"level": 1, "plays": 0, "best_stars": 0, "last_played_at": 0}


## On monte si c'est réussi, on descend si c'est trop dur.
static func next_level(current_level: int, accuracy: float) -> int:
	if accuracy >= LEVEL_UP_ACCURACY:
		return mini(Games.MAX_LEVEL, current_level + 1)
	if accuracy < LEVEL_DOWN_ACCURACY:
		return maxi(1, current_level - 1)
	return current_level


## `previous` peut être null (jamais joué). `result` : {game_id, stars, accuracy}.
static func apply_result(previous: Variant, result: Dictionary, now: int) -> Dictionary:
	var base: Dictionary = previous if typeof(previous) == TYPE_DICTIONARY else empty_progress()
	return {
		"level": next_level(int(base["level"]), float(result["accuracy"])),
		"plays": int(base["plays"]) + 1,
		"best_stars": maxi(int(base["best_stars"]), int(result["stars"])),
		"last_played_at": now,
	}
