extends RefCounted
## Logique de « Chasse aux fantômes », sans nœud : facile à tester.
## Les sons utilisés sont ceux qui ont déjà un enregistrement MP3 dans assets/voix/.
## Niveau 1 : reconnaître une syllabe entendue (un des pièges ressemble à la syllabe).
## Niveau 2 : choisir un mot dans lequel on entend le son.
## Niveau 3 : choisir le mot où le son est au début, au milieu ou à la fin.

const SYLLABLES := ["ma", "mi", "mou", "pa", "pi", "po", "ta", "ti", "tou", "tan", "tin", "ton"]

## Sons qui ont la phrase « Trouve le mot dans lequel tu entends le son “x”. » enregistrée.
const SOUNDS := ["a", "i", "o", "u", "é", "ou", "ch", "f", "s"]

## Sons du niveau 3 qui ont leurs phrases de position enregistrées.
## Pour en ajouter : enregistrer les phrases, puis ajouter une ligne ici.
const POSITION_SOUNDS := {
	"ou": ["début", "milieu", "fin"],
}

## Mot -> sons entendus et leur place (« multi » : le son revient plusieurs fois dans le mot).
## C'est la prononciation qui compte, pas l'écriture : « soupe » contient le son ou, pas o ni u.
const WORD_SOUNDS := {
	"chat": {"ch": "début", "a": "fin"},
	"chou": {"ch": "début", "ou": "fin"},
	"sac": {"s": "début", "a": "milieu"},
	"soupe": {"s": "début", "ou": "milieu"},
	"souris": {"s": "début", "ou": "milieu", "i": "fin"},
	"fourmi": {"f": "début", "ou": "milieu", "i": "fin"},
	"fusée": {"f": "début", "u": "milieu", "é": "fin"},
	"cube": {"u": "milieu"},
	"lune": {"u": "milieu"},
	"mur": {"u": "milieu"},
	"loup": {"ou": "fin"},
	"roue": {"ou": "fin"},
	"mouton": {"ou": "milieu"},
	"poule": {"ou": "milieu"},
	"tabouret": {"a": "milieu", "ou": "milieu", "é": "fin"},
	"ours": {"ou": "début", "s": "fin"},
	"lit": {"i": "fin"},
	"riz": {"i": "fin"},
	"tigre": {"i": "milieu"},
	"lapin": {"a": "milieu"},
	"lac": {"a": "milieu"},
	"rat": {"a": "fin"},
	"balai": {"a": "milieu"},
	"vase": {"a": "milieu"},
	"radio": {"a": "milieu", "i": "milieu", "o": "fin"},
	"robe": {"o": "milieu"},
	"robot": {"o": "multi"},
	"moto": {"o": "multi"},
	"pomme": {"o": "milieu"},
	"bol": {"o": "milieu"},
	"sofa": {"s": "début", "o": "milieu", "f": "milieu", "a": "fin"},
	"pizza": {"i": "milieu", "a": "fin"},
	"kiwi": {"i": "multi"},
	"lama": {"a": "multi"},
	"vélo": {"é": "milieu", "o": "fin"},
}

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


## Un élément au hasard, différent du précédent quand c'est possible.
static func _pick_other(pool: Array, previous: String, rng: RandomNumberGenerator) -> String:
	var mixed := shuffled(pool, rng)

	for item in mixed:
		if str(item) != previous:
			return str(item)

	return str(mixed[0])


static func make_round(level: int, rng: RandomNumberGenerator, previous: String = "") -> Dictionary:
	if level <= 1:
		return _syllable_round(rng, previous)

	if level == 2:
		return _sound_round(rng, previous)

	return _position_round(rng, previous)


static func _build(mode: String, key: String, prompt: String, spoken: String, display: String, correct: String, others: Array, rng: RandomNumberGenerator) -> Dictionary:
	var options: Array = [correct]
	options.append_array(others)
	options = shuffled(options, rng)
	return {
		"mode": mode,
		"key": key,
		"prompt": prompt,
		"spoken": spoken,
		"display": display,
		"options": options,
		"correct_index": options.find(correct),
	}


## Niveau 1 : une syllabe proche (même première lettre) parmi les pièges, les autres sont différentes.
static func _syllable_round(rng: RandomNumberGenerator, previous: String) -> Dictionary:
	var target := _pick_other(SYLLABLES, previous, rng)
	var same: Array = []
	var other: Array = []

	for syllable in SYLLABLES:
		if syllable == target:
			continue

		if syllable.substr(0, 1) == target.substr(0, 1):
			same.append(syllable)
		else:
			other.append(syllable)

	same = shuffled(same, rng)
	other = shuffled(other, rng)

	var others: Array = same.slice(0, 1)

	for syllable in other:
		if others.size() >= 3:
			break

		others.append(syllable)

	for syllable in same.slice(1):
		if others.size() >= 3:
			break

		others.append(syllable)

	return _build("syllabe", target, "Touche le fantôme de la syllabe entendue.", target, target, target, others, rng)


## Niveau 2 : le mot qui contient le son, parmi des mots qui ne le contiennent pas.
static func _sound_round(rng: RandomNumberGenerator, previous: String) -> Dictionary:
	var sound := _pick_other(SOUNDS, previous, rng)
	var with_sound: Array = []
	var without_sound: Array = []

	for word in WORD_SOUNDS:
		var info: Dictionary = WORD_SOUNDS[word]

		if info.has(sound):
			with_sound.append(word)
		else:
			without_sound.append(word)

	if with_sound.is_empty() or without_sound.size() < 3:
		return _syllable_round(rng, previous)

	var correct: String = str(shuffled(with_sound, rng)[0])
	var spoken := "Trouve le mot dans lequel tu entends le son “%s”." % sound
	return _build("son", sound, "Touche le fantôme dont le mot contient le son.", spoken, sound, correct, shuffled(without_sound, rng).slice(0, 3), rng)


static func position_sentence(sound: String, position: String) -> String:
	if position == "début":
		return "Trouve le mot qui commence par le son « %s »." % sound

	if position == "fin":
		return "Trouve le mot qui se termine par le son « %s »." % sound

	return "Trouve le mot dans lequel tu entends le son « %s » au milieu." % sound


## Niveau 3 : le mot où le son est à la bonne place ; les pièges ont le son ailleurs ou pas du tout.
static func _position_round(rng: RandomNumberGenerator, previous: String) -> Dictionary:
	var pairs: Array = []

	for sound in POSITION_SOUNDS:
		for position in POSITION_SOUNDS[sound]:
			pairs.append("%s|%s" % [sound, position])

	var pair := _pick_other(pairs, previous, rng)
	var sound: String = pair.get_slice("|", 0)
	var position: String = pair.get_slice("|", 1)
	var correct_words: Array = []
	var wrong_place: Array = []
	var absent: Array = []

	for word in WORD_SOUNDS:
		var info: Dictionary = WORD_SOUNDS[word]

		if not info.has(sound):
			absent.append(word)
		elif info[sound] == position:
			correct_words.append(word)
		elif info[sound] != "multi":
			wrong_place.append(word)

	if correct_words.is_empty() or wrong_place.size() < 2 or absent.is_empty():
		return _sound_round(rng, "")

	var correct: String = str(shuffled(correct_words, rng)[0])
	wrong_place = shuffled(wrong_place, rng)
	absent = shuffled(absent, rng)

	var others: Array = wrong_place.slice(0, 2)
	others.append(absent[0])

	var phrase: String = POSITION_PHRASES[position]
	return _build("position", pair, "Le son est %s du mot." % phrase, position_sentence(sound, position), "%s (%s)" % [sound, position], correct, others, rng)


static func make_rounds(level: int, count: int, rng: RandomNumberGenerator = null) -> Array:
	if rng == null:
		rng = RandomNumberGenerator.new()
		rng.randomize()

	var rounds: Array = []
	var previous := ""

	for i in count:
		var item := make_round(level, rng, previous)
		previous = str(item.get("key", ""))
		rounds.append(item)

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
