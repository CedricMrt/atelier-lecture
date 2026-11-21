import assert from "node:assert/strict";
import { test } from "node:test";
import { applyResult, nextLevel } from "./progression.ts";

test("on monte de niveau quand c'est réussi, jusqu'au maximum", () => {
  assert.equal(nextLevel(1, 0.95), 2);
  assert.equal(nextLevel(3, 1), 3);
});

test("on descend quand c'est trop difficile, jamais sous 1", () => {
  assert.equal(nextLevel(3, 0.4), 2);
  assert.equal(nextLevel(1, 0.1), 1);
});

test("on reste au même niveau entre les deux seuils", () => {
  assert.equal(nextLevel(2, 0.7), 2);
});

test("applyResult cumule les parties et garde le meilleur score", () => {
  const first = applyResult(undefined, { gameId: "volcan", stars: 3, accuracy: 0.9 }, 1000);
  const second = applyResult(first, { gameId: "volcan", stars: 1, accuracy: 0.5 }, 2000);

  assert.equal(first.level, 2);
  assert.equal(second.level, 1);
  assert.equal(second.plays, 2);
  assert.equal(second.bestStars, 3);
  assert.equal(second.lastPlayedAt, 2000);
});
