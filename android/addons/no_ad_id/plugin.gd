@tool
extends EditorPlugin
## Branche l'export « Sans AD_ID » à l'éditeur, tant que le plugin est activé (Projet > Réglages du projet > Plugins).

const NoAdIdExport = preload("res://addons/no_ad_id/export_plugin.gd")

var _export_plugin: EditorExportPlugin = null


func _enter_tree() -> void:
	_export_plugin = NoAdIdExport.new()
	add_export_plugin(_export_plugin)


func _exit_tree() -> void:
	if _export_plugin != null:
		remove_export_plugin(_export_plugin)
		_export_plugin = null
