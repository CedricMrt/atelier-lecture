import Phaser from "phaser";
import type { ActivityEndReason } from "../db/db";
import type { TrainingClock } from "./TrainingClock";
import { getRatingStars } from "./trainingRules";
import { SYLLABLE_WORDS } from "../data/syllableWords";

export type SyllableRound = {
  word: string;
  expectedSyllables: number;
};

export type SyllableResult = {
  endReason?: ActivityEndReason;
  score: number;
  maxScore: number;
  stars: number;
  durationSeconds: number;
  hintsUsed: number;
  answers: {
    word: string;
    expectedSyllables: number;
    studentSyllables: number;
    correct: boolean;
    responseTimeMs: number;
  }[];
};

type SceneData = {
  avatarUrl: string;
  avatarTextureKey: string;
  trainingClock?: TrainingClock;
  initialStarBalance: number;
  initialAnswers: SyllableResult["answers"];
  initialHintsUsed: number;
  activityStartedAt: number;

  onRoundValidated: (
    roundIndex: number,
    answer: SyllableResult["answers"][number],
    totalHints: number,
  ) => Promise<number>;

  onFinish?: (result: SyllableResult) => void | Promise<void>;
};

type ImagePoint = {
  u: number;
  v: number;
};

type SyllableLandscape = {
  key: string;
  url: string;
  stones: ImagePoint[];
};

type Phase = "ready" | "speaking" | "answering" | "feedback" | "finished";

export class SyllablePathScene extends Phaser.Scene {
  private readonly maxAttempts = 5;

  private readonly words: readonly SyllableRound[] = SYLLABLE_WORDS;

  private readonly stepsPerPath = 5;

  private readonly landscapes: SyllableLandscape[] = [
    {
      key: "syllable-decor",
      url: "/chemin-des-syllabes/images/syllable-decor.png",

      // Positions relatives dans l’image :
      // u = proportion horizontale, v = proportion verticale.
      stones: [
        { u: 0.2, v: 0.66 },
        { u: 0.31, v: 0.64 },
        { u: 0.41, v: 0.61 },
        { u: 0.52, v: 0.6 },
        { u: 0.61, v: 0.56 },
        { u: 0.68, v: 0.5 },
      ],
    },
  ];

  private pathNumber = 0;
  private pathTransition = false;

  private pathContainer!: Phaser.GameObjects.Container;

  private currentRound = 0;
  private score = 0;
  private hintsUsed = 0;
  private startTime = 0;
  private roundStartTime = 0;
  private studentSyllables = 0;

  private currentWord!: SyllableRound;
  private usedWords = new Set<string>();
  private history: SyllableResult["answers"] = [];

  private phase: Phase = "ready";
  private heardCurrentWord = false;
  private speechGeneration = 0;
  private utterance: SpeechSynthesisUtterance | null = null;

  private onFinish?: (result: SyllableResult) => void | Promise<void>;

  private background!: Phaser.GameObjects.Image;
  private avatar!: Phaser.GameObjects.Image;

  private avatarUrl = "";
  private avatarTextureKey = "";

  private instructionText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private wordText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;
  private listenText!: Phaser.GameObjects.Text;

  private starBalance = 0;
  private displayedStars = 0;

  private starsText!: Phaser.GameObjects.Text;
  private starsIcon!: Phaser.GameObjects.Star;

  private onRoundValidated?: SceneData["onRoundValidated"];

  private trainingClock?: TrainingClock;
  private pendingSave: Promise<number> | null = null;
  private stoppingForLimit = false;
  private finishing = false;

  constructor() {
    super("SyllablePathScene");
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

    this.history = (data.initialAnswers ?? []).map((answer) => ({ ...answer }));

    this.currentRound = this.history.length;

    this.score = this.history.filter((answer) => answer.correct).length;

    this.pathNumber = this.trainingClock
      ? Math.floor(this.score / this.stepsPerPath)
      : 0;

    this.pathTransition = false;

    this.hintsUsed = data.initialHintsUsed ?? 0;
    this.startTime = data.activityStartedAt ?? Date.now();

    this.roundStartTime = 0;
    this.studentSyllables = 0;

    this.restoreUsedWords();

    this.phase = "ready";
    this.heardCurrentWord = false;
    this.utterance = null;
  }

  preload() {
    for (const landscape of this.landscapes) {
      if (!this.textures.exists(landscape.key)) {
        this.load.image(landscape.key, landscape.url);
      }
    }

    if (!this.avatarUrl || !this.avatarTextureKey) {
      throw new Error("L’avatar de l’élève n’a pas été transmis aux syllabes.");
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

    if (!this.cache.audio.exists("syllable-clap")) {
      this.load.audio("syllable-clap", "/audio/clap.mp3");
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

    this.scoreText.setText(
      this.trainingClock
        ? `${this.score} / ${this.history.length} réussis`
        : `${this.score} / ${this.maxAttempts} réussis`,
    );

    if (!this.trainingClock && this.currentRound >= this.maxAttempts) {
      this.time.delayedCall(100, () => {
        void this.finish();
      });
    } else {
      this.startRound();
    }
  }

  private restoreUsedWords() {
    this.usedWords = new Set<string>();

    for (const answer of this.history) {
      const group = this.words.filter(
        (item) => item.expectedSyllables === answer.expectedSyllables,
      );

      if (group.length === 0) continue;

      const groupExhausted = group.every((item) =>
        this.usedWords.has(item.word),
      );

      if (groupExhausted) {
        group.forEach((item) => {
          this.usedWords.delete(item.word);
        });
      }

      const wordStillExists = group.some((item) => item.word === answer.word);

      if (wordStillExists) {
        this.usedWords.add(answer.word);
      }
    }
  }

  private getCurrentLandscape(): SyllableLandscape {
    return this.landscapes[this.pathNumber % this.landscapes.length];
  }

  private imagePointToWorld(point: ImagePoint) {
    return {
      x:
        this.background.x +
        (point.u - this.background.originX) * this.background.displayWidth,

      y:
        this.background.y +
        (point.v - this.background.originY) * this.background.displayHeight,
    };
  }

  private getAvatarStone() {
    const landscape = this.getCurrentLandscape();

    // Pendant le retour de réussite, l’avatar peut encore
    // occuper la dernière pierre du parcours précédent.
    const progress = this.score - this.pathNumber * this.stepsPerPath;

    const index = Math.max(0, Math.min(progress, this.stepsPerPath));

    return this.imagePointToWorld(landscape.stones[index]);
  }

  private redrawPath() {
    this.pathContainer.removeAll(true);

    const landscape = this.getCurrentLandscape();

    const points = landscape.stones.map((point) =>
      this.imagePointToWorld(point),
    );

    const trail = this.add.graphics();

    trail.lineStyle(20, 0xd4b67d, 0.55);
    trail.beginPath();
    trail.moveTo(points[0].x, points[0].y);

    for (let index = 1; index < points.length; index += 1) {
      trail.lineTo(points[index].x, points[index].y);
    }

    trail.strokePath();
    this.pathContainer.add(trail);

    points.forEach((point, index) => {
      // Les pierres rétrécissent légèrement vers le pont.
      const width = 125 - index * 7;
      const height = 54 - index * 2;

      const shadow = this.add.ellipse(
        point.x,
        point.y + 9,
        width + 8,
        height * 0.7,
        0x384a39,
        0.2,
      );

      const stone = this.add
        .ellipse(point.x, point.y, width, height, 0x8c9e90)
        .setStrokeStyle(3, 0xe1e4be);

      const highlight = this.add.ellipse(
        point.x,
        point.y - 8,
        width * 0.72,
        14,
        0xc9d1ad,
        0.7,
      );

      const label = this.add
        .text(point.x, point.y + 2, `${index}`, {
          fontFamily: "Arial",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#3e5947",
        })
        .setOrigin(0.5);

      this.pathContainer.add([shadow, stone, highlight, label]);
    });

    const destination = points[points.length - 1];

    const arrival = this.add
      .text(destination.x + 42, destination.y - 35, "", {
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff0b8",
        backgroundColor: "#276b50",
        //padding: { x: 9, y: 6 },
      })
      .setOrigin(0.5);

    this.pathContainer.add(arrival);
  }

  private getResponseNow() {
    return this.trainingClock?.activityNow() ?? Date.now();
  }

  private createWorld() {
    const landscape = this.getCurrentLandscape();

    this.background = this.add.image(640, 360, landscape.key);

    this.pathContainer = this.add.container(0, 0);

    this.avatar = this.add.image(0, 0, this.avatarTextureKey).setOrigin(0.5, 1);

    this.avatar.setScale(
      Math.min(135 / this.avatar.width, 175 / this.avatar.height),
    );

    // Le placement définitif sera calculé dans
    // updateResponsiveLayout(), après l’échelle du fond.
  }

  private createInterface() {
    const panel = this.add.graphics();

    panel.fillStyle(0x103c37, 0.94);
    panel.fillRoundedRect(280, 18, 720, 145, 26);

    panel.lineStyle(3, 0xffe2a0);
    panel.strokeRoundedRect(280, 18, 720, 145, 26);

    this.add
      .text(640, 48, "Chemin des syllabes", {
        fontFamily: "Arial",
        fontSize: "33px",
        fontStyle: "bold",
        color: "#ffe8aa",
      })
      .setOrigin(0.5);

    this.instructionText = this.add
      .text(640, 95, "", {
        fontFamily: "Arial",
        fontSize: "23px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 660 },
      })
      .setOrigin(0.5);

    this.counterText = this.add
      .text(640, 139, "Syllabes : 0", {
        fontFamily: "Arial",
        fontSize: "21px",
        fontStyle: "bold",
        color: "#ffe8aa",
      })
      .setOrigin(0.5);

    this.roundText = this.add.text(22, 35, "", {
      fontFamily: "Arial",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#174339",
      strokeThickness: 5,
    });

    const rewardPanel = this.add.graphics();

    rewardPanel.fillStyle(0x103c37, 0.94);
    rewardPanel.fillRoundedRect(1015, 20, 250, 105, 20);

    rewardPanel.lineStyle(2, 0xffe2a0);
    rewardPanel.strokeRoundedRect(1015, 20, 250, 105, 20);

    this.scoreText = this.add
      .text(1035, 46, "0 / 5 réussis", {
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
      .text(640, 215, "", {
        fontFamily: "Arial",
        fontSize: "40px",
        fontStyle: "bold",
        color: "#fff3c4",
        stroke: "#174339",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5);

    // Écouter / réécouter.
    this.listenText = this.createButton(
      200,
      620,
      280,
      "👂",
      0xf4ce78,
      () => this.speakWord(),
      42,
    );

    // Une pression = une syllabe.
    this.createButton(
      565,
      620,
      310,
      "👏",
      0x94d7b1,
      () => this.handleTap(),
      44,
    );

    // Validation : ancien emplacement d’Effacer.
    this.createButton(
      860,
      620,
      170,
      "✓",
      0x94d7b1,
      () => {
        void this.validateRound();
      },
      44,
    );

    // Effacer : ancien emplacement de J’ai fini.
    this.createButton(
      1110,
      620,
      220,
      "Effacer",
      0xe0d3b3,
      () => {
        if (this.phase !== "answering") return;

        this.studentSyllables = 0;
        this.updateCounter();
      },
      22,
    );

    this.add
      .text(
        640,
        687,
        "Oreille : écoute • Mains : compte les syllabes • Coche : valide",
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

  private updateResponsiveLayout() {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    if (width <= 0 || height <= 0) return;

    const zoom = Math.min(width / 1280, height / 720);

    this.cameras.main
      .setViewport(0, 0, width, height)
      .setZoom(zoom)
      .centerOn(640, 360);

    this.background
      .setPosition(640, 360)
      .setScale(
        Math.max(
          width / zoom / this.background.width,
          height / zoom / this.background.height,
        ),
      );

    this.redrawPath();

    const position = this.getAvatarStone();

    this.tweens.killTweensOf(this.avatar);

    this.avatar.setPosition(position.x, position.y - 8);
  }

  private transitionToPath(nextPathNumber: number) {
    if (this.pathTransition || this.stoppingForLimit || this.finishing) {
      return;
    }

    this.pathTransition = true;
    this.phase = "feedback";

    this.wordText.setText("");

    this.instructionText
      .setText("Le pont mène à un nouveau chemin !")
      .setColor("#ffe8aa");

    const camera = this.cameras.main;

    const cover = this.add
      .rectangle(
        camera.midPoint.x,
        camera.midPoint.y,
        camera.width / camera.zoom + 100,
        camera.height / camera.zoom + 100,
        0x123f35,
        1,
      )
      .setAlpha(0)
      .setDepth(1000);

    this.tweens.add({
      targets: cover,
      alpha: 1,
      duration: 350,

      onComplete: () => {
        if (this.stoppingForLimit || this.finishing || !this.sys.isActive()) {
          cover.destroy();
          this.pathTransition = false;
          return;
        }

        this.pathNumber = nextPathNumber;

        const landscape = this.getCurrentLandscape();

        this.background.setTexture(landscape.key);
        this.updateResponsiveLayout();

        this.tweens.add({
          targets: cover,
          alpha: 0,
          duration: 350,

          onComplete: () => {
            cover.destroy();
            this.pathTransition = false;

            if (
              this.stoppingForLimit ||
              this.finishing ||
              !this.sys.isActive()
            ) {
              return;
            }

            this.startRound();
          },
        });
      },
    });
  }

  private drawSyllableCount(): number {
    const blockSize = 6;
    const quotaPerCount = 2;

    // Le bloc courant est reconstruit à partir
    // des seules réponses validées.
    const blockStart = Math.floor(this.history.length / blockSize) * blockSize;

    const currentBlock = this.history.slice(blockStart);

    const remaining: number[] = [];

    for (const count of [1, 2, 3]) {
      const alreadyUsed = currentBlock.filter(
        (answer) => answer.expectedSyllables === count,
      ).length;

      const available = Math.max(0, quotaPerCount - alreadyUsed);

      for (let index = 0; index < available; index += 1) {
        remaining.push(count);
      }
    }

    const lastAnswers = this.history.slice(-2);

    const repeatedCount =
      lastAnswers.length === 2 &&
      lastAnswers[0].expectedSyllables === lastAnswers[1].expectedSyllables
        ? lastAnswers[0].expectedSyllables
        : null;

    // Empêche trois nombres identiques consécutifs,
    // y compris à la jonction entre deux blocs.
    const alternatives = remaining.filter((count) => count !== repeatedCount);

    const pool = alternatives.length > 0 ? alternatives : remaining;

    if (pool.length === 0) {
      throw new Error("Impossible de préparer le tirage des syllabes.");
    }

    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  private drawWord(syllableCount: number): SyllableRound {
    const group = this.words.filter(
      (item) => item.expectedSyllables === syllableCount,
    );

    if (group.length === 0) {
      throw new Error(`Aucun mot disponible pour ${syllableCount} syllabe(s).`);
    }

    let candidates = group.filter((item) => !this.usedWords.has(item.word));

    if (candidates.length === 0) {
      // Tous les mots de ce groupe ont été présentés :
      // on ouvre un nouveau cycle pour ce groupe.
      group.forEach((item) => {
        this.usedWords.delete(item.word);
      });

      const lastValidatedWord = this.history[this.history.length - 1]?.word;

      candidates = group.filter(
        (item) => group.length === 1 || item.word !== lastValidatedWord,
      );
    }

    const selected = candidates[Phaser.Math.Between(0, candidates.length - 1)];

    this.usedWords.add(selected.word);

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

    if (this.pathTransition) return;

    if (this.trainingClock) {
      const expectedPathNumber = Math.floor(this.score / this.stepsPerPath);

      if (expectedPathNumber !== this.pathNumber) {
        this.transitionToPath(expectedPathNumber);
        return;
      }
    }

    const syllableCount = this.drawSyllableCount();

    this.currentWord = this.drawWord(syllableCount);

    this.studentSyllables = 0;
    this.heardCurrentWord = false;
    this.phase = "ready";

    this.wordText.setText(this.currentRound === 0 ? "" : this.currentWord.word);

    this.listenText.setText("👂");

    this.roundText.setText(
      this.trainingClock
        ? `Mot ${this.currentRound + 1}`
        : `Mot ${this.currentRound + 1} / ${this.maxAttempts}`,
    );

    this.updateCounter();

    if (this.currentRound === 0) {
      this.instructionText
        .setText("Appuie sur l’oreille pour écouter le mot.")
        .setColor("#ffffff");
    } else {
      this.instructionText
        .setText("Prépare-toi à écouter…")
        .setColor("#ffffff");

      this.time.delayedCall(600, () => {
        if (this.phase !== "ready" || this.stoppingForLimit) {
          return;
        }

        this.speakWord();
      });
    }
  }

  private speakWord() {
    if (this.phase !== "ready" && this.phase !== "answering") {
      return;
    }
    // Révèle le mot lors de l'appui ou de la lecture automatique.
    this.wordText.setText(this.currentWord.word);

    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      this.instructionText.setText(
        "La voix n’est pas disponible sur cet appareil.",
      );
      return;
    }

    if (this.heardCurrentWord) {
      this.hintsUsed += 1;
    }

    this.phase = "speaking";
    this.studentSyllables = 0;
    this.updateCounter();

    this.instructionText.setText("Écoute attentivement…").setColor("#ffffff");

    const generation = ++this.speechGeneration;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(this.currentWord.word);

    utterance.lang = "fr-FR";
    utterance.rate = 0.85;

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
      this.heardCurrentWord = true;
      this.phase = "answering";
      this.roundStartTime = this.getResponseNow();

      this.listenText.setText("👂");

      this.instructionText
        .setText("À toi ! Appuie sur les mains une fois par syllabe.")
        .setColor("#baffbf");
    };

    utterance.onerror = (event) => {
      if (generation !== this.speechGeneration || !this.sys.isActive()) {
        return;
      }

      console.error("Erreur de synthèse vocale :", event.error);

      this.utterance = null;
      this.phase = "ready";

      this.instructionText
        .setText("Le mot n’a pas pu être lu. Appuie pour réessayer.")
        .setColor("#ffe2a0");
    };

    this.utterance = utterance;

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Démarrage de la voix impossible :", error);

      this.utterance = null;
      this.phase = "ready";

      this.instructionText.setText(
        "La voix n’a pas démarré. Appuie pour réessayer.",
      );
    }
  }

  private handleTap() {
    if (this.phase !== "answering") return;
    if (this.stoppingForLimit || this.finishing) return;
    if (this.studentSyllables >= 6) return;

    if (this.cache.audio.exists("syllable-clap")) {
      this.sound.play("syllable-clap", {
        volume: 1,
      });
    }

    this.studentSyllables += 1;
    this.updateCounter();

    this.tweens.killTweensOf(this.counterText);
    this.counterText.setScale(1);

    this.tweens.add({
      targets: this.counterText,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 90,
      yoyo: true,
    });
  }

  private updateCounter() {
    this.counterText.setText(`Syllabes : ${this.studentSyllables}`);
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
      .text(1135, 160, "+5 étoiles !", {
        fontFamily: "Arial",
        fontSize: "27px",
        fontStyle: "bold",
        color: "#ffe278",
        stroke: "#174339",
        strokeThickness: 5,
      })
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

  private async validateRound(): Promise<void> {
    if (this.phase !== "answering" || this.stoppingForLimit) {
      return;
    }

    if (this.studentSyllables === 0) {
      this.instructionText.setText(
        "Appuie d’abord sur les mains pour compter les syllabes.",
      );
      return;
    }

    this.phase = "feedback";

    const correct =
      this.studentSyllables === this.currentWord.expectedSyllables;

    const answer: SyllableResult["answers"][number] = {
      word: this.currentWord.word,
      expectedSyllables: this.currentWord.expectedSyllables,
      studentSyllables: this.studentSyllables,
      correct,
      responseTimeMs: this.getResponseNow() - this.roundStartTime,
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

    this.wordText.setText(
      `${this.currentWord.word} : ` +
        `${this.currentWord.expectedSyllables} syllabe${
          this.currentWord.expectedSyllables > 1 ? "s" : ""
        }`,
    );

    if (correct) {
      this.instructionText
        .setText("Bravo ! Tu avances sur le chemin.")
        .setColor("#baffbf");

      const destination = this.getAvatarStone();

      this.tweens.add({
        targets: this.avatar,
        x: destination.x,
        y: destination.y - 8,
        duration: 650,
        ease: "Sine.easeInOut",
      });
    } else {
      this.instructionText
        .setText("Tu restes ici. Un autre mot arrive !")
        .setColor("#ffe2a0");
    }

    this.scoreText.setText(
      this.trainingClock
        ? `${this.score} / ${this.history.length} réussis`
        : `${this.score} / ${this.maxAttempts} réussis`,
    );

    this.time.delayedCall(3200, () => {
      if (!this.trainingClock && this.currentRound >= this.maxAttempts) {
        void this.finish();
      } else {
        this.startRound();
      }
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

    const maxScore = this.trainingClock
      ? this.history.length
      : this.maxAttempts;

    const stars = this.trainingClock
      ? getRatingStars(this.score, maxScore)
      : this.score >= 4
        ? 3
        : this.score >= 2
          ? 2
          : 1;

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
