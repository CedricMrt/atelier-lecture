extends Node
## Mots du volcan : MP3 locaux en priorité, synthèse système en secours.
## Les autres textes conservent leur comportement actuel.

const RECORDED_WORDS := [
	"lit", "rat", "bol", "sac", "mur", "lac", "riz",
	"lune", "robe", "vase", "cube", "moto", "kiwi", "lama", "sofa",
	"lapin", "radio", "balai", "pomme", "fusée", "robot", "tigre", "zèbre", "pizza",
]

var _utterance_counter := 0
var _ended_id := -1
var _generation := 0
var _player: AudioStreamPlayer


func _ready() -> void:
	_player = AudioStreamPlayer.new()
	add_child(_player)
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


## Un nouvel appel interrompt le précédent. L'attente se termine aussi après annulation.
func speak(text: String, rate: float = 0.85) -> void:
	cancel()
	var my_generation := _generation
	var word := text.strip_edges().to_lower()
	if RECORDED_WORDS.has(word):
		var path := "res://assets/voix/%s.mp3" % word
		if ResourceLoader.exists(path):
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
		push_warning("Voix : MP3 absent ou illisible pour %s ; synthèse vocale en secours." % word)
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
