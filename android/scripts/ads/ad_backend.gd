extends Node
## Interface d'un fournisseur de publicité. Les jeux ne la connaissent pas : seul l'autoload Ads s'en sert.
## Un fournisseur précharge une pub, dit s'il en a une prête, l'affiche, et prévient quand elle est fermée.

## Émis quand la pub est terminée (fermée par l'enfant ou impossible à afficher) : le jeu peut démarrer.
signal closed


## Initialise le SDK (en mode « destiné aux enfants ») et précharge la première pub.
func start() -> void:
	pass


## Vrai si une pub est prête à être affichée tout de suite.
func is_ready() -> bool:
	return false


## Affiche la pub. Doit toujours finir par émettre « closed ».
func show_ad() -> void:
	closed.emit()
