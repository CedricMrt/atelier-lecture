extends Node
## Synthèse vocale du système (voix installées sur l'appareil).
## Sur Android, la voix française dépend du téléphone : on vérifie sa présence
## avec has_french_voice() pour prévenir l'adulte.

var _utterance_counter := 0
var _ended_id := -1
var _generation := 0


func _ready() -> void:
	if _supported():
		DisplayServer.tts_set_utterance_callback(DisplayServer.TTS_UTTERANCE_ENDED, _on_utterance_done)
		DisplayServer.tts_set_utterance_callback(DisplayServer.TTS_UTTERANCE_CANCELED, _on_utterance_done)


func _supported() -> bool:
	return DisplayServer.has_feature(DisplayServer.FEATURE_TEXT_TO_SPEECH)


func _on_utterance_done(utterance_id: int) -> void:
	_ended_id = utterance_id


func _french_voice_id() -> String:
	if not _supported():
		return ""

	var fallback := ""

	for voice in DisplayServer.tts_get_voices():
		var language: String = str(voice.get("language", "")).to_lower().replace("_", "-")

		if language == "fr-fr":
			return str(voice["id"])
		if fallback.is_empty() and language.begins_with("fr"):
			fallback = str(voice["id"])

	return fallback


func has_french_voice() -> bool:
	return not _french_voice_id().is_empty()


func cancel() -> void:
	_generation += 1

	if _supported():
		DisplayServer.tts_stop()


## Dit un texte à voix haute. À utiliser avec `await` : se termine à la fin de la
## phrase, ou après un délai de sécurité (certains appareils n'envoient jamais « fin »).
## Un nouvel appel, ou cancel(), interrompt la parole précédente.
func speak(text: String, rate: float = 0.85) -> void:
	if not _supported():
		return

	var voice_id := _french_voice_id()

	if voice_id.is_empty():
		return

	_generation += 1
	var my_generation := _generation

	DisplayServer.tts_stop()

	_utterance_counter += 1
	var my_id := _utterance_counter

	DisplayServer.tts_speak(text, voice_id, 100, 1.0, rate, my_id, true)

	var deadline := Time.get_ticks_msec() + int((1.5 + text.length() * 0.22) * 1000.0)

	while _ended_id != my_id and my_generation == _generation and Time.get_ticks_msec() < deadline:
		await get_tree().process_frame
