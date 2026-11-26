extends RefCounted
## Logique du « Pont du volcan », sans nœud : facile à tester.
## Image-indice : si le fichier res://assets/images/words/<mot>.png existe,
## il sera affiché pendant le jeu.

# `spoken` (facultatif) : écriture pour la synthèse vocale si elle prononce mal le mot.
const WORDS := [
	# Niveau 1 : 3 lettres
	{"word": "lit", "level": 1},
	{"word": "rat", "level": 1},
	{"word": "bol", "level": 1},
	{"word": "sac", "level": 1},
	{"word": "mur", "level": 1},
	{"word": "lac", "level": 1},
	{"word": "riz", "level": 1},
	# Niveau 2 : 4 lettres
	{"word": "lune", "level": 2},
	{"word": "robe", "level": 2},
	{"word": "vase", "level": 2},
	{"word": "cube", "level": 2},
	{"word": "moto", "level": 2},
	{"word": "kiwi", "level": 2},
	{"word": "lama", "level": 2},
	{"word": "sofa", "level": 2},
	# Niveau 3 : 5 lettres
	{"word": "lapin", "level": 3},
	{"word": "radio", "level": 3},
	{"word": "balai", "level": 3},
	{"word": "pomme", "level": 3},
	{"word": "fusée", "level": 3},
	{"word": "robot", "level": 3},
	{"word": "tigre", "level": 3},
	{"word": "zèbre", "level": 3},
	{"word": "pizza", "level": 3},
]

# Lettres qui se ressemblent par la forme ou par le son : ce sont les pièges.
const CONFUSABLE := {
	"a": ["o", "e", "u"],
	"b": ["d", "p", "q"],
	"c": ["s", "k", "e"],
	"d": ["b", "t", "q"],
	"e": ["é", "a", "c", "o"],
	"é": ["e", "è", "ê"],
	"è": ["e", "é", "ê"],
	"f": ["v", "t", "l"],
	"g": ["q", "j", "p"],
	"h": ["n", "b", "k"],
	"i": ["l", "j", "t"],
	"j": ["i", "g", "y"],
	"k": ["h", "c", "x"],
	"l": ["i", "t", "j"],
	"m": ["n", "w", "u"],
	"n": ["m", "u", "h"],
	"o": ["a", "e", "u", "c"],
	"p": ["b", "q", "d"],
	"q": ["g", "p", "b"],
	"r": ["n", "v", "t"],
	"s": ["z", "c", "x"],
	"t": ["f", "l", "d"],
	"u": ["n", "v", "a"],
	"v": ["u", "w", "f"],
	"w": ["v", "m", "u"],
	"x": ["k", "s", "z"],
	"y": ["v", "j", "g"],
	"z": ["s", "x", "n"],
}

const ALPHABET := "abcdefghijklmnopqrstuvwxyz"


static func shuffled(items: Array, rng: RandomNumberGenerator = null) -> Array:
	var copy: Array = items.duplicate()
	var i: int = copy.size() - 1
	while i > 0:
		var j: int = rng.randi_range(0, i) if rng != null else randi_range(0, i)
		var tmp: Variant = copy[i]
		copy[i] = copy[j]
		copy[j] = tmp
		i -= 1
	return copy


static func letters_of(word: String) -> Array:
	var letters: Array = []
	for i in word.length():
		letters.append(word.substr(i, 1))
	return letters


## Nombre de dalles proposées pour la lettre numéro column_index du mot (0 = la première).
## Niveau 1 : 3 dalles. Niveau 2 : une dalle de plus, une ligne sur deux (la 2e, la 4e…). Niveau 3 : 4 dalles partout.
static func tiles_in_column(level: int, column_index: int) -> int:
	if level <= 1:
		return 3

	if level == 2:
		return 4 if column_index % 2 == 1 else 3

	return 4


## Nombre d'erreurs sur une même ligne avant que la bonne dalle se mette à briller.
## Niveau 1 : dès la première erreur. Ensuite : après la deuxième seulement (pas d'aide « gratuite »).
static func help_after_errors(level: int) -> int:
	return 1 if level <= 1 else 2


## Pour chaque lettre du mot, une colonne de dalles mélangées :
## la bonne lettre et des lettres pièges proches.
static func build_columns(word: String, level: int, rng: RandomNumberGenerator = null) -> Array:
	var alphabet: Array = letters_of(ALPHABET)
	var columns: Array = []

	for column_index in word.length():
		var letter: String = word.substr(column_index, 1)
		var size: int = tiles_in_column(level, column_index)
		var chosen: Array = [letter]
		var confusable: Array = CONFUSABLE.get(letter, [])

		for candidate in shuffled(confusable, rng):
			if chosen.size() >= size:
				break
			if not chosen.has(candidate):
				chosen.append(candidate)

		for candidate in shuffled(alphabet, rng):
			if chosen.size() >= size:
				break
			if not chosen.has(candidate):
				chosen.append(candidate)

		columns.append(shuffled(chosen, rng))

	return columns


## Mots d'une partie : ceux du niveau, complétés au besoin par les niveaux plus faciles.
static func pick_words(level: int, count: int, rng: RandomNumberGenerator = null) -> Array:
	var exact: Array = []
	var easier: Array = []

	for item in WORDS:
		if int(item["level"]) == level:
			exact.append(item)
		elif int(item["level"]) < level:
			easier.append(item)

	var all: Array = shuffled(exact, rng) + shuffled(easier, rng)
	return all.slice(0, count)


static func accuracy_from(total_letters: int, errors: int) -> float:
	if total_letters <= 0:
		return 0.0
	return float(total_letters) / float(total_letters + errors)


## On gagne toujours au moins une étoile : l'enfant ne repart jamais les mains vides.
static func stars_from_errors(errors: int) -> int:
	if errors <= 2:
		return 3
	if errors <= 6:
		return 2
	return 1
