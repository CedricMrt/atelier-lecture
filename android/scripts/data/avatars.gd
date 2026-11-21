extends RefCounted
## Avatars provisoires, dessinés par code (voir ui/avatar_view.gd).
## Les `id` sont enregistrés dans les profils : ne pas les changer quand
## les vrais personnages arriveront, seul le dessin change.
## ears : "round", "pointy" ou "none".

const LIST := [
	{"id": "renard", "label": "Renard", "color": Color(0.93, 0.45, 0.15), "ears": "pointy"},
	{"id": "panda", "label": "Panda", "color": Color(0.35, 0.35, 0.38), "ears": "round"},
	{"id": "lion", "label": "Lion", "color": Color(0.90, 0.68, 0.20), "ears": "round"},
	{"id": "grenouille", "label": "Grenouille", "color": Color(0.30, 0.72, 0.30), "ears": "none"},
	{"id": "pieuvre", "label": "Pieuvre", "color": Color(0.72, 0.32, 0.70), "ears": "none"},
	{"id": "licorne", "label": "Licorne", "color": Color(0.95, 0.55, 0.80), "ears": "pointy"},
	{"id": "hibou", "label": "Hibou", "color": Color(0.58, 0.40, 0.25), "ears": "pointy"},
	{"id": "dragon", "label": "Dragon", "color": Color(0.20, 0.65, 0.55), "ears": "pointy"},
	{"id": "robot", "label": "Robot", "color": Color(0.55, 0.65, 0.78), "ears": "none"},
	{"id": "chat", "label": "Chat", "color": Color(0.80, 0.78, 0.74), "ears": "pointy"},
	{"id": "dino", "label": "Dinosaure", "color": Color(0.45, 0.70, 0.25), "ears": "none"},
	{"id": "pingouin", "label": "Pingouin", "color": Color(0.25, 0.35, 0.55), "ears": "round"},
]


static func get_avatar(id: String) -> Dictionary:
	for avatar in LIST:
		if avatar["id"] == id:
			return avatar
	return LIST[0]
