import Phaser from "phaser";
import type { ActivityEndReason } from "../db/db";
import type { TrainingClock } from "./TrainingClock";
import { getRatingStars } from "./trainingRules";
import { SOUND_HUNT_WORDS, type SoundHuntWord } from "../data/soundHuntWords";

import type { SoundHuntAnswer } from "../data/soundHuntAnswers";

export type { SoundHuntAnswer } from "../data/soundHuntAnswers";

export type SoundHuntResult = {
  endReason?: ActivityEndReason;
  score: number;
  maxScore: number;
  stars: number;
  durationSeconds: number;
  hintsUsed: number;
  answers: SoundHuntAnswer[];
};

type SceneData = {
  avatarUrl: string;
  avatarTextureKey: string;
  trainingClock?: TrainingClock;
  initialStarBalance: number;
  initialAnswers: SoundHuntAnswer[];
  initialHintsUsed: number;
  activityStartedAt: number;

  onRoundValidated: (
    roundIndex: number,
    answer: SoundHuntAnswer,
    totalHints: number,
  ) => Promise<number>;

  onFinish?: (result: SoundHuntResult) => void | Promise<void>;
};

type Phase = "ready" | "speaking" | "answering" | "feedback" | "finished";

export class SoundHuntScene extends Phaser.Scene {
  private readonly words = SOUND_HUNT_WORDS;

  private trainingClock?: TrainingClock;
  private onRoundValidated?: SceneData["onRoundValidated"];
  private onFinish?: SceneData["onFinish"];

  private avatarUrl = "";
  private avatarTextureKey = "";

  private currentRound = 0;
  private score = 0;
  private hintsUsed = 0;
  private startTime = 0;
  private roundStartTime = 0;

  private currentWord!: SoundHuntWord;
  private usedWords = new Set<string>();
  private history: SoundHuntAnswer[] = [];

  private selectedSyllableIndex: number | null = null;
  private replayUsedThisRound = false;

  private ropeContainer!: Phaser.GameObjects.Container;
  private ropeGraphics: Phaser.GameObjects.Graphics[] = [];
  private phase: Phase = "ready";
  private speechGeneration = 0;
  private utterance: SpeechSynthesisUtterance | null = null;

  private starBalance = 0;
  private displayedStars = 0;

  private avatar!: Phaser.GameObjects.Image;
  private background!: Phaser.GameObjects.Image;
  private instructionText!: Phaser.GameObjects.Text;
  private wordText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private starsText!: Phaser.GameObjects.Text;
  private starsIcon!: Phaser.GameObjects.Star;

  private pendingSave: Promise<number> | null = null;
  private stoppingForLimit = false;
  private finishing = false;

  constructor() {
    super("SoundHuntScene");
  }

  init(data: Partial<SceneData> = {}) {
    this.trainingClock = data.trainingClock;
    this.pendingSave = null;
    this.stoppingForLimit = false;
    this.finishing = false;

    this.avatarUrl = data.avatarUrl ?? "";
    this.avatarTextureKey = data.avatarTextureKey ?? "";

    this.onFinish = data.onFinish;
    this.onRoundValidated = data.onRoundValidated;

    this.starBalance = data.initialStarBalance ?? 0;
    this.displayedStars = this.starBalance;

    this.history = (data.initialAnswers ?? []).map((answer) => ({
      ...answer,
      syllables: [...answer.syllables],
    }));

    this.currentRound = this.history.length;
    this.score = this.history.filter((answer) => answer.correct).length;
    this.hintsUsed = data.initialHintsUsed ?? 0;
    this.startTime = data.activityStartedAt ?? Date.now();

    this.restoreUsedWords();

    this.selectedSyllableIndex = null;
    this.replayUsedThisRound = false;
    this.ropeGraphics = [];
    this.phase = "ready";
    this.utterance = null;
  }

  preload() {
    if (!this.textures.exists("sound-hunt-decor")) {
      this.load.image("sound-hunt-decor", "/chasseur-de-sons/images/decor.png");
    }
    if (!this.avatarUrl || !this.avatarTextureKey) {
      throw new Error(
        "L’avatar de l’élève n’a pas été transmis à Chasse au son.",
      );
    }

    if (!this.textures.exists(this.avatarTextureKey)) {
      this.load.image(this.avatarTextureKey, this.avatarUrl);
    }

    if (!this.cache.audio.exists("success")) {
      this.load.audio("success", "/audio/success.mp3");
    }

    if (!this.cache.audio.exists("error")) {
      this.load.audio("error", "/audio/error.mp3");
    }
  }

  create() {
    this.createWorld();
    this.createInterface();

    this.updateResponsiveLayout();

    const onResize = () => {
      this.updateResponsiveLayout();
    };

    this.scale.on("resize", onResize);

    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);

      this.speechGeneration += 1;

      if (this.utterance) {
        this.utterance.onend = null;
        this.utterance.onerror = null;

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }

        this.utterance = null;
      }
    });

    this.trainingClock?.start();

    this.scoreText.setText(`${this.score} / ${this.history.length} réussis`);

    this.startRound();
  }

  private updateResponsiveLayout() {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    if (width <= 0 || height <= 0) return;

    // Même repère que dans le Tambour : 1280 × 720.
    const zoom = Math.min(width / 1280, height / 720);

    const camera = this.cameras.main;

    camera.setViewport(0, 0, width, height);
    camera.setZoom(zoom);
    camera.centerOn(640, 360);

    // Surface réellement visible avec ce zoom.
    const visibleWorldWidth = width / zoom;
    const visibleWorldHeight = height / zoom;

    // Le fond couvre toute la surface sans être déformé.
    const backgroundScale = Math.max(
      visibleWorldWidth / this.background.width,
      visibleWorldHeight / this.background.height,
    );

    this.background
      .setOrigin(0.5)
      .setPosition(640, 360)
      .setScale(backgroundScale);
  }

  private getWordKey(item: { word: string; targetSound: string }) {
    return JSON.stringify([item.word, item.targetSound]);
  }

  private restoreUsedWords() {
    this.usedWords = new Set<string>();

    for (const answer of this.history) {
      if (
        this.words.every((item) => this.usedWords.has(this.getWordKey(item)))
      ) {
        this.usedWords.clear();
      }

      this.usedWords.add(this.getWordKey(answer));
    }
  }

  private getResponseNow() {
    return this.trainingClock?.activityNow() ?? Date.now();
  }

  private createWorld() {
    this.background = this.add
      .image(640, 360, "sound-hunt-decor")
      .setDepth(-10);

    // Ombre sous les pieds de l’avatar.
    this.add.ellipse(185, 514, 145, 30, 0x103c37, 0.28).setDepth(1);

    this.avatar = this.add
      .image(185, 510, this.avatarTextureKey)
      .setOrigin(0.5, 1)
      .setDepth(2);

    this.avatar.setScale(
      Math.min(180 / this.avatar.width, 235 / this.avatar.height),
    );

    // Support discret derrière le mot.
    const wordPanel = this.add.graphics();

    wordPanel.fillStyle(0x103c37, 0.88);
    wordPanel.fillRoundedRect(430, 205, 420, 110, 24);

    wordPanel.lineStyle(3, 0xffe2a0, 0.95);
    wordPanel.strokeRoundedRect(430, 205, 420, 110, 24);

    // Support de la barre de commandes.
    const controlsPanel = this.add.graphics();

    controlsPanel.fillStyle(0x103c37, 0.92);
    controlsPanel.fillRoundedRect(45, 560, 1190, 145, 28);

    controlsPanel.lineStyle(2, 0xffe2a0, 0.85);
    controlsPanel.strokeRoundedRect(45, 560, 1190, 145, 28);
  }

  private createInterface() {
    const panel = this.add.graphics();

    panel.fillStyle(0x103c37, 0.94);
    panel.fillRoundedRect(280, 18, 720, 130, 26);

    panel.lineStyle(3, 0xffe2a0);
    panel.strokeRoundedRect(280, 18, 720, 130, 26);

    this.add
      .text(640, 48, "Chasse au son", {
        fontFamily: "Arial",
        fontSize: "33px",
        fontStyle: "bold",
        color: "#ffe8aa",
      })
      .setOrigin(0.5);

    this.instructionText = this.add
      .text(640, 100, "", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 660 },
      })
      .setOrigin(0.5);

    const rewardPanel = this.add.graphics();

    rewardPanel.fillStyle(0x103c37, 0.94);
    rewardPanel.fillRoundedRect(1015, 20, 250, 105, 20);

    rewardPanel.lineStyle(2, 0xffe2a0);
    rewardPanel.strokeRoundedRect(1015, 20, 250, 105, 20);

    this.scoreText = this.add
      .text(1035, 46, "0 / 0 réussis", {
        fontFamily: "Arial",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffe8aa",
      })
      .setOrigin(0, 0.5);

    this.starsIcon = this.add
      .star(1053, 91, 5, 9, 19, 0xffd34f)
      .setStrokeStyle(2, 0xfff4bd);

    this.starsText = this.add
      .text(1085, 91, `${this.starBalance}`, {
        fontFamily: "Arial",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffe278",
        stroke: "#71401c",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5);

    this.wordText = this.add
      .text(640, 260, "", {
        fontFamily: "Arial",
        fontSize: "64px",
        fontStyle: "bold",
        color: "#fff3c4",
        stroke: "#174339",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.createButton(
      200,
      620,
      240,
      "👂",
      0xf4ce78,
      () => this.replayWord(),
      44,
    );

    this.ropeContainer = this.add.container(640, 375).setDepth(5);

    this.createButton(
      1110,
      620,
      200,
      "✓",
      0x94d7b1,
      () => void this.validateRound(),
      44,
    );

    this.add
      .text(
        640,
        690,
        "Touche la boucle où tu entends le son • Valide avec la coche",
        {
          fontFamily: "Arial",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#174339",
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    label: string,
    color: number,
    action: () => void,
    fontSize = 22,
  ): Phaser.GameObjects.Text {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x694829);
    graphics.fillRoundedRect(-width / 2, -23, width, 62, 18);

    graphics.fillStyle(color);
    graphics.fillRoundedRect(-width / 2, -30, width, 62, 18);

    graphics.lineStyle(3, 0xfff1c0);
    graphics.strokeRoundedRect(-width / 2, -30, width, 62, 18);

    const text = this.add
      .text(0, 0, label, {
        fontFamily:
          'Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: "bold",
        color: "#354c35",
      })
      .setOrigin(0.5);

    const container = this.add
      .container(x, y, [graphics, text])
      .setSize(width, 70)
      .setInteractive({ useHandCursor: true });

    container.on("pointerdown", action);

    return text;
  }

  private createSyllableRopes() {
    this.ropeContainer.removeAll(true);
    this.ropeGraphics = [];

    const count = this.currentWord.syllables.length;

    // L’ensemble reste centré et ne dépasse pas 600 pixels.
    const loopWidth = Math.min(150, 600 / count);
    const totalWidth = count * loopWidth;

    for (let index = 0; index < count; index += 1) {
      const x = -totalWidth / 2 + index * loopWidth;

      const graphics = this.add.graphics();

      this.ropeContainer.add(graphics);
      this.ropeGraphics.push(graphics);

      // Toute la surface du U est tactile, pas seulement la corde.
      const zone = this.add
        .zone(x + loopWidth / 2, 40, loopWidth - 8, 100)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerdown", () => {
        this.selectSyllable(index);
      });

      this.ropeContainer.add(zone);
    }

    this.updateSyllableRopes();
  }

  private drawRope(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    width: number,
    color: number,
    thickness: number,
    offsetY = 0,
  ) {
    graphics.lineStyle(thickness, color, 1);
    graphics.beginPath();

    // Une courbe quadratique dessine le creux du U.
    // Le point de contrôle est plus bas que le creux visible.
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x, offsetY),
      new Phaser.Math.Vector2(x + width / 2, 140 + offsetY),
      new Phaser.Math.Vector2(x + width, offsetY),
    );

    const points = curve.getPoints(32);

    graphics.moveTo(points[0].x, points[0].y);

    for (let index = 1; index < points.length; index += 1) {
      graphics.lineTo(points[index].x, points[index].y);
    }

    graphics.strokePath();
  }

  private updateSyllableRopes(showCorrection = false) {
    const count = this.ropeGraphics.length;

    if (count === 0) return;

    const loopWidth = Math.min(150, 600 / count);
    const totalWidth = count * loopWidth;

    this.ropeGraphics.forEach((graphics, index) => {
      graphics.clear();

      const x = -totalWidth / 2 + index * loopWidth;
      const selected = index === this.selectedSyllableIndex;
      const correct = index === this.currentWord.targetSyllableIndex;

      let color = selected ? 0xffd34f : 0xe5bd7a;

      if (showCorrection) {
        if (correct) {
          color = 0x94e0aa;
        } else if (selected) {
          color = 0xf4a396;
        }
      }

      // Ombre, contour puis cœur de la corde.
      this.drawRope(graphics, x, loopWidth, 0x173e32, 17, 5);

      this.drawRope(graphics, x, loopWidth, 0x704725, selected ? 17 : 13);

      this.drawRope(graphics, x, loopWidth, color, selected ? 11 : 7);

      // Petits nœuds aux jonctions.
      graphics.fillStyle(0x704725, 1);
      graphics.fillCircle(x, 0, 8);
      graphics.fillCircle(x + loopWidth, 0, 8);

      graphics.fillStyle(color, 1);
      graphics.fillCircle(x, 0, 5);
      graphics.fillCircle(x + loopWidth, 0, 5);

      // Repère supplémentaire pour la sélection.
      if (selected) {
        graphics.fillStyle(color, 1);
        graphics.fillCircle(x + loopWidth / 2, 94, 6);
      }
    });
  }

  private selectSyllable(index: number) {
    if (this.phase !== "answering") return;
    if (this.stoppingForLimit || this.finishing) return;

    this.selectedSyllableIndex = index;

    this.updateSyllableRopes();
  }

  private drawWord(): SoundHuntWord {
    if (this.words.length === 0) {
      throw new Error("Le catalogue de Chasse au son est vide.");
    }

    let candidates = this.words.filter(
      (item) => !this.usedWords.has(this.getWordKey(item)),
    );

    if (candidates.length === 0) {
      this.usedWords.clear();
      candidates = [...this.words];
    }

    // Évite le même mot deux fois de suite si une alternative existe.
    const previousWord = this.history[this.history.length - 1]?.word;

    const alternatives = candidates.filter(
      (item) => item.word !== previousWord,
    );

    const pool = alternatives.length > 0 ? alternatives : candidates;

    const selected = pool[Phaser.Math.Between(0, pool.length - 1)];

    this.usedWords.add(this.getWordKey(selected));

    return selected;
  }

  private startRound() {
    if (this.phase === "finished" || this.stoppingForLimit) {
      return;
    }

    if (this.trainingClock?.sessionExpired()) {
      void this.stopForSessionLimit();
      return;
    }

    if (this.trainingClock?.budgetReached()) {
      void this.finish("time_budget");
      return;
    }

    this.currentWord = this.drawWord();
    this.selectedSyllableIndex = null;
    this.replayUsedThisRound = false;

    this.phase = "ready";

    this.wordText.setText(this.currentWord.word);
    this.wordText.setScale(1);

    // Garde une marge de 30 pixels de chaque côté du panneau.
    if (this.wordText.width > 360) {
      this.wordText.setScale(360 / this.wordText.width);
    }

    this.createSyllableRopes();

    this.instructionText
      .setText(
        `Trouve le son « ${this.currentWord.targetSound} » dans le mot « ${this.currentWord.word} ».\n` +
          `Où entends-tu le son « ${this.currentWord.targetSound} » ?`,
      )
      .setFontSize(22)
      .setColor("#baffbf");

    this.time.delayedCall(500, () => {
      if (this.phase !== "ready" || this.stoppingForLimit) {
        return;
      }

      this.speakRound();
    });
  }

  private speakRound() {
    if (this.phase !== "ready" || this.stoppingForLimit || this.finishing) {
      return;
    }

    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      this.instructionText.setText(
        "La voix n’est pas disponible sur cet appareil.",
      );
      return;
    }

    this.phase = "speaking";

    const instruction =
      `Trouve le son « ${this.currentWord.targetSound} » ` +
      `dans le mot « ${this.currentWord.word} ».\n` +
      `Où entends-tu le son « ${this.currentWord.targetSound} » ?`;

    this.instructionText
      .setText(instruction)
      .setFontSize(22)
      .setColor("#ffffff");

    const generation = ++this.speechGeneration;

    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();

    const voice =
      voices.find(
        (item) => item.lang.toLowerCase() === "fr-fr" && item.localService,
      ) ??
      voices.find((item) => item.lang.toLowerCase() === "fr-fr") ??
      voices.find((item) => item.lang.toLowerCase().startsWith("fr"));

    const parts = [
      {
        text: "Trouve le son.",
        rate: 0.8,
        pauseAfterMs: 400,
      },
      {
        text: this.currentWord.targetSound,
        rate: 0.65,
        pauseAfterMs: 600,
      },
      {
        text: "Dans le mot.",
        rate: 0.8,
        pauseAfterMs: 300,
      },
      {
        text: this.currentWord.word,
        rate: 0.75,
        pauseAfterMs: 0,
      },
    ];

    const isCurrent = () =>
      generation === this.speechGeneration &&
      this.sys.isActive() &&
      !this.stoppingForLimit &&
      !this.finishing;

    const showSpeechError = () => {
      if (!isCurrent()) return;

      this.utterance = null;
      this.phase = "ready";

      this.instructionText
        .setText("La lecture n’a pas pu se terminer. Appuie sur l’oreille.")
        .setColor("#ffe2a0");
    };

    const speakPart = (index: number) => {
      if (!isCurrent()) return;

      if (index >= parts.length) {
        this.utterance = null;
        this.phase = "answering";
        this.roundStartTime = this.getResponseNow();

        this.instructionText.setText(instruction).setColor("#baffbf");

        return;
      }

      const part = parts[index];

      const utterance = new SpeechSynthesisUtterance(part.text);

      utterance.lang = "fr-FR";
      utterance.rate = part.rate;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (!isCurrent()) return;

        this.utterance = null;

        if (part.pauseAfterMs > 0) {
          this.time.delayedCall(part.pauseAfterMs, () => {
            speakPart(index + 1);
          });
        } else {
          speakPart(index + 1);
        }
      };

      utterance.onerror = (event) => {
        if (!isCurrent()) return;

        console.error("Erreur de synthèse vocale :", event.error);

        showSpeechError();
      };

      this.utterance = utterance;

      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Démarrage de la voix impossible :", error);
        showSpeechError();
      }
    };

    // Ne force pas la reprise vocale si l’utilisateur a mis en pause.
    if (!this.trainingClock?.isPaused()) {
      window.speechSynthesis.resume();
    }

    speakPart(0);
  }

  private replayWord() {
    if (this.stoppingForLimit || this.finishing) return;

    if (this.phase === "ready") {
      this.speakRound();
      return;
    }

    if (this.phase !== "answering") return;

    this.hintsUsed += 1;

    if (!("speechSynthesis" in window)) return;

    this.replayUsedThisRound = true;

    const generation = ++this.speechGeneration;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(this.currentWord.word);

    utterance.lang = "fr-FR";
    utterance.rate = 0.8;

    const voices = window.speechSynthesis.getVoices();

    const voice =
      voices.find(
        (item) => item.lang.toLowerCase() === "fr-fr" && item.localService,
      ) ??
      voices.find((item) => item.lang.toLowerCase() === "fr-fr") ??
      voices.find((item) => item.lang.toLowerCase().startsWith("fr"));

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      if (generation !== this.speechGeneration || !this.sys.isActive()) {
        return;
      }

      this.utterance = null;
    };

    this.utterance = utterance;

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Réécoute impossible :", error);
    }
  }

  private animateStarBalance(newBalance: number) {
    const previousBalance = this.displayedStars;
    const gainedStars = Math.max(0, newBalance - this.starBalance);

    this.starBalance = newBalance;

    this.tweens.addCounter({
      from: previousBalance,
      to: newBalance,
      duration: 900,
      ease: "Linear",

      onUpdate: (tween) => {
        const value = tween.getValue();

        if (value === null) return;

        this.displayedStars = Math.floor(value);
        this.starsText.setText(`${this.displayedStars}`);
      },

      onComplete: () => {
        this.displayedStars = newBalance;
        this.starsText.setText(`${newBalance}`);
      },
    });

    if (gainedStars === 0) return;

    this.tweens.killTweensOf(this.starsIcon);
    this.starsIcon.setScale(1);

    this.tweens.add({
      targets: this.starsIcon,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });

    const bonusText = this.add
      .text(
        1135,
        160,
        `+${gainedStars} étoile${gainedStars > 1 ? "s" : ""} !`,
        {
          fontFamily: "Arial",
          fontSize: "27px",
          fontStyle: "bold",
          color: "#ffe278",
          stroke: "#174339",
          strokeThickness: 5,
        },
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: bonusText,
      y: 135,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => bonusText.destroy(),
    });
  }

  private playFeedbackSound(correct: boolean) {
    const key = correct ? "success" : "error";

    if (!this.cache.audio.exists(key)) {
      console.warn(`Son indisponible : ${key}`);
      return;
    }

    this.sound.play(key);
  }

  private animateAvatarSuccess() {
    this.tweens.killTweensOf(this.avatar);

    this.tweens.add({
      targets: this.avatar,
      y: "-=55",
      duration: 260,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  private async validateRound(): Promise<void> {
    if (this.phase !== "answering" || this.stoppingForLimit || this.finishing) {
      return;
    }

    if (this.selectedSyllableIndex === null) {
      this.instructionText
        .setText("Touche d’abord la boucle où tu entends le son.")
        .setColor("#ffe2a0");

      return;
    }

    this.phase = "feedback";

    // Arrête une éventuelle réécoute avant le feedback.
    this.speechGeneration += 1;

    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }

    const correct =
      this.selectedSyllableIndex === this.currentWord.targetSyllableIndex;

    const answer: SoundHuntAnswer = {
      contentId: this.currentWord.contentId,
      contentVersion: this.currentWord.contentVersion,
      word: this.currentWord.word,
      targetSound: this.currentWord.targetSound,
      syllables: [...this.currentWord.syllables],
      targetSyllableIndex: this.currentWord.targetSyllableIndex,
      selectedSyllableIndex: this.selectedSyllableIndex,
      correct,
      responseTimeMs: this.getResponseNow() - this.roundStartTime,
      replayUsed: this.replayUsedThisRound,
    };

    try {
      if (!this.onRoundValidated) {
        throw new Error("La sauvegarde des réponses n’est pas configurée.");
      }

      this.pendingSave = this.onRoundValidated(
        this.currentRound,
        answer,
        this.hintsUsed,
      );

      const balance = await this.pendingSave;

      if (!this.sys.isActive()) return;

      if (correct) {
        this.score += 1;
      }

      this.history.push(answer);
      this.currentRound += 1;

      if (!this.stoppingForLimit) {
        this.animateStarBalance(balance);

        if (correct) {
          this.animateAvatarSuccess();
        }
      }
    } catch (error) {
      console.error("Sauvegarde du round impossible :", error);

      if (!this.sys.isActive() || this.stoppingForLimit) {
        return;
      }

      this.phase = "answering";

      this.instructionText
        .setText("Sauvegarde impossible. Appuie sur la coche pour réessayer.")
        .setColor("#ffe2a0");

      return;
    } finally {
      this.pendingSave = null;
    }

    if (this.stoppingForLimit) return;

    this.playFeedbackSound(correct);
    this.updateSyllableRopes(true);

    const loopNumber = this.currentWord.targetSyllableIndex + 1;

    this.instructionText
      .setText(
        correct
          ? `Bravo ! Tu as trouvé la bonne syllabe.\n` +
              `Le son « ${this.currentWord.targetSound} » est dans la boucle ${loopNumber}.`
          : `Regarde la boucle verte.\n` +
              `Le son « ${this.currentWord.targetSound} » est dans la boucle ${loopNumber}.`,
      )
      .setColor(correct ? "#baffbf" : "#ffe2a0");

    this.scoreText.setText(`${this.score} / ${this.history.length} réussis`);

    this.time.delayedCall(3000, () => {
      this.startRound();
    });
  }

  public async stopForSessionLimit(): Promise<void> {
    if (this.stoppingForLimit || this.finishing) {
      return;
    }

    this.stoppingForLimit = true;
    this.input.enabled = false;

    this.time.removeAllEvents();
    this.sound.stopAll();

    this.speechGeneration += 1;

    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const pending = this.pendingSave;

    if (pending) {
      await pending;
    }

    await this.finish("session_time_limit");
  }

  private async finish(endReason?: ActivityEndReason): Promise<void> {
    if (this.finishing) return;

    this.finishing = true;
    this.phase = "finished";
    this.input.enabled = false;

    const maxScore = this.history.length;

    const stars = getRatingStars(this.score, maxScore);

    await this.onFinish?.({
      score: this.score,
      maxScore,
      stars,
      durationSeconds: this.trainingClock
        ? this.trainingClock.activityNow() / 1000
        : Math.round((Date.now() - this.startTime) / 1000),
      hintsUsed: this.hintsUsed,
      answers: this.history,
      endReason,
    });

    if (this.sys.isActive()) {
      this.scene.stop();
    }
  }
}
