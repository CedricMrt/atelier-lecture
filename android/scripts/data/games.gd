extends RefCounted
## Catalogue des six jeux. `available` passe à true quand le jeu est écrit.

const MAX_LEVEL := 3

const LIST := [
	{
		"id": "volcan",
		"title": "Pont du volcan",
		"description": "Écoute le mot et traverse la lave sur les bonnes lettres.",
		"color": Color(0.88, 0.34, 0.10),
		"available": true,
	},
	{
		"id": "dedans",
		"title": "Dedans ou pas ?",
		"description": "La lettre est-elle dans la suite qui a clignoté ?",
		"color": Color(0.25, 0.55, 0.85),
		"available": true,
	},
	{
		"id": "fantomes",
		"title": "Chasse aux fantômes",
		"description": "Touche le fantôme qui porte le mot entendu.",
		"color": Color(0.45, 0.30, 0.70),
		"available": false,
	},
	{
		"id": "mots-meles",
		"title": "Mots mêlés",
		"description": "Retrouve les mots cachés dans la grille.",
		"color": Color(0.20, 0.62, 0.45),
		"available": false,
	},
	{
		"id": "castors",
		"title": "Pont des castors",
		"description": "Complète le mot avec le bon groupe de lettres.",
		"color": Color(0.62, 0.42, 0.22),
		"available": false,
	},
	{
		"id": "rythme",
		"title": "Course au rythme",
		"description": "Tape les syllabes en rythme pour enchaîner les combos.",
		"color": Color(0.85, 0.30, 0.55),
		"available": false,
	},
]


static func get_game(id: String) -> Dictionary:
	for game in LIST:
		if game["id"] == id:
			return game
	return LIST[0]
