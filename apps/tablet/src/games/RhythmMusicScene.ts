import Phaser from "phaser";
import type { ActivityEndReason } from "../db/db";
import type { TrainingClock } from "./TrainingClock";
import { getRatingStars } from "./trainingRules";
import {
  RHYTHM_MUSIC_WORDS,
  type RhythmMusicWord,
} from "../data/rhythmMusicWords";

export type RhythmMusicAnswer = {
  contentId: string;
  contentVersion: number;
  word: string;
  displaySyllables: string[];
  spokenSyllables: string[];
  expectedTaps: number;
  studentTaps: number;
  excellentHits: number;
  goodHits: number;
  hits: number;
  correct: boolean;
  responseTimeMs: number;
  replayUsed: boolean;
};

export type RhythmMusicResult = {
  endReason?: ActivityEndReason;
  score: number;
  maxScore: number;
  stars: number;
  durationSeconds: number;
  hintsUsed: number;
  answers: RhythmMusicAnswer[];
};

type SceneData = {
  avatarUrl: string;
  avatarTextureKey: string;
  trainingClock?: TrainingClock;
  initialStarBalance: number;
  initialAnswers: RhythmMusicAnswer[];
  initialHintsUsed: number;
  activityStartedAt: number;

  onRoundValidated: (
    roundIndex: number,
    answer: RhythmMusicAnswer,
    totalHints: number,
  ) => Promise<number>;

  onFinish?: (result: RhythmMusicResult) => void | Promise<void>;
};

type MarkerQuality = "excellent" | "good" | "missed" | null;

type Marker = {
  container: Phaser.GameObjects.Container;
  displaySyllable: string;
  spokenSyllable: string;
  targetTime: number;
  hit: boolean;
  missed: boolean;
  quality: MarkerQuality;
};

type Phase = "ready" | "speaking" | "playing" | "feedback" | "finished";

const HIT_ZONE_X = 220;
const HIT_ZONE_Y = 430;
const SPAWN_X = 1400;
const TRAVEL_MS = 2200;

const EXCELLENT_WINDOW_MS = 120;
const GOOD_WINDOW_MS = 260;

export class RhythmMusicScene extends Phaser.Scene {
  private readonly words = RHYTHM_MUSIC_WORDS;

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

  private currentWord!: RhythmMusicWord;
  private usedWords = new Set<string>();
  private history: RhythmMusicAnswer[] = [];

  private markers: Marker[] = [];
  private studentTaps = 0;
  private excellentHits = 0;
  private goodHits = 0;
  private hits = 0;
  private replayUsedThisRound = false;

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
  private answerText!: Phaser.GameObjects.Text;

  private hitZone!: Phaser.GameObjects.Arc;

  private pendingSave: Promise<number> | null = null;
  private stoppingForLimit = false;
  private finishing = false;

  constructor() {
    super("RhythmMusicScene");
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
      displaySyllables: [...answer.displaySyllables],
      spokenSyllables: [...answer.spokenSyllables],
    }));

    this.currentRound = this.history.length;
    this.score = this.history.filter((answer) => answer.correct).length;
    this.hintsUsed = data.initialHintsUsed ?? 0;
    this.startTime = data.activityStartedAt ?? Date.now();

    this.restoreUsedWords();

    this.markers = [];
    this.studentTaps = 0;
    this.excellentHits = 0;
    this.goodHits = 0;
    this.hits = 0;
    this.replayUsedThisRound = false;
    this.phase = "ready";
    this.utterance = null;
  }

  preload() {
    if (!this.textures.exists("rhythm-music-decor")) {
      this.load.image(
        "rhythm-music-decor",
        "/tambour-des-sons/images/decor.png",
      );
    }

    if (!this.avatarUrl || !this.avatarTextureKey) {
      throw new Error(
        "L’avatar de l’élève n’a pas été transmis au Rythme musical.",
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

    if (!this.cache.audio.exists("rhythm-tap")) {
      this.load.audio("rhythm-tap", "/audio/clap.mp3");
    }
  }

  create() {
    this.createWorld();
    this.createInterface();
    this.updateResponsiveLayout();

    const onResize = () => this.updateResponsiveLayout();

    this.scale.on("resize", onResize);

    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
      this.cancelSpeech();
    });

    this.trainingClock?.start();

    this.scoreText.setText(`${this.score} / ${this.history.length} réussis`);

    this.startRound();
  }

  private updateResponsiveLayout() {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    if (width <= 0 || height <= 0) return;

    const zoom = Math.min(width / 1280, height / 720);

    this.cameras.main
      .setViewport(0, 0, width, height)
      .setZoom(zoom)
      .centerOn(640, 360);

    const visibleWidth = width / zoom;
    const visibleHeight = height / zoom;

    this.background
      .setPosition(640, 360)
      .setScale(
        Math.max(
          visibleWidth / this.background.width,
          visibleHeight / this.background.height,
        ),
      );
  }

  private getWordKey(item: RhythmMusicWord) {
    return item.contentId;
  }

  private restoreUsedWords() {
    this.usedWords = new Set(this.history.map((answer) => answer.contentId));
  }

  private getResponseNow() {
    return this.trainingClock?.activityNow() ?? Date.now();
  }

  private getBeatMs() {
    return 60000 / this.currentWord.bpm;
  }

  private cancelSpeech() {
    this.speechGeneration += 1;

    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  private createWorld() {
    this.background = this.add
      .image(640, 360, "rhythm-music-decor")
      .setDepth(-10);

    this.add.ellipse(185, 514, 145, 30, 0x103c37, 0.28).setDepth(1);

    this.avatar = this.add
      .image(185, 510, this.avatarTextureKey)
      .setOrigin(0.5, 1)
      .setDepth(2);

    this.avatar.setScale(
      Math.min(180 / this.avatar.width, 235 / this.avatar.height),
    );

    this.createHitZone();
  }

  private createHitZone() {
    this.hitZone = this.add
      .circle(HIT_ZONE_X, HIT_ZONE_Y, 100, 0x174339, 0.35)
      .setStrokeStyle(8, 0xffe278)
      .setDepth(5);

    this.add
      .text(HIT_ZONE_X, HIT_ZONE_Y, "TAPE ICI", {
        fontFamily: "Arial",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#fff3c4",
        stroke: "#174339",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.tweens.add({
      targets: this.hitZone,
      scale: { from: 1, to: 1.08 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createInterface() {
    const panel = this.add.graphics();

    panel.fillStyle(0x103c37, 0.94);
    panel.fillRoundedRect(280, 18, 720, 130, 26);
    panel.lineStyle(3, 0xffe2a0);
    panel.strokeRoundedRect(280, 18, 720, 130, 26);

    this.add
      .text(640, 48, "Rythme musical", {
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
      .text(640, 250, "", {
        fontFamily: "Arial",
        fontSize: "58px",
        fontStyle: "bold",
        color: "#fff3c4",
        stroke: "#174339",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.answerText = this.add
      .text(640, 330, "", {
        fontFamily: "Arial",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#174339",
        padding: { x: 18, y: 9 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.createButton(
      200,
      620,
      240,
      "👂",
      0xf4ce78,
      () => this.replayWord(),
      44,
    );

    this.createButton(
      640,
      620,
      320,
      "🥁",
      0x94d7b1,
      () => this.handleTap(),
      44,
    );

    this.add
      .text(
        640,
        690,
        "Écoute le mot • Tape sur le tambour quand une syllabe entre dans le cercle",
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

  private drawWord(): RhythmMusicWord {
    if (this.words.length === 0) {
      throw new Error("Le catalogue du Rythme musical est vide.");
    }

    let candidates = this.words.filter(
      (item) => !this.usedWords.has(this.getWordKey(item)),
    );

    if (candidates.length === 0) {
      this.usedWords.clear();
      candidates = [...this.words];
    }

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

    this.markers = [];
    this.studentTaps = 0;
    this.excellentHits = 0;
    this.goodHits = 0;
    this.hits = 0;
    this.replayUsedThisRound = false;

    this.phase = "ready";

    this.wordText.setText(this.currentWord.word);
    this.answerText.setVisible(false);
    this.answerText.setText("");

    this.instructionText
      .setText(
        `Écoute « ${this.currentWord.word} ».\n` +
          `Tape sur le tambour quand une syllabe entre dans le cercle jaune.`,
      )
      .setColor("#baffbf");

    this.time.delayedCall(500, () => {
      if (this.phase !== "ready" || this.stoppingForLimit) {
        return;
      }

      this.speakWord();
    });
  }

  private speakWord() {
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

    const generation = ++this.speechGeneration;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(this.currentWord.word);

    utterance.lang = "fr-FR";
    utterance.rate = 0.8;

    const voice = this.getFrenchVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      if (generation !== this.speechGeneration || !this.sys.isActive()) {
        return;
      }

      this.utterance = null;
      this.startMarkers();
    };

    utterance.onerror = () => {
      if (generation !== this.speechGeneration || !this.sys.isActive()) {
        return;
      }

      this.utterance = null;
      this.phase = "ready";

      this.instructionText
        .setText("La voix n’a pas pu démarrer. Appuie sur l’oreille.")
        .setColor("#ffe2a0");
    };

    this.utterance = utterance;

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch {
      this.utterance = null;
      this.phase = "ready";
    }
  }

  private speakSyllable(syllable: string) {
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(syllable);

    utterance.lang = "fr-FR";
    utterance.rate = 0.75;
    utterance.volume = 0.9;

    const voice = this.getFrenchVoice();

    if (voice) {
      utterance.voice = voice;
    }

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      // La synthèse vocale peut être indisponible sur certains appareils.
    }
  }

  private getFrenchVoice(): SpeechSynthesisVoice | null {
    if (!("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();

    return (
      voices.find(
        (item) => item.lang.toLowerCase() === "fr-fr" && item.localService,
      ) ??
      voices.find((item) => item.lang.toLowerCase() === "fr-fr") ??
      voices.find((item) => item.lang.toLowerCase().startsWith("fr")) ??
      null
    );
  }

  private replayWord() {
    if (this.stoppingForLimit || this.finishing) return;

    if (this.phase === "ready") {
      this.speakWord();
      return;
    }

    if (this.phase !== "playing") return;

    this.hintsUsed += 1;
    this.replayUsedThisRound = true;

    this.speakWord();
  }

  private startMarkers() {
    this.phase = "playing";
    this.roundStartTime = this.getResponseNow();

    const beatMs = this.getBeatMs();

    this.instructionText
      .setText(
        `Tape sur 🥁 pour chaque syllabe : ${this.currentWord.displaySyllables.join(" • ")}`,
      )
      .setColor("#baffbf");

    this.currentWord.displaySyllables.forEach((displaySyllable, index) => {
      const spokenSyllable = this.currentWord.spokenSyllables[index];

      const targetTime = this.time.now + TRAVEL_MS + index * beatMs;

      this.time.delayedCall(index * beatMs, () => {
        if (this.phase !== "playing" || this.stoppingForLimit) return;

        if (spokenSyllable) {
          this.speakSyllable(spokenSyllable);
        }

        this.createMarker(displaySyllable, spokenSyllable, targetTime);
      });
    });

    const endDelay =
      this.currentWord.displaySyllables.length * beatMs + TRAVEL_MS + 500;

    this.time.delayedCall(endDelay, () => {
      if (this.phase !== "playing" || this.stoppingForLimit) return;

      void this.validateRound();
    });
  }

  private createMarker(
    displaySyllable: string,
    spokenSyllable: string,
    targetTime: number,
  ) {
    const container = this.add.container(SPAWN_X, HIT_ZONE_Y);

    const circle = this.add.circle(0, 0, 62, 0xffd36a);
    circle.setStrokeStyle(6, 0xfff1bc);

    const label = this.add
      .text(0, 0, displaySyllable, {
        fontFamily: "Arial",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#55351e",
      })
      .setOrigin(0.5);

    container.add([circle, label]);
    container.setDepth(10);

    const marker: Marker = {
      container,
      displaySyllable,
      spokenSyllable,
      targetTime,
      hit: false,
      missed: false,
      quality: null,
    };

    this.markers.push(marker);

    this.tweens.add({
      targets: container,
      x: HIT_ZONE_X,
      duration: TRAVEL_MS,
      ease: "Linear",
      onComplete: () => {
        marker.missed = true;
        marker.quality = "missed";
      },
    });
  }

  private handleTap() {
    if (this.phase !== "playing" || this.stoppingForLimit) return;

    if (this.cache.audio.exists("rhythm-tap")) {
      this.sound.play("rhythm-tap");
    }

    const now = this.time.now;

    const availableMarker = this.markers
      .filter((marker) => !marker.hit && !marker.missed)
      .sort(
        (a, b) => Math.abs(a.targetTime - now) - Math.abs(b.targetTime - now),
      )[0];

    this.studentTaps += 1;

    this.answerText.setVisible(true);

    if (!availableMarker) {
      this.answerText.setText("Trop tôt !");
      return;
    }

    const difference = Math.abs(now - availableMarker.targetTime);

    let quality: MarkerQuality;

    if (difference <= EXCELLENT_WINDOW_MS) {
      quality = "excellent";
    } else if (difference <= GOOD_WINDOW_MS) {
      quality = "good";
    } else {
      quality = "missed";
    }

    availableMarker.hit = true;
    availableMarker.quality = quality;

    if (quality === "excellent") {
      this.excellentHits += 1;
      this.hits += 1;
    } else if (quality === "good") {
      this.goodHits += 1;
      this.hits += 1;
    }

    if (quality !== "missed") {
      this.tweens.killTweensOf(availableMarker.container);

      this.tweens.add({
        targets: availableMarker.container,
        scale: 1.25,
        alpha: 0,
        duration: 220,
        onComplete: () => availableMarker.container.destroy(),
      });
    }

    this.answerText.setText(
      quality === "excellent"
        ? "Excellent !"
        : quality === "good"
          ? "Bien !"
          : "Raté !",
    );
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
  }

  private playFeedbackSound(correct: boolean) {
    const key = correct ? "success" : "error";

    if (!this.cache.audio.exists(key)) return;

    this.sound.play(key);
  }

  private async validateRound(): Promise<void> {
    if (this.phase !== "playing" || this.stoppingForLimit || this.finishing) {
      return;
    }

    this.phase = "feedback";

    this.cancelSpeech();

    const expectedTaps = this.currentWord.displaySyllables.length;

    const correct =
      this.studentTaps === expectedTaps && this.hits === expectedTaps;

    const answer: RhythmMusicAnswer = {
      contentId: this.currentWord.contentId,
      contentVersion: this.currentWord.contentVersion,
      word: this.currentWord.word,
      displaySyllables: [...this.currentWord.displaySyllables],
      spokenSyllables: [...this.currentWord.spokenSyllables],
      expectedTaps,
      studentTaps: this.studentTaps,
      excellentHits: this.excellentHits,
      goodHits: this.goodHits,
      hits: this.hits,
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
        this.animateStarBalance(balance);
      }

      this.history.push(answer);
      this.currentRound += 1;
    } catch (error) {
      console.error("Sauvegarde du round impossible :", error);

      if (!this.sys.isActive() || this.stoppingForLimit) return;

      this.phase = "playing";

      this.instructionText
        .setText("Sauvegarde impossible. Réessaie avec le tambour.")
        .setColor("#ffe2a0");

      return;
    } finally {
      this.pendingSave = null;
    }

    if (this.stoppingForLimit) return;

    this.playFeedbackSound(correct);

    this.markers.forEach((marker) => {
      this.tweens.killTweensOf(marker.container);
      marker.container.destroy();
    });

    this.markers = [];

    this.instructionText
      .setText(
        correct
          ? "Bravo ! Tu as suivi le rythme du mot."
          : "On réessaie avec un autre mot !",
      )
      .setColor(correct ? "#baffbf" : "#ffe2a0");

    this.answerText.setVisible(true);

    this.answerText.setText(
      `${this.excellentHits} excellent • ${this.goodHits} bien • ${expectedTaps - this.hits} raté`,
    );

    this.scoreText.setText(`${this.score} / ${this.history.length} réussis`);

    this.time.delayedCall(3000, () => {
      this.startRound();
    });
  }

  public async stopForSessionLimit(): Promise<void> {
    if (this.stoppingForLimit || this.finishing) return;

    this.stoppingForLimit = true;
    this.input.enabled = false;

    this.time.removeAllEvents();
    this.sound.stopAll();

    this.cancelSpeech();

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
