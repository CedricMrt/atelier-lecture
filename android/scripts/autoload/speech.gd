extends Node
## Voix de l'appli : enregistrements MP3 (dossier assets/voix/) en priorité, synthèse vocale du système en secours.
## Un texte est joué en MP3 si un fichier porte son nom (voir logic/voice_files.gd : majuscules et ponctuation sans importance).
## Sur Android, la voix française de la synthèse dépend de l'appareil : has_french_voice() sert à prévenir l'adulte.

const VoiceFiles = preload("res://scripts/logic/voice_files.gd")

const VOICE_DIR := "res://assets/voix/"

var _utterance_counter := 0
var _ended_id := -1
var _generation := 0
var _player: AudioStreamPlayer
var _recordings: Dictionary = {}


func _ready() -> void:
	_player = AudioStreamPlayer.new()
	add_child(_player)
	_recordings = VoiceFiles.index_from(DirAccess.get_files_at(VOICE_DIR))

	if _recordings.is_empty():
		push_warning("Voix : aucun enregistrement trouvé dans %s ; synthèse vocale seulement." % VOICE_DIR)

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
	if is_instance_valid(_player):
		_player.stop()
	if _supported():
		DisplayServer.tts_stop()


## Vrai si un enregistrement MP3 existe pour ce texte.
func has_recording(text: String) -> bool:
	return not _recording_path(text).is_empty()


## Chemin du MP3 qui porte ce texte comme nom, ou "" s'il n'y en a pas.
func _recording_path(text: String) -> String:
	var exact := VOICE_DIR + text.strip_edges() + ".mp3"

	if ResourceLoader.exists(exact):
		return exact

	var file_name: String = _recordings.get(VoiceFiles.key(text), "")

	if file_name.is_empty():
		return ""

	return VOICE_DIR + file_name


## Un nouvel appel interrompt le précédent. L'attente se termine aussi après annulation.
func speak(text: String, rate: float = 0.85) -> void:
	cancel()
	var my_generation := _generation
	var path := _recording_path(text)
	if not path.is_empty():
		var recording := load(path) as AudioStream
		if recording != null and is_instance_valid(_player):
			_player.stream = recording
			_player.play()
			var audio_deadline := Time.get_ticks_msec() + int((recording.get_length() + 2.0) * 1000.0)
			while my_generation == _generation and _player.playing and Time.get_ticks_msec() < audio_deadline:
				await get_tree().process_frame
			if my_generation == _generation:
				_player.stop()
			return
		push_warning("Voix : %s illisible ; synthèse vocale en secours." % path)
	if not _supported():
		return
	var voice_id := _french_voice_id()
	if voice_id.is_empty():
		return
	_utterance_counter += 1
	var my_id := _utterance_counter
	DisplayServer.tts_speak(text, voice_id, 100, 1.0, rate, my_id, true)
	var deadline := Time.get_ticks_msec() + int((1.5 + text.length() * 0.22) * 1000.0)
	while _ended_id != my_id and my_generation == _generation and Time.get_ticks_msec() < deadline:
		await get_tree().process_frame
