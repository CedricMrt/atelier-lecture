extends RefCounted
## Retrouve l'enregistrement MP3 d'un texte dans assets/voix/, sans dépendre des majuscules ni de la ponctuation.
##
## Les fichiers portent le texte dit comme nom (« Bravo ! Tu as trouvé !.mp3 ») ; Windows interdit « ? » dans un nom
## et la phrase peut finir par un point avant « .mp3 » (« Regarde bien..mp3 »). On compare donc des « clés » :
## le texte en minuscules, réduit aux lettres, chiffres, tirets et espaces simples.
##   « Veux-tu rejouer ? »  et  « Veux-tu rejouer.mp3 »             → « veux-tu rejouer »
##   « Cherche la lettre a » et « Cherche la lettre A.mp3 »          → « cherche la lettre a »
##   « Écoute bien, puis touche… » et « Écoute bien, puis touche….mp3 » → même clé

const EXTENSIONS := ["mp3", "ogg", "wav"]

static var _cleaner: RegEx = null


static func key(text: String) -> String:
	if _cleaner == null:
		_cleaner = RegEx.new()
		_cleaner.compile("[^\\p{L}\\p{N} \\-]")

	var cleaned := _cleaner.sub(text.to_lower(), "", true)
	return " ".join(cleaned.split(" ", false))


## À partir des noms de fichiers lus dans le dossier, fabrique le dictionnaire « clé → vrai nom de fichier ».
## Dans l'appli exportée, Godot liste « xxx.mp3.import » au lieu de « xxx.mp3 » : le suffixe est retiré.
static func index_from(file_names: PackedStringArray) -> Dictionary:
	var index := {}

	for file_name in file_names:
		var real_name := file_name

		for suffix in [".import", ".remap"]:
			if real_name.ends_with(suffix):
				real_name = real_name.trim_suffix(suffix)

		if not EXTENSIONS.has(real_name.get_extension().to_lower()):
			continue

		var file_key := key(real_name.get_basename())

		if file_key.is_empty() or index.has(file_key):
			continue

		index[file_key] = real_name

	return index
