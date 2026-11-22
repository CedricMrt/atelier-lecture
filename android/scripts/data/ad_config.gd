extends RefCounted
## Identifiants des publicités AdMob. Ils ne sont pas secrets (ils sont dans l'appli publiée).
##
## Ne pas confondre :
##   - l'ID de l'APPLI AdMob (contient « ~ ") : se saisit dans Projet > Réglages du projet > Admob > General > Android ;
##   - l'ID de l'UNITÉ publicitaire (contient « / ") : c'est celui d'ici.

## Interstitiel de test fourni par Google : affiche des pubs « Test Ad », sans aucun risque pour le compte AdMob.
const TEST_INTERSTITIAL_ANDROID := "ca-app-pub-3940256099942544/1033173712"

## ID de l'unité « Avant un jeu » (interstitiel) créée dans AdMob.
## Si on le vide, la version publiée n'affiche AUCUNE pub (publier sans pub reste possible).
## L'ID de l'APPLI (avec « ~ »), lui, va dans les réglages du plugin : ca-app-pub-4246878331956258~7300870436
const INTERSTITIAL_ANDROID := "ca-app-pub-4246878331956258/2918772290"


## Pendant le développement (éditeur, export « avec debug ») : toujours les pubs de test,
## pour ne jamais cliquer par erreur sur de vraies pubs avec son propre compte.
static func interstitial_unit_id() -> String:
	if OS.is_debug_build():
		return TEST_INTERSTITIAL_ANDROID

	return INTERSTITIAL_ANDROID
