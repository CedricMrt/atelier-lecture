@tool
extends EditorExportPlugin
## Ajoute au manifeste Android de l'export la consigne « retirer la permission AD_ID ».
## Le SDK publicitaire de Google la réclame dans son propre manifeste ; la fusion des manifestes Gradle
## applique ce « tools:node="remove" » et elle disparaît de l'APK / AAB final.
## Interdit pour une appli « Familles » : l'identifiant publicitaire ne doit pas être demandé.
##
## Utilise le préfixe « tools » du manifeste modèle de Godot (xmlns:tools déjà présent dans le modèle Gradle).

## Deux noms existent selon la version du SDK publicitaire : on retire les deux.
## (Le SDK « Next-Gen » utilise android.permission.AD_ID, l'ancien com.google.android.gms.permission.AD_ID.)
const AD_ID_PERMISSIONS := [
	"android.permission.AD_ID",
	"com.google.android.gms.permission.AD_ID",
]


func _get_name() -> String:
	return "SansAdId"


func _supports_platform(platform: EditorExportPlatform) -> bool:
	return platform is EditorExportPlatformAndroid


func _get_android_manifest_element_contents(_platform: EditorExportPlatform, _debug: bool) -> String:
	var xml := ""

	for permission in AD_ID_PERMISSIONS:
		xml += '<uses-permission android:name="%s" tools:node="remove" />\n' % permission

	return xml
