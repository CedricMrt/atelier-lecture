extends RefCounted
## Logique de « Chasse aux fantômes », sans nœud : facile à tester.
## Niveau 1 : reconnaître une syllabe entendue.
## Niveau 2 : choisir un mot qui contient le son entendu.
## Niveau 3 : choisir le mot où le son est au début, au milieu ou à la fin
## (pièges : même son mal placé, ou son absent).

const SYLLABLES := ["ma", "pa", "ta", "la", "sa", "na", "ra", "da", "ba", "ga"]
const SOUNDS := ["a", "e", "i", "o", "u", "l", "m", "r", "s", "t"]
const WORDS := [
	"lune", "robe", "vase", "cube", "moto", "kiwi", "lama", "sofa",
	"lapin", "radio", "balai", "pomme", "fusée", "robot", "tigre", "pizza",
]
const POSITION_PHRASES := {
	"début": "au début",
	"milieu": "au milieu",
	"fin": "à la fin",
}


static func shuffled(items: Array, rng: RandomNumberGenerator) -> Array:
	var copy := items.duplicate()

	for i in range(copy.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = copy[i]
		copy[i] = copy[j]
		copy[j] = tmp

	return copy


static func make_round(level: int, rng: RandomNumberGenerator) -> Dictionary:
	if level <= 1:
		return _syllable_round(rng)

	if level == 2:
		return _sound_round(rng)

	return _position_round(rng)


static func _build(mode: String, prompt: String, spoken: String, correct: String, others: Array, rng: RandomNumberGenerator) -> Dictionary:
	var options: Array = [correct]
	options.append_array(others)
	options = shuffled(options, rng)
	return {
		"mode": mode,
		"prompt": prompt,
		"spoken": spoken,
		"options": options,
		"correct_index": options.find(correct),
	}


static func _syllable_round(rng: RandomNumberGenerator) -> Dictionary:
	var pool := shuffled(SYLLABLES, rng)
	return _build("syllabe", "Touche le fantôme de la syllabe entendue.", pool[0], pool[0], pool.slice(1, 4), rng)


static func _sound_round(rng: RandomNumberGenerator) -> Dictionary:
	var sound: String = SOUNDS[rng.randi() % SOUNDS.size()]
	var with_sound: Array = []
	var without_sound: Array = []

	for word in WORDS:
		if word.contains(sound):
			with_sound.append(word)
		else:
			without_sound.append(word)

	if with_sound.is_empty() or without_sound.size() < 3:
		return _syllable_round(rng)

	var correct: String = shuffled(with_sound, rng)[0]
	return _build("son", "Touche le fantôme dont le mot contient le son.", "Trouve le mot qui contient le son %s." % sound, correct, shuffled(without_sound, rng).slice(0, 3), rng)


static func position_of(word: String, sound: String) -> String:
	var index := word.find(sound)

	if index == 0:
		return "début"

	if index == word.length() - sound.length():
		return "fin"

	return "milieu"


static func _position_round(rng: RandomNumberGenerator) -> Dictionary:
	var sound: String = SOUNDS[rng.randi() % SOUNDS.size()]
	var target: String = ["début", "milieu", "fin"][rng.randi() % 3]
	var correct := ""
	var wrong_place: Array = []
	var absent: Array = []

	# Seuls les mots où le son apparaît une seule fois sont utilisés : pas d'ambiguïté.
	for word in shuffled(WORDS, rng):
		var count: int = word.count(sound)

		if count == 0:
			absent.append(word)
		elif count == 1:
			if position_of(word, sound) == target:
				if correct == "":
					correct = word
			else:
				wrong_place.append(word)

	if correct == "" or wrong_place.is_empty() or absent.is_empty():
		return _sound_round(rng)

	var others: Array = wrong_place.slice(0, 2)
	others.append(absent[0])

	for word in wrong_place.slice(2):
		if others.size() >= 3:
			break

		others.append(word)

	for word in absent.slice(1):
		if others.size() >= 3:
			break

		others.append(word)

	if others.size() < 3:
		return _sound_round(rng)

	var spoken := "Trouve le mot où l'on entend le son %s %s." % [sound, POSITION_PHRASES[target]]
	return _build("position", "Le son est %s du mot." % POSITION_PHRASES[target], spoken, correct, others, rng)


static func make_rounds(level: int, count: int, rng: RandomNumberGenerator = null) -> Array:
	if rng == null:
		rng = RandomNumberGenerator.new()
		rng.randomize()

	var rounds: Array = []

	for i in count:
		rounds.append(make_round(level, rng))

	return rounds


static func accuracy_from(correct: int, errors: int) -> float:
	if correct + errors <= 0:
		return 0.0

	return float(correct) / float(correct + errors)


static func stars_from_errors(errors: int) -> int:
	if errors <= 1:
		return 3

	if errors <= 3:
		return 2

	return 1
