import Phaser from "phaser";
import { cancelSpeech, speak } from "../../services/speech";
import {
  accuracyFrom,
  buildColumns,
  lettersOf,
  pickWords,
  starsFromErrors,
  type VolcanoWord,
} from "./volcanoLogic";

export type VolcanoResult = {
  stars: number;
  accuracy: number;
};

export type VolcanoSceneData = {
  level: number;
  rounds: number;
  /** Personnage du joueur (provisoirement son avatar emoji). */
  avatarEmoji: string;
  onFinish: (result: VolcanoResult) => void;
};

type Tile = {
  letter: string;
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
};

type TileState = "normal" | "correct" | "wrong";

const WIDTH = 1280;
const HEIGHT = 720;
const TILE_W = 120;
const TILE_H = 100;
const START_X = 130;
const START_Y = 470;
const FONT = '"Nunito", ui-rounded, system-ui, sans-serif';

export class VolcanoBridgeScene extends Phaser.Scene {
  private level = 1;
  private roundsCount = 5;
  private avatarEmoji = "🦊";
  private onFinish?: VolcanoSceneData["onFinish"];

  private words: VolcanoWord[] = [];
  private roundIndex = 0;
  private letters: string[] = [];
  private position = 0;
  private errorsThisPosition = 0;

  private totalLetters = 0;
  private totalErrors = 0;

  private locked = true;
  private alive = true;

  private tiles: Tile[][] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private roundObjects: Phaser.GameObjects.GameObject[] = [];

  private character!: Phaser.GameObjects.Container;
  private characterBody!: Phaser.GameObjects.Text;
  private clueText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  constructor() {
    super("VolcanoBridgeScene");
  }

  init(data: VolcanoSceneData) {
    this.level = data.level;
    this.roundsCount = data.rounds;
    this.avatarEmoji = data.avatarEmoji;
    this.onFinish = data.onFinish;

    this.words = pickWords(this.level, this.roundsCount);
    this.roundIndex = 0;
    this.totalLetters = 0;
    this.totalErrors = 0;
    this.locked = true;
    this.alive = true;
    this.tiles = [];
    this.slotTexts = [];
    this.roundObjects = [];
  }

  create() {
    this.events.once("shutdown", () => {
      this.alive = false;
      cancelSpeech();
    });

    this.createBackground();
    this.createHud();
    this.createCharacter();

    this.startRound();
  }

  // ---------- Décor (formes provisoires, à remplacer par les vraies images) ----------

  private createBackground() {
    const sky = this.add.graphics();
    sky.fillStyle(0x2b0f0a, 1);
    sky.fillRect(0, 0, WIDTH, HEIGHT);

    // Parois de la grotte
    sky.fillStyle(0x170705, 1);
    sky.fillTriangle(0, 0, 260, 0, 0, 380);
    sky.fillTriangle(WIDTH, 0, WIDTH - 300, 0, WIDTH, 330);
    sky.fillTriangle(0, HEIGHT, 0, 560, 200, HEIGHT);

    // Lave : bandes de couleurs qui respirent
    const bands = [0x7d1d0b, 0xb3360d, 0xe0561a, 0xf58a2b];

    bands.forEach((color, index) => {
      const band = this.add.rectangle(
        WIDTH / 2,
        330 + index * 95,
        WIDTH,
        110,
        color,
        0.9,
      );

      this.tweens.add({
        targets: band,
        alpha: 0.65,
        duration: 1200 + index * 260,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });

    // Bulles de lave
    for (let i = 0; i < 16; i += 1) {
      const x = Phaser.Math.Between(40, WIDTH - 40);
      const y = Phaser.Math.Between(380, HEIGHT - 30);
      const bubble = this.add.circle(x, y, Phaser.Math.Between(5, 14), 0xffc14d, 0.7);

      this.tweens.add({
        targets: bubble,
        y: y - Phaser.Math.Between(30, 70),
        alpha: 0,
        scale: 1.6,
        duration: Phaser.Math.Between(1400, 2600),
        delay: Phaser.Math.Between(0, 1800),
        repeat: -1,
        ease: "Sine.easeOut",
      });
    }
  }

  private createHud() {
    // Bouton « réécouter le mot »
    const speaker = this.add.container(1100, 70);
    const speakerGraphics = this.add.graphics();

    speakerGraphics.fillStyle(0x000000, 0.35);
    speakerGraphics.fillCircle(0, 6, 46);
    speakerGraphics.fillStyle(0xff7a1a, 1);
    speakerGraphics.fillCircle(0, 0, 46);

    const speakerIcon = this.add
      .text(0, 0, "🔊", { fontFamily: FONT, fontSize: "44px" })
      .setOrigin(0.5);

    speaker.add([speakerGraphics, speakerIcon]);

    const speakerZone = this.add
      .zone(1100, 70, 100, 100)
      .setInteractive({ useHandCursor: true });

    speakerZone.on("pointerdown", () => {
      if (this.words[this.roundIndex]) {
        void this.sayCurrentWord();
      }
    });

    this.clueText = this.add
      .text(1190, 72, "", { fontFamily: FONT, fontSize: "76px" })
      .setOrigin(0.5);

    this.counterText = this.add
      .text(60, 40, "", {
        fontFamily: FONT,
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffe2c2",
      })
      .setOrigin(0, 0.5);

    this.messageText = this.add
      .text(WIDTH / 2, 690, "", {
        fontFamily: FONT,
        fontSize: "34px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#2b0f0a",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
  }

  private createCharacter() {
    this.characterBody = this.add
      .text(0, 0, this.avatarEmoji, { fontFamily: FONT, fontSize: "88px" })
      .setOrigin(0.5, 0.85);

    this.character = this.add.container(START_X, START_Y, [this.characterBody]);
    this.character.setDepth(10);
  }

  // ---------- Déroulement d'une manche ----------

  private startRound() {
    for (const object of this.roundObjects) object.destroy();

    this.roundObjects = [];
    this.tiles = [];
    this.slotTexts = [];

    const item = this.words[this.roundIndex];

    this.letters = lettersOf(item.word);
    this.position = 0;
    this.errorsThisPosition = 0;

    this.clueText.setText(item.emoji);
    this.counterText.setText(`Mot ${this.roundIndex + 1} sur ${this.words.length}`);
    this.messageText.setText("Écoute le mot…");

    this.character.setPosition(START_X, START_Y);

    this.buildSlots();
    this.buildTiles(item);

    this.locked = true;

    this.time.delayedCall(350, () => {
      if (!this.alive) return;

      void this.sayCurrentWord().then(() => {
        if (!this.alive) return;

        this.locked = false;
        this.messageText.setText("Touche les bonnes lettres !");
      });
    });
  }

  private sayCurrentWord(): Promise<void> {
    const item = this.words[this.roundIndex];

    return speak(item.spoken ?? item.word);
  }

  private buildSlots() {
    const count = this.letters.length;
    const gap = 78;
    const startX = WIDTH / 2 - ((count - 1) * gap) / 2 - 120;

    for (let i = 0; i < count; i += 1) {
      const x = startX + i * gap;
      const box = this.add.graphics();

      box.fillStyle(0x000000, 0.4);
      box.fillRoundedRect(x - 32, 40, 64, 76, 14);
      box.lineStyle(4, 0xffe2c2, 0.9);
      box.strokeRoundedRect(x - 32, 34, 64, 76, 14);

      const text = this.add
        .text(x, 72, "", {
          fontFamily: FONT,
          fontSize: "52px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      this.slotTexts.push(text);
      this.roundObjects.push(box, text);
    }
  }

  private buildTiles(item: VolcanoWord) {
    const columns = buildColumns(item.word, this.level);
    const count = columns.length;
    const columnGap = Math.min(170, 880 / Math.max(1, count - 1));
    const totalWidth = (count - 1) * columnGap;
    const firstX = 300 + (880 - totalWidth) / 2;

    columns.forEach((column, columnIndex) => {
      const x = firstX + columnIndex * columnGap;
      const rows = column.length;
      const ys = column.map((_, row) =>
        rows === 1 ? 440 : 270 + (row * 330) / (rows - 1),
      );

      this.tiles[columnIndex] = column.map((letter, row) =>
        this.createTile(letter, x, ys[row], columnIndex),
      );
    });
  }

  private createTile(letter: string, x: number, y: number, column: number): Tile {
    const graphics = this.add.graphics();
    const label = this.add
      .text(0, -4, letter, {
        fontFamily: FONT,
        fontSize: "68px",
        fontStyle: "bold",
        color: "#2a1a14",
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [graphics, label]);
    const zone = this.add
      .zone(x, y, TILE_W, TILE_H)
      .setInteractive({ useHandCursor: true });

    const tile: Tile = { letter, x, y, container, graphics, zone };

    this.drawTile(tile, "normal");

    zone.on("pointerdown", () => this.onTilePressed(tile, column));

    this.roundObjects.push(container, zone);

    return tile;
  }

  private drawTile(tile: Tile, state: TileState) {
    const colors: Record<TileState, { body: number; top: number }> = {
      normal: { body: 0xcdb8a4, top: 0xeadccb },
      correct: { body: 0x3fbf6b, top: 0x8be3a8 },
      wrong: { body: 0xe5484d, top: 0xff8a8e },
    };

    const { body, top } = colors[state];
    const g = tile.graphics;

    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-TILE_W / 2, -TILE_H / 2 + 9, TILE_W, TILE_H, 22);
    g.fillStyle(body, 1);
    g.fillRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 22);
    g.fillStyle(top, 1);
    g.fillRoundedRect(-TILE_W / 2 + 6, -TILE_H / 2 + 6, TILE_W - 12, 22, 12);
  }

  // ---------- Réponses ----------

  private onTilePressed(tile: Tile, column: number) {
    if (this.locked || column !== this.position) return;

    if (tile.letter === this.letters[column]) {
      this.onCorrect(tile, column);
    } else {
      this.onWrong(tile, column);
    }
  }

  private onCorrect(tile: Tile, column: number) {
    this.locked = true;
    this.totalLetters += 1;
    this.errorsThisPosition = 0;

    this.drawTile(tile, "correct");
    this.slotTexts[column].setText(tile.letter);
    this.messageText.setText("Bien !");

    // Saut vers la dalle : déplacement horizontal + arc vertical.
    this.tweens.add({
      targets: this.character,
      x: tile.x,
      y: tile.y,
      duration: 460,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: this.characterBody,
      y: -90,
      duration: 230,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    this.time.delayedCall(520, () => {
      if (!this.alive) return;

      this.position += 1;

      if (this.position >= this.letters.length) {
        this.finishWord();
      } else {
        this.locked = false;
      }
    });
  }

  private onWrong(tile: Tile, column: number) {
    this.totalErrors += 1;
    this.errorsThisPosition += 1;

    this.drawTile(tile, "wrong");
    tile.zone.disableInteractive();
    this.cameras.main.shake(140, 0.004);
    this.messageText.setText("Oups, essaie encore !");

    // La dalle fausse tombe dans la lave.
    this.tweens.add({
      targets: tile.container,
      y: tile.y + 160,
      alpha: 0,
      duration: 520,
      ease: "Quad.easeIn",
    });

    if (this.errorsThisPosition >= 2) {
      // Aide : on redit le mot et on fait briller la bonne dalle.
      void this.sayCurrentWord();

      const right = this.tiles[column].find(
        (item) => item.letter === this.letters[column],
      );

      if (right) {
        this.tweens.add({
          targets: right.container,
          scale: 1.15,
          duration: 260,
          yoyo: true,
          repeat: 3,
          ease: "Sine.easeInOut",
        });
      }
    }
  }

  private finishWord() {
    this.messageText.setText("Bravo !");
    this.confetti();

    this.time.delayedCall(300, () => {
      if (!this.alive) return;

      void this.sayCurrentWord();
    });

    this.time.delayedCall(2200, () => {
      if (!this.alive) return;

      this.roundIndex += 1;

      if (this.roundIndex >= this.words.length) {
        this.finishGame();
      } else {
        this.startRound();
      }
    });
  }

  private confetti() {
    const colors = [0xff7a1a, 0xffd23f, 0x3fbf6b, 0x4db8ff, 0xff6bb5];

    for (let i = 0; i < 36; i += 1) {
      const piece = this.add.rectangle(
        Phaser.Math.Between(300, 1180),
        Phaser.Math.Between(-30, 80),
        Phaser.Math.Between(10, 18),
        Phaser.Math.Between(16, 26),
        Phaser.Math.RND.pick(colors),
      );

      piece.setDepth(30);
      piece.setAngle(Phaser.Math.Between(0, 180));

      this.tweens.add({
        targets: piece,
        y: HEIGHT + 40,
        angle: piece.angle + Phaser.Math.Between(180, 540),
        duration: Phaser.Math.Between(1100, 1900),
        delay: Phaser.Math.Between(0, 300),
        ease: "Quad.easeIn",
        onComplete: () => piece.destroy(),
      });
    }
  }

  private finishGame() {
    this.locked = true;

    this.onFinish?.({
      stars: starsFromErrors(this.totalErrors),
      accuracy: accuracyFrom(this.totalLetters, this.totalErrors),
    });
  }
}
