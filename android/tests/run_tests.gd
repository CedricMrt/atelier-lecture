extends SceneTree
## Tests de la logique (sans interface). Lancer depuis le dossier android/ :
##   godot --headless --path . --script tests/run_tests.gd
## Code de sortie 0 si tout passe, 1 sinon.

const Progression = preload("res://scripts/logic/progression.gd")
const AdRules = preload("res://scripts/logic/ad_rules.gd")
const Logic = preload("res://scripts/logic/volcano_logic.gd")

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
				valid = valid and column.size() == Logic.tiles_per_column(level)
				valid = valid and column.has(letters[i])

				var unique := {}
				for tile in column:
					unique[tile] = true
				valid = valid and unique.size() == column.size()

			check(valid, "colonnes valides pour « %s »" % item["word"])

	check(Logic.stars_from_errors(0) == 3, "0 erreur : 3 étoiles")
	check(Logic.stars_from_errors(5) == 2, "5 erreurs : 2 étoiles")
	check(Logic.stars_from_errors(20) == 1, "20 erreurs : 1 étoile")
	check(is_equal_approx(Logic.accuracy_from(10, 0), 1.0), "précision 100 %")
	check(is_equal_approx(Logic.accuracy_from(0, 0), 0.0), "précision nulle sans lettre")
