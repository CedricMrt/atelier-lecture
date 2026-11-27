extends RefCounted
## Logique de « Chasse aux fantômes », sans nœud : facile à tester.
## Les sons utilisés sont ceux qui ont déjà un enregistrement MP3 dans assets/voix/.
## Niveau 1 : reconnaître une syllabe entendue (un des pièges ressemble à la syllabe).
## Niveau 2 : choisir un mot dans lequel on entend le son.
## Niveau 3 : choisir le mot (3 syllabes ou plus) où le son, qui n'y est qu'une fois,
## est au début, au milieu ou à la fin.

const SYLLABLES := ["ma", "mi", "mou", "pa", "pi", "po", "ta", "ti", "tou", "tan", "tin", "ton"]

## Sons qui ont la phrase « Trouve le mot dans lequel tu entends le son “x”. » enregistrée.
const SOUNDS := ["a", "i", "o", "u", "é", "ou", "ch", "f", "s", "an", "in", "on"]

## Niveau 3 : pour chaque son, les positions qui ont leur phrase enregistrée.
## Pour en ajouter : enregistrer la phrase, puis ajouter la position ici.
const POSITION_SOUNDS := {
	"ou": ["début", "milieu", "fin"],
	"an": ["début", "milieu", "fin"],
	"in": ["début", "milieu", "fin"],
	"on": ["milieu", "fin"],
	"ch": ["début"],
	"s": ["début"],
	"f": ["début"],
	"a": ["milieu", "fin"],
	"u": ["milieu"],
	"i": ["fin"],
	"o": ["fin"],
	"é": ["fin"],
}

## Niveau 2. Mot -> sons entendus et leur place (« multi » : le son revient plusieurs fois).
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
	"mouton": {"ou": "milieu", "on": "fin"},
	"poule": {"ou": "milieu"},
	"tabouret": {"a": "milieu", "ou": "milieu"},
	"ours": {"ou": "début", "s": "fin"},
	"lit": {"i": "fin"},
	"riz": {"i": "fin"},
	"tigre": {"i": "milieu"},
	"lapin": {"a": "milieu", "in": "fin"},
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
	"dent": {"an": "fin"},
	"vent": {"an": "fin"},
	"banc": {"an": "fin"},
	"maman": {"a": "milieu", "an": "fin"},
	"tente": {"an": "milieu"},
	"jardin": {"a": "milieu", "in": "fin"},
	"pain": {"in": "fin"},
	"main": {"in": "fin"},
	"singe": {"s": "début", "in": "milieu"},
	"ballon": {"a": "milieu", "on": "fin"},
	"citron": {"s": "début", "i": "milieu", "on": "fin"},
	"maison": {"on": "fin"},
}

## Niveau 3 : uniquement des mots de 3 syllabes ou plus (bonnes réponses et pièges).
## Les sons qui reviennent dans le mot, ou dont la prononciation est ambiguë, sont marqués
## « multi » : ils ne sont jamais choisis pour ce son.
const LONG_WORD_SOUNDS := {
	"ouragan": {"ou": "début", "a": "milieu", "an": "fin"},
	"oublier": {"ou": "début", "i": "milieu", "é": "fin"},
	"ouvrier": {"ou": "début", "i": "milieu", "é": "fin"},
	"ouverture": {"ou": "début", "u": "milieu"},
	"tabouret": {"a": "milieu", "ou": "milieu"},
	"bijoutier": {"i": "milieu", "ou": "milieu", "é": "fin"},
	"boulanger": {"ou": "milieu", "an": "milieu", "é": "fin"},
	"fourmilière": {"f": "début", "ou": "milieu", "i": "milieu"},
	"tourterelle": {"ou": "milieu"},
	"souterrain": {"s": "début", "ou": "milieu", "in": "fin"},
	"poulailler": {"ou": "milieu", "a": "milieu", "é": "fin"},
	"couverture": {"ou": "milieu", "u": "milieu"},
	"caribou": {"a": "milieu", "i": "milieu", "ou": "fin"},
	"marabout": {"a": "multi", "ou": "fin"},
	"rendez-vous": {"an": "début", "é": "milieu", "ou": "fin"},
	"chocolat": {"ch": "début", "o": "multi", "a": "fin"},
	"chevalier": {"ch": "début", "a": "milieu", "é": "fin"},
	"samedi": {"s": "début", "a": "milieu", "i": "fin"},
	"salopette": {"s": "début", "a": "milieu", "o": "milieu"},
	"radio": {"a": "milieu", "i": "multi", "o": "fin"},
	"vidéo": {"i": "milieu", "é": "milieu", "o": "fin"},
	"cinéma": {"s": "début", "i": "milieu", "é": "milieu", "a": "fin"},
	"aventure": {"a": "début", "an": "milieu", "u": "milieu"},
	"confiture": {"on": "milieu", "f": "milieu", "i": "milieu", "u": "milieu"},
	"fenêtre": {"f": "début"},
	"ordinateur": {"o": "début", "i": "milieu", "a": "milieu"},
	"tomate": {"o": "milieu", "a": "milieu"},
	"banane": {"a": "multi"},
	"papillon": {"a": "milieu", "i": "milieu", "on": "fin"},
	"éléphant": {"é": "multi", "f": "milieu", "an": "fin"},
	"dinosaure": {"i": "milieu", "o": "multi"},
	"ananas": {"a": "multi"},
	"animal": {"a": "multi", "i": "milieu"},
	"enveloppe": {"an": "début", "o": "milieu"},
	"entonnoir": {"an": "début", "o": "milieu"},
	"ensoleillé": {"an": "début", "s": "milieu", "o": "milieu", "é": "fin"},
	"enregistrer": {"an": "début", "i": "milieu", "é": "fin"},
	"mandarine": {"an": "milieu", "a": "milieu", "i": "milieu"},
	"dentifrice": {"an": "milieu", "i": "multi", "f": "milieu", "s": "fin"},
	"pantalon": {"an": "milieu", "a": "milieu", "on": "fin"},
	"inventeur": {"in": "début", "an": "milieu"},
	"tambourin": {"an": "milieu", "ou": "milieu", "in": "fin"},
	"restaurant": {"s": "milieu", "o": "milieu", "an": "fin"},
	"pélican": {"é": "milieu", "i": "milieu", "an": "fin"},
	"intérieur": {"in": "début", "é": "milieu"},
	"infirmière": {"in": "début", "f": "milieu", "i": "milieu"},
	"sympathique": {"s": "début", "in": "milieu", "a": "milieu", "i": "milieu"},
	"lingerie": {"in": "milieu", "i": "fin"},
	"singerie": {"s": "début", "in": "milieu", "i": "fin"},
	"médecin": {"é": "milieu", "s": "milieu", "in": "fin"},
	"magasin": {"a": "multi", "in": "fin"},
	"écrivain": {"é": "début", "i": "milieu", "in": "fin"},
	"réponse": {"é": "milieu", "on": "milieu", "s": "fin"},
	"montgolfière": {"on": "milieu", "o": "milieu", "f": "milieu"},
	"conducteur": {"on": "milieu", "u": "milieu"},
	"hirondelle": {"i": "début", "on": "milieu"},
	"hérisson": {"é": "début", "i": "milieu", "s": "milieu", "on": "fin"},
	"cornichon": {"o": "milieu", "i": "milieu", "ch": "milieu", "on": "fin"},
	"champignon": {"ch": "début", "an": "milieu", "i": "milieu", "on": "fin"},
	"machine": {"a": "milieu", "ch": "milieu", "i": "milieu"},
	"cheminée": {"ch": "début", "i": "milieu", "é": "fin"},
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


## Les mots longs où le son est, une seule fois, à cette place.
static func _words_at(sound: String, position: String) -> Array:
	var found: Array = []

	for word in LONG_WORD_SOUNDS:
		var info: Dictionary = LONG_WORD_SOUNDS[word]

		if info.has(sound) and info[sound] == position:
			found.append(word)

	return found


## Niveau 3 : le mot (3 syllabes ou plus) où le son est à la bonne place, une seule fois ;
## les pièges ont le son une seule fois ailleurs, ou pas du tout.
static func _position_round(rng: RandomNumberGenerator, previous: String) -> Dictionary:
	var pairs: Array = []

	for entry in POSITION_SOUNDS:
		for pos in POSITION_SOUNDS[entry]:
			if not _words_at(entry, pos).is_empty():
				pairs.append("%s|%s" % [entry, pos])

	if pairs.is_empty():
		return _sound_round(rng, "")

	var pair := _pick_other(pairs, previous, rng)
	var sound: String = pair.get_slice("|", 0)
	var position: String = pair.get_slice("|", 1)
	var wrong_place: Array = []
	var absent: Array = []

	for word in LONG_WORD_SOUNDS:
		var info: Dictionary = LONG_WORD_SOUNDS[word]

		if not info.has(sound):
			absent.append(word)
		elif info[sound] != "multi" and info[sound] != position:
			wrong_place.append(word)

	var correct: String = str(shuffled(_words_at(sound, position), rng)[0])
	wrong_place = shuffled(wrong_place, rng)
	absent = shuffled(absent, rng)

	var others: Array = wrong_place.slice(0, 2)

	for word in absent:
		if others.size() >= 3:
			break

		others.append(word)

	if others.size() < 3:
		return _sound_round(rng, "")

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
