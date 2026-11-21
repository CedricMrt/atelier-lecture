import assert from "node:assert/strict";
import { test } from "node:test";
import {
  VOLCANO_WORDS,
  accuracyFrom,
  buildColumns,
  lettersOf,
  pickWords,
  starsFromErrors,
  tilesPerColumn,
} from "./volcanoLogic.ts";

test("chaque colonne contient la bonne lettre et des lettres toutes différentes", () => {
  for (const item of VOLCANO_WORDS) {
    const columns = buildColumns(item.word, item.level);
    const letters = lettersOf(item.word);

    assert.equal(columns.length, letters.length);

    columns.forEach((column, index) => {
      assert.equal(column.length, tilesPerColumn(item.level));
      assert.ok(column.includes(letters[index]), item.word);
      assert.equal(new Set(column).size, column.length, item.word);
    });
  }
});

test("les lettres accentuées comptent pour une lettre", () => {
  assert.deepEqual(lettersOf("fusée"), ["f", "u", "s", "é", "e"]);
  assert.equal(lettersOf("zèbre").length, 5);
});

test("pickWords donne le nombre demandé, sans doublon", () => {
  for (const level of [1, 2, 3]) {
    const words = pickWords(level, 5);

    assert.equal(words.length, 5);
    assert.equal(new Set(words.map((item) => item.word)).size, 5);
  }
});

test("les mots du niveau 1 ne contiennent que 3 lettres", () => {
  assert.ok(
    VOLCANO_WORDS.filter((item) => item.level === 1).every(
      (item) => lettersOf(item.word).length === 3,
    ),
  );
});

test("étoiles et précision", () => {
  assert.equal(starsFromErrors(0), 3);
  assert.equal(starsFromErrors(4), 2);
  assert.equal(starsFromErrors(20), 1);
  assert.equal(accuracyFrom(10, 0), 1);
  assert.equal(accuracyFrom(10, 10), 0.5);
  assert.equal(accuracyFrom(0, 0), 0);
});
