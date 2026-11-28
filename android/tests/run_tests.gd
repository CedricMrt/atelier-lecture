extends SceneTree
## Tests de la logique (sans interface). Lancer depuis le dossier android/ :
##   godot --headless --path . --script tests/run_tests.gd
## Code de sortie 0 si tout passe, 1 sinon.

const Progression = preload("res://scripts/logic/progression.gd")
const AdRules = preload("res://scripts/logic/ad_rules.gd")
const Logic = preload("res://scripts/logic/volcano_logic.gd")
const VoiceFiles = preload("res://scripts/logic/voice_files.gd")
const GhostLogic = preload("res://scripts/logic/ghost_logic.gd")

var failures := 0


func check(condition: bool, label: String) -> void:
	if condition:
		print("ok     : ", label)
	else:
		failures += 1
		printerr("ÉCHEC  : ", label)


func _init() -> void:
	test_progression()
	test_ad_rules()
	test_volcano()
	test_voice_files()
	test_ghost_data()
	test_ghost_rounds()

	print("")
	print("%d échec(s)" % failures)
	quit(1 if failures > 0 else 0)


func test_progression() -> void:
	check(Progression.next_level(1, 0.9) == 2, "on monte de niveau avec 90 %")
	check(Progression.next_level(3, 1.0) == 3, "le niveau ne dépasse pas le maximum")
	check(Progression.next_level(2, 0.5) == 1, "on descend avec 50 %")
	check(Progression.next_level(1, 0.5) == 1, "le niveau ne descend pas sous 1")
	check(Progression.next_level(2, 0.7) == 2, "on reste entre 60 % et 85 %")

	var first := Progression.apply_result(null, {"game_id": "volcan", "stars": 2, "accuracy": 0.9}, 1000)
	check(first["plays"] == 1 and first["best_stars"] == 2 and first["level"] == 2, "premier résultat enregistré")

	var second := Progression.apply_result(first, {"game_id": "volcan", "stars": 1, "accuracy": 0.7}, 2000)
	check(second["plays"] == 2 and second["best_stars"] == 2, "le meilleur nombre d'étoiles est conservé")


func test_ad_rules() -> void:
	var state := AdRules.initial_state()
	var shown := 0

	# Trois premiers jeux : jamais de pub. Le quatrième en affiche une.
	for i in 3:
		var decision := AdRules.decide(state, 10 * 60 * 1000 + i)
		state = decision["next"]
		check(not decision["show"], "pas de pub au jeu %d" % (i + 1))
		shown += 1 if decision["show"] else 0

	var fourth := AdRules.decide(state, 10 * 60 * 1000 + 3)
	check(fourth["show"], "une pub avant le quatrième jeu")
	state = fourth["next"]

	# Juste après une pub : pas de nouvelle pub, même après beaucoup de jeux.
	for i in 6:
		var decision := AdRules.decide(state, 10 * 60 * 1000 + 100 + i)
		state = decision["next"]
		check(not decision["show"], "pas de pub moins de 3 minutes après la précédente (%d)" % i)

	var later := AdRules.decide(state, 10 * 60 * 1000 + 4 * 60 * 1000)
	check(later["show"], "une pub revient après 3 minutes")


func test_volcano() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 12345

	for level in [1, 2, 3]:
		var words := Logic.pick_words(level, 5, rng)
		check(words.size() == 5, "5 mots au niveau %d" % level)

		for item in words:
			check(int(item["level"]) <= level, "le mot « %s » n'est pas trop dur" % item["word"])

			var columns := Logic.build_columns(item["word"], level, rng)
			var letters := Logic.letters_of(item["word"])
			var valid := columns.size() == letters.size()

			for i in columns.size():
				var column: Array = columns[i]
				valid = valid and column.size() == Logic.tiles_in_column(level, i)
				valid = valid and column.has(letters[i])

				var unique := {}
				for tile in column:
					unique[tile] = true
				valid = valid and unique.size() == column.size()

			check(valid, "colonnes valides pour « %s »" % item["word"])

	check(Logic.tiles_in_column(1, 0) == 3 and Logic.tiles_in_column(1, 1) == 3, "niveau 1 : 3 dalles partout")
	check(Logic.tiles_in_column(2, 0) == 3 and Logic.tiles_in_column(2, 1) == 4 and Logic.tiles_in_column(2, 2) == 3 and Logic.tiles_in_column(2, 3) == 4, "niveau 2 : une dalle de plus une ligne sur deux")
	check(Logic.tiles_in_column(3, 0) == 4 and Logic.tiles_in_column(3, 1) == 4, "niveau 3 : 4 dalles partout")
	check(Logic.help_after_errors(1) == 1, "niveau 1 : l'aide dès la 1re erreur")
	check(Logic.help_after_errors(2) == 2 and Logic.help_after_errors(3) == 2, "niveaux 2 et 3 : l'aide après 2 erreurs")
	check(Logic.stars_from_errors(0) == 3, "0 erreur : 3 étoiles")
	check(Logic.stars_from_errors(5) == 2, "5 erreurs : 2 étoiles")
	check(Logic.stars_from_errors(20) == 1, "20 erreurs : 1 étoile")
	check(is_equal_approx(Logic.accuracy_from(10, 0), 1.0), "précision 100 %")
	check(is_equal_approx(Logic.accuracy_from(0, 0), 0.0), "précision nulle sans lettre")


func test_voice_files() -> void:
	check(VoiceFiles.key("Veux-tu rejouer ?") == VoiceFiles.key("Veux-tu rejouer"), "voix : le « ? » du texte n'empêche pas de trouver le fichier")
	check(VoiceFiles.key("Cherche la lettre a") == VoiceFiles.key("Cherche la lettre A"), "voix : majuscules sans importance")
	check(VoiceFiles.key("Écoute encore, puis essaie.") == "écoute encore puis essaie", "voix : virgule et point retirés, accents conservés")
	check(VoiceFiles.key("Touche le côté vert si elle n’y était pas.") == VoiceFiles.key("Touche le côté vert si elle ny était pas"), "voix : apostrophe typographique ignorée")
	check(VoiceFiles.key("Trouve le son « ou » ici") == VoiceFiles.key("Trouve le son “ou” ici"), "voix : guillemets « » et “ ” équivalents")
	check(VoiceFiles.key("  Bien   joué ! ") == "bien joué", "voix : espaces multiples réduits")

	var names := PackedStringArray([
		"Bien joué !.mp3", "Bien joué !.mp3.import", "Regarde bien..mp3.import",
		"Veux-tu rejouer.mp3", "Cherche la lettre A.mp3", "notes.txt", "vide.mp3.import.bak",
	])
	var index := VoiceFiles.index_from(names)
	check(index.get(VoiceFiles.key("Bien joué !"), "") == "Bien joué !.mp3", "voix : « .import » retiré du nom, un seul fichier par texte")
	check(index.get(VoiceFiles.key("Regarde bien."), "") == "Regarde bien..mp3", "voix : nom gardé exactement (double point)")
	check(index.get(VoiceFiles.key("Veux-tu rejouer ?"), "") == "Veux-tu rejouer.mp3", "voix : fichier sans « ? » retrouvé")
	check(index.get(VoiceFiles.key("Cherche la lettre a"), "") == "Cherche la lettre A.mp3", "voix : lettre en minuscule retrouve le fichier en majuscule")
	check(not index.has(VoiceFiles.key("notes")) and not index.has(VoiceFiles.key("vide")), "voix : fichiers qui ne sont pas des sons ignorés")


## Données de « Chasse aux fantômes » : cohérence des tables et présence des MP3 de chaque phrase dite.
func test_ghost_data() -> void:
	var recordings: Dictionary = VoiceFiles.index_from(DirAccess.get_files_at("res://assets/voix/"))
	check(not recordings.is_empty(), "fantômes : le dossier assets/voix est lisible")

	var missing: Array = []

	for syllable in GhostLogic.SYLLABLES:
		if not recordings.has(VoiceFiles.key(syllable)):
			missing.append(syllable)

	for sound in GhostLogic.SOUNDS:
		if not recordings.has(VoiceFiles.key(GhostLogic.sound_sentence(sound))):
			missing.append(GhostLogic.sound_sentence(sound))

	for sound in GhostLogic.POSITION_SOUNDS:
		for position in GhostLogic.POSITION_SOUNDS[sound]:
			# Une position sans mot valable est ignorée par le jeu : pas besoin de MP3.
			if GhostLogic._words_at(sound, position).is_empty():
				continue

			var sentence: String = GhostLogic.position_sentence(sound, position)

			if not recordings.has(VoiceFiles.key(sentence)):
				missing.append(sentence)

	check(missing.is_empty(), "fantômes : syllabes, sons et positions ont tous leur MP3 (manque : %s)" % ", ".join(PackedStringArray(missing)))

	var places := ["début", "milieu", "fin", "multi"]
	var valid := true

	for word in GhostLogic.WORD_SOUNDS:
		for sound in GhostLogic.WORD_SOUNDS[word]:
			valid = valid and GhostLogic.SOUNDS.has(sound) and places.has(GhostLogic.WORD_SOUNDS[word][sound])

	for word in GhostLogic.LONG_WORD_SOUNDS:
		for sound in GhostLogic.LONG_WORD_SOUNDS[word]:
			valid = valid and GhostLogic.SOUNDS.has(sound) and places.has(GhostLogic.LONG_WORD_SOUNDS[word][sound])

	check(valid, "fantômes : sons et places des tables de mots valides")

	# Chaque position utilisée a au moins un mot juste et assez de pièges (sinon la manche retombe au niveau 2).
	var enough := true

	for sound in GhostLogic.POSITION_SOUNDS:
		for position in GhostLogic.POSITION_SOUNDS[sound]:
			if GhostLogic._words_at(sound, position).is_empty():
				continue

			var traps := 0

			for word in GhostLogic.LONG_WORD_SOUNDS:
				var info: Dictionary = GhostLogic.LONG_WORD_SOUNDS[word]

				if not info.has(sound) or (info[sound] != "multi" and info[sound] != position):
					traps += 1

			enough = enough and traps >= 3

	check(enough, "fantômes : au moins 3 pièges pour chaque position proposée")

	check(GhostLogic.stars_from_errors(0) == 3 and GhostLogic.stars_from_errors(1) == 3, "fantômes : 0 ou 1 erreur = 3 étoiles")
	check(GhostLogic.stars_from_errors(3) == 2 and GhostLogic.stars_from_errors(4) == 1, "fantômes : 3 erreurs = 2 étoiles, 4 = 1")
	check(is_equal_approx(GhostLogic.accuracy_from(6, 2), 0.75), "fantômes : précision 6 bonnes sur 8")


## Manches tirées au hasard (graine fixe) : une seule bonne réponse, des pièges justes, une phrase qui a son MP3.
func test_ghost_rounds() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 20261128

	var recordings: Dictionary = VoiceFiles.index_from(DirAccess.get_files_at("res://assets/voix/"))

	for level in [1, 2, 3]:
		var rounds: Array = GhostLogic.make_rounds(level, 300, rng)
		var shape_ok := true
		var answers_ok := true
		var voice_ok := true
		var no_repeat := true
		var previous_key := ""

		for item in rounds:
			var options: Array = item["options"]
			var correct_index: int = item["correct_index"]
			var unique := {}

			for option in options:
				unique[option] = true

			shape_ok = shape_ok and options.size() == 4 and unique.size() == 4 and correct_index >= 0 and correct_index < 4
			voice_ok = voice_ok and recordings.has(VoiceFiles.key(item["spoken"]))

			if level <= 2:
				no_repeat = no_repeat and str(item["key"]) != previous_key

			previous_key = str(item["key"])

			var good_count := 0

			for i in options.size():
				var option: String = options[i]
				var is_good := false

				if item["mode"] == "syllabe":
					is_good = option == item["spoken"]
					answers_ok = answers_ok and GhostLogic.SYLLABLES.has(option)
				elif item["mode"] == "son":
					is_good = GhostLogic.WORD_SOUNDS.get(option, {}).has(item["key"])
				else:
					var sound: String = str(item["key"]).get_slice("|", 0)
					var position: String = str(item["key"]).get_slice("|", 1)
					var info: Dictionary = GhostLogic.LONG_WORD_SOUNDS.get(option, {})
					is_good = info.get(sound, "") == position

					if not is_good and info.has(sound):
						# Un piège ne doit jamais être un mot « multi » (place ambiguë).
						answers_ok = answers_ok and info[sound] != "multi"

				if is_good:
					good_count += 1
					answers_ok = answers_ok and i == correct_index

			answers_ok = answers_ok and good_count == 1

		check(shape_ok, "fantômes niveau %d : 4 réponses différentes, bonne réponse valide" % level)
		check(answers_ok, "fantômes niveau %d : une seule bonne réponse, pièges sans le son (ou mal placé)" % level)
		check(voice_ok, "fantômes niveau %d : chaque consigne dite a son MP3" % level)

		if level <= 2:
			check(no_repeat, "fantômes niveau %d : jamais deux fois de suite la même syllabe ou le même son" % level)
