import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GAMES_BETWEEN_ADS,
  MIN_MS_BETWEEN_ADS,
  decideAdBeforeGame,
  initialAdState,
} from "./ads.ts";

test("jamais de pub avant les premiers jeux de la session", () => {
  let state = initialAdState();

  for (let i = 0; i < GAMES_BETWEEN_ADS; i += 1) {
    const decision = decideAdBeforeGame(state, 1_000 + i);

    assert.equal(decision.show, false);
    state = decision.next;
  }
});

test("trois jeux sans pub, puis une pub : un jeu sur quatre au maximum", () => {
  let state = initialAdState();
  let now = 10_000;
  const shown: boolean[] = [];

  for (let i = 0; i < 12; i += 1) {
    const decision = decideAdBeforeGame(state, now);

    shown.push(decision.show);
    state = decision.next;
    now += 60_000;
  }

  const adPositions = shown.flatMap((value, index) => (value ? [index] : []));

  assert.deepEqual(adPositions, [3, 7, 11]);
});

test("pas de pub si la précédente date de moins de 3 minutes", () => {
  const state = { gamesSinceAd: 10, lastAdAt: 100_000 };

  assert.equal(decideAdBeforeGame(state, 100_000 + 1_000).show, false);
  assert.equal(
    decideAdBeforeGame(state, 100_000 + MIN_MS_BETWEEN_ADS).show,
    true,
  );
});
