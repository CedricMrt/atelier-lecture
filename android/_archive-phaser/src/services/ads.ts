// Règles d'affichage de la publicité avant un jeu.
//
// Contraintes Google Play « Familles » : pas de pub à l'ouverture de l'appli,
// pas en plein jeu, fermable facilement, une seule à la fois, et jamais trop
// souvent. Ce module ne décide QUE du moment : l'affichage réel (SDK certifié
// pour enfants) sera branché plus tard à la place de AdPlaceholder.

export const GAMES_BETWEEN_ADS = 3;
export const MIN_MS_BETWEEN_ADS = 3 * 60 * 1000;

export type AdState = {
  /** Jeux lancés depuis la dernière pub. */
  gamesSinceAd: number;
  /** Heure de la dernière pub, 0 si aucune depuis le lancement de l'appli. */
  lastAdAt: number;
};

export function initialAdState(): AdState {
  return { gamesSinceAd: 0, lastAdAt: 0 };
}

/**
 * Appelé quand un jeu va démarrer.
 * Retourne l'état suivant, et si une pub doit être affichée avant ce jeu.
 */
export function decideAdBeforeGame(
  state: AdState,
  now: number,
): { show: boolean; next: AdState } {
  const gamesSinceAd = state.gamesSinceAd + 1;

  const enoughGames = gamesSinceAd > GAMES_BETWEEN_ADS;
  const enoughTime =
    state.lastAdAt === 0 || now - state.lastAdAt >= MIN_MS_BETWEEN_ADS;

  if (enoughGames && enoughTime) {
    return { show: true, next: { gamesSinceAd: 0, lastAdAt: now } };
  }

  return { show: false, next: { gamesSinceAd, lastAdAt: state.lastAdAt } };
}

// État en mémoire seulement : il repart à zéro à chaque lancement de l'appli,
// donc le tout premier jeu de la session n'a jamais de pub.
let adState = initialAdState();

export function shouldShowAdBeforeGame(now = Date.now()): boolean {
  const decision = decideAdBeforeGame(adState, now);

  adState = decision.next;

  return decision.show;
}
