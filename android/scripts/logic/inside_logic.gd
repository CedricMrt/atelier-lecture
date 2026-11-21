extends RefCounted
## Logique de « Dedans ou pas ? », sans nœud : facile à tester.
## Une lettre cible, puis une suite de lettres (sans doublon) montrée brièvement.
## Le niveau règle la longueur de la suite (empan visuel) et le temps d'affichage.

const Volcano = preload("res://scripts/logic/volcano_logic.gd")

const ALPHABET := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


static func letters() -> Array:
	return Volcano.letters_of(ALPHABET)


## Longueur de la suite : 3, 4 puis 5 lettres.
static func span_for(level: int) -> int:
	return clampi(level + 2, 3, 5)


## Temps d'affichage de la suite, en secondes.
static func exposure_for(level: int) -> float:
	if level >= 3:
		return 1.2

	if level == 2:
		return 1.6

	return 2.2


## Lettres qui ressemblent à `letter` (en majuscules), reprises de la table du Pont du volcan.
static func lookalikes(letter: String) -> Array:
	var result: Array = []
	var source: Array = Volcano.CONFUSABLE.get(letter.to_lower(), [])

	for item in source:
		var upper: String = String(item).to_upper()

		if ALPHABET.contains(upper):
			result.append(upper)

	return result


## Une manche : {target, sequence, inside}. Dès le niveau 2, une lettre qui ressemble à la cible
## est glissée dans la suite (b et d, p et q...), qu'elle contienne la cible ou non.
static func make_round(level: int, inside: bool, previous_target: String = "", rng: RandomNumberGenerator = null) -> Dictionary:
	var pool: Array = Volcano.shuffled(letters(), rng)
	var target: String = ""

	for candidate in pool:
		if candidate != previous_target:
			target = candidate
			break

	var needed: int = span_for(level) - (1 if inside else 0)
	var sequence: Array = []

	if level >= 2:
		var traps: Array = Volcano.shuffled(lookalikes(target), rng)

		if not traps.is_empty():
			sequence.append(traps[0])

	for candidate in pool:
		if sequence.size() >= needed:
			break

		if candidate != target and not sequence.has(candidate):
			sequence.append(candidate)

	if inside:
		sequence.append(target)

	sequence = Volcano.shuffled(sequence, rng)
	return {"target": target, "sequence": sequence, "inside": inside}


## Les manches d'une partie : la moitié avec la cible dedans, l'autre moitié sans, dans le désordre.
static func make_rounds(level: int, count: int, rng: RandomNumberGenerator = null) -> Array:
	var flags: Array = []

	for i in count:
		flags.append(i % 2 == 0)

	flags = Volcano.shuffled(flags, rng)

	var rounds: Array = []
	var previous: String = ""

	for flag in flags:
		var item: Dictionary = make_round(level, bool(flag), previous, rng)
		previous = item["target"]
		rounds.append(item)

	return rounds


static func accuracy_from(correct: int, errors: int) -> float:
	if correct + errors <= 0:
		return 0.0

	return float(correct) / float(correct + errors)


## On gagne toujours au moins une étoile.
static func stars_from_errors(errors: int) -> int:
	if errors <= 1:
		return 3

	if errors <= 3:
		return 2

	return 1
