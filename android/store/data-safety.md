# Formulaire « Sécurité des données » (Play Console)

À remplir dans Play Console → Contenu de l'appli → Sécurité des données.
Les réponses doivent **correspondre exactement** à la politique de confidentialité et à ce que fait le code,
**y compris le SDK publicitaire**. Une réponse fausse peut faire retirer l'appli.

## Aujourd'hui (pub simulée, aucun SDK externe)

| Question | Réponse |
|---|---|
| L'appli collecte-t-elle ou partage-t-elle des données utilisateur ? | **Non** |
| Les données sont-elles chiffrées en transit ? | Sans objet (aucune donnée n'est envoyée) |
| Les utilisateurs peuvent-ils demander la suppression ? | Sans objet : tout est local, supprimé à la désinstallation ou via « Gérer » |

Les prénoms, avatars et niveaux sont enregistrés **sur l'appareil seulement** et ne sont envoyés à personne :
Google ne les considère pas comme « collectés » (la collecte = envoi hors de l'appareil).

## Quand le SDK publicitaire sera branché (AdMob en mode enfants)

Le code de branchement existe déjà (voir `ads-setup.md`) ; ces réponses valent dès qu'une version **avec** pub est publiée.

Il faudra alors répondre **Oui** à « collecte des données », parce que le SDK publicitaire envoie des informations
techniques pour afficher les pubs. Google fournit pour cela un guide à suivre point par point :
**« Google Mobile Ads SDK et déclaration des données Play »** (documentation AdMob, page « Play data disclosure »).
Il liste les types de données que le SDK collecte (par exemple des identifiants de l'appareil ou de l'application,
des interactions avec les pubs, des diagnostics, une position approximative déduite de l'adresse IP) et la façon de les déclarer.

À ne pas oublier, pour une appli « Familles » :

- le traitement destiné aux enfants est activé dans le code (`ad_backend_admob.gd` : `tag_for_child_directed_treatment = TRUE`,
  contenu maximal « G ») ;
- **ne pas déclarer la permission `AD_ID`** : le plugin `addons/no_ad_id/` la retire de l'export (voir `ads-setup.md`, étape 4) ;
- n'utiliser qu'une version du SDK **auto-certifiée « Familles »** (liste dans la Google Play SDK Console) ;
- relire la politique de confidentialité (section 4) pour qu'elle corresponde mot pour mot.

Contrôle avant d'envoyer : Play Console → Politique et programmes → **Contenu de l'appli** : toutes les cases au vert.
