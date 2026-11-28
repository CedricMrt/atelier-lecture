extends RefCounted
## Les étoiles gagnées pendant une partie (le score affiché en haut à droite, ajouté au total du joueur).
## Règle commune aux trois jeux : chaque bonne réponse vaut 5 étoiles, multipliées par le combo
## (le nombre de bonnes réponses d'affilée, celle-ci comprise). Une erreur remet le combo à zéro.

const POINTS_PER_ANSWER := 5


## Étoiles d'une bonne réponse. `combo` = bonnes réponses d'affilée, celle-ci comprise (1 = pas de combo).
static func answer_points(combo: int) -> int:
	return POINTS_PER_ANSWER * maxi(combo, 1)
