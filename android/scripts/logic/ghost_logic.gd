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
## Une position sans mot valable est ignorée (c'est le cas de « in » au milieu).
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
## (Au niveau 2 la place n'est pas utilisée : seule compte la présence du son.)
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
## La place d'un son est calculée sur les syllabes écrites du mot (avec le « e » muet final) :
##   « début » : le mot commence par ce son (ouragan, chocolat, samedi…) ;
##   « fin » : le mot finit par ce son (caribou, pantalon…) ;
##   « milieu » : le son est dans une syllabe du milieu (ta-BOU-ret, bi-JOU-tier…) ;
##   « multi » : le son revient dans le mot, ou sa place est ambiguë (dans la 1re syllabe sans
##   être au tout début : BOU-langer, SYM-pathique ; ou au début de la dernière syllabe sans
##   finir le mot). Un mot « multi » n'est jamais choisi pour ce son, ni comme réponse ni comme piège.
const LONG_WORD_SOUNDS := {
	"ouragan": {"a": "milieu", "ou": "début", "an": "fin"},
	"oublier": {"i": "milieu", "é": "fin", "ou": "début"},
	"ouvrier": {"i": "milieu", "é": "fin", "ou": "début"},
	"ouverture": {"u": "milieu", "ou": "début"},
	"tabouret": {"a": "multi", "ou": "milieu"},
	"bijoutier": {"i": "multi", "é": "fin", "ou": "milieu"},
	"boulanger": {"é": "fin", "ou": "multi", "an": "milieu"},
	"fourmilière": {"i": "milieu", "ou": "multi", "f": "début"},
	"tourterelle": {"ou": "multi"},
	"souterrain": {"ou": "multi", "s": "début", "in": "fin"},
	"poulailler": {"a": "milieu", "é": "fin", "ou": "multi"},
	"couverture": {"u": "milieu", "ou": "multi"},
	"caribou": {"a": "multi", "i": "milieu", "ou": "fin"},
	"marabout": {"a": "multi", "ou": "fin"},
	"rendez-vous": {"é": "milieu", "ou": "fin", "an": "multi"},
	"chocolat": {"a": "fin", "o": "multi", "ch": "début"},
	"chevalier": {"a": "milieu", "é": "fin", "ch": "début"},
	"samedi": {"a": "multi", "i": "fin", "s": "début"},
	"salopette": {"a": "multi", "o": "milieu", "s": "début"},
	"radio": {"a": "multi", "i": "multi", "o": "fin"},
	"vidéo": {"i": "multi", "o": "fin", "é": "milieu"},
	"cinéma": {"a": "fin", "i": "multi", "é": "milieu", "s": "début"},
	"aventure": {"a": "début", "u": "milieu", "an": "milieu"},
	"confiture": {"i": "milieu", "u": "milieu", "f": "milieu", "on": "multi"},
	"fenêtre": {"f": "début"},
	"ordinateur": {"a": "milieu", "i": "milieu", "o": "début"},
	"tomate": {"a": "milieu", "o": "multi"},
	"banane": {"a": "multi"},
	"papillon": {"a": "multi", "i": "milieu", "on": "fin"},
	"éléphant": {"é": "multi", "f": "multi", "an": "fin"},
	"dinosaure": {"i": "multi", "o": "multi", "s": "multi"},
	"ananas": {"a": "multi"},
	"animal": {"a": "multi", "i": "milieu"},
	"enveloppe": {"o": "milieu", "an": "début"},
	"entonnoir": {"o": "milieu", "an": "début"},
	"ensoleillé": {"o": "milieu", "é": "fin", "s": "milieu", "an": "début"},
	"enregistrer": {"i": "milieu", "é": "fin", "an": "début"},
	"mandarine": {"a": "milieu", "i": "milieu", "an": "multi"},
	"dentifrice": {"i": "multi", "f": "milieu", "s": "fin", "an": "multi"},
	"pantalon": {"a": "milieu", "an": "multi", "on": "fin"},
	"inventeur": {"an": "milieu", "in": "début"},
	"tambourin": {"ou": "milieu", "an": "multi", "in": "fin"},
	"restaurant": {"o": "milieu", "s": "multi", "an": "fin"},
	"pélican": {"i": "milieu", "é": "multi", "an": "fin"},
	"intérieur": {"é": "milieu", "in": "début"},
	"infirmière": {"i": "milieu", "f": "milieu", "in": "début"},
	"imprimante": {"i": "milieu", "an": "milieu", "in": "début"},
	"sympathique": {"a": "milieu", "i": "milieu", "s": "début", "in": "multi"},
	"lingerie": {"i": "fin", "in": "multi"},
	"singerie": {"i": "fin", "s": "début", "in": "multi"},
	"médecin": {"é": "multi", "s": "multi", "in": "fin"},
	"magasin": {"a": "multi", "in": "fin"},
	"écrivain": {"i": "milieu", "é": "début", "in": "fin"},
	"réponse": {"é": "multi", "s": "fin", "on": "milieu"},
	"répondeur": {"é": "multi", "on": "milieu"},
	"montgolfière": {"o": "milieu", "f": "milieu", "on": "multi"},
	"conducteur": {"u": "milieu", "on": "multi"},
	"hirondelle": {"i": "début", "on": "milieu"},
	"hérisson": {"i": "milieu", "é": "début", "s": "multi", "on": "fin"},
	"cornichon": {"i": "milieu", "o": "multi", "ch": "multi", "on": "fin"},
	"champignon": {"i": "milieu", "ch": "début", "an": "multi", "on": "fin"},
	"machine": {"a": "multi", "i": "milieu", "ch": "milieu"},
	"cheminée": {"i": "milieu", "é": "fin", "ch": "début"},
	"pantoufle": {"ou": "milieu", "f": "multi", "an": "multi"},
	"citrouille": {"i": "multi", "ou": "milieu", "s": "début"},
	"épouvantail": {"a": "multi", "é": "début", "ou": "milieu", "an": "milieu"},
	"chatouiller": {"a": "multi", "é": "fin", "ou": "milieu", "ch": "début"},
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
	var spoken := sound_sentence(sound)
	return _build("son", sound, "Touche le fantôme dont le mot contient le son.", spoken, sound, correct, shuffled(without_sound, rng).slice(0, 3), rng)


## La phrase dite au niveau 2 (elle a son MP3 dans assets/voix/).
static func sound_sentence(sound: String) -> String:
	return "Trouve le mot dans lequel tu entends le son “%s”." % sound


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
