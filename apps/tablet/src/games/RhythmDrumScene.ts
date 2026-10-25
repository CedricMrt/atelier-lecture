import Phaser from "phaser";
import type { ActivityEndReason } from "../db/db";
import type { TrainingClock } from "./TrainingClock";
import { getRatingStars } from "./trainingRules";

export type RhythmRound = {
  sequence: number[];
  tempoMs: number;
};

export type RhythmResult = {
  endReason?: ActivityEndReason;
  score: number;
  maxScore: number;
  stars: number;
  durationSeconds: number;
  hintsUsed: number;
  answers: {
    sequence: number[];
    studentSequence: number[];
    correct: boolean;
    responseTimeMs: number;
  }[];
};

type SceneData = {
  avatarUrl: string;
  avatarTextureKey: string;
  trainingClock?: TrainingClock;
  initialStarBalance: number;
  initialAnswers: RhythmResult["answers"];
  initialHintsUsed: number;
  activityStartedAt: number;

  onRoundValidated: (
    roundIndex: number,
    answer: RhythmResult["answers"][number],
    totalHints: number,
  ) => Promise<number>;

  onFinish?: (result: RhythmResult) => void | Promise<void>;
};

type GamePhase = "listening" | "answering" | "feedback" | "finished";

export class RhythmDrumScene extends Phaser.Scene {
  private rounds: RhythmRound[] = [
    { sequence: [0, 0], tempoMs: 900 },
    { sequence: [0, 1], tempoMs: 900 },
    { sequence: [1, 0], tempoMs: 900 },
    { sequence: [0, 1, 0], tempoMs: 800 },
    { sequence: [1, 1, 0], tempoMs: 800 },
    { sequence: [1, 0, 1], tempoMs: 800 },
    { sequence: [0, 1, 1, 0], tempoMs: 700 },
    { sequence: [1, 0, 1, 0], tempoMs: 700 },
    { sequence: [0, 1, 0, 1], tempoMs: 700 },
  ];

  private readonly soundSpacingMs = 650;
  private readonly answerDelayMs = 400;
  private readonly feedbackDelayMs = 3200;

  private currentRound = 0;
  private score = 0;
  private readonly starsPerCorrectAnswer = 5;

  private starBalance = 0;
  private displayedStars = 0;

  private starsText!: Phaser.GameObjects.Text;
  private starsIcon!: Phaser.GameObjects.Star;

  private onRoundValidated?: SceneData["onRoundValidated"];
  private hintsUsed = 0;
  private startTime = 0;
  private roundStartTime = 0;
  private responseTimeMs = 0;

  private currentSequence: number[] = [];
  private studentSequence: number[] = [];
  private rhythmHistory: RhythmResult["answers"] = [];

  private phase: GamePhase = "listening";
  private onFinish?: (result: RhythmResult) => void | Promise<void>;

  private background!: Phaser.GameObjects.Image;
  private drum!: Phaser.GameObjects.Image;
  private cymbal!: Phaser.GameObjects.Image;
  private avatar!: Phaser.GameObjects.Image;

  private avatarUrl = "";
  private avatarTextureKey = "";

  private instructionText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private answerText!: Phaser.GameObjects.Text;

  private replayButton!: Phaser.GameObjects.Container;
  private replayBackground!: Phaser.GameObjects.Graphics;

  private roundDots: Phaser.GameObjects.Arc[] = [];

  private drumScale = 1;
  private cymbalScale = 1;
  private avatarScale = 1;

  private trainingClock?: TrainingClock;
  private pendingSave: Promise<number> | null = null;
  private stoppingForLimit = false;
  private finishing = false;

  constructor() {
    super("RhythmDrumScene");
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

    this.rhythmHistory = (data.initialAnswers ?? []).map((answer) => ({
      ...answer,
      sequence: [...answer.sequence],
      studentSequence: [...answer.studentSequence],
    }));

    this.currentRound = this.rhythmHistory.length;

    this.score = this.rhythmHistory.filter((answer) => answer.correct).length;

    this.hintsUsed = data.initialHintsUsed ?? 0;
    this.startTime = data.activityStartedAt ?? Date.now();

    this.roundStartTime = 0;
    this.responseTimeMs = 0;
    this.currentSequence = [];
    this.studentSequence = [];
    this.roundDots = [];

    this.phase = "listening";
  }

  preload() {
    const path = "/tambour-des-sons/images";

    this.load.image("rhythm-decor", `${path}/decor.png`);

    if (!this.avatarUrl || !this.avatarTextureKey) {
      throw new Error("L’avatar de l’élève n’a pas été transmis au Tambour.");
    }

    if (!this.textures.exists(this.avatarTextureKey)) {
      this.load.image(this.avatarTextureKey, this.avatarUrl);
    }

    this.load.image("rhythm-drum", `${path}/tambour.png`);
    this.load.image("rhythm-cymbal", `${path}/cymbale.png`);

    this.load.audio("drum-low", "/audio/drum-low.mp3");
    this.load.audio("drum-high", "/audio/drum-high.mp3");
    this.load.audio("success", "/audio/success.mp3");
    this.load.audio("error", "/audio/error.mp3");
  }

  create() {
    this.createBackground();
    this.createInstruments();
    this.createInterface();

    this.updateResponsiveLayout();

    const onResize = () => {
      this.updateResponsiveLayout();
    };

    this.scale.on("resize", onResize);

    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
    });
    this.trainingClock?.start();
    this.scoreText.setText(
      this.trainingClock
        ? `${this.score} / ${this.rhythmHistory.length} réussis`
        : `${this.score} / ${this.rounds.length} réussis`,
    );

    this.time.delayedCall(700, () => {
      if (!this.trainingClock && this.currentRound >= this.rounds.length) {
        void this.finish();
      } else {
        this.startRound();
      }
    });
  }

  private updateResponsiveLayout() {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    if (width <= 0 || height <= 0) return;

    // Les instruments et l'interface restent dans leur espace
    // de référence de 1280 × 720, sans être coupés.
    const zoom = Math.min(width / 1280, height / 720);

    const camera = this.cameras.main;

    camera.setViewport(0, 0, width, height);
    camera.setZoom(zoom);
    camera.centerOn(640, 360);

    // Le décor couvre aussi l'espace supplémentaire visible
    // autour de la zone de jeu.
    const visibleWorldWidth = width / zoom;
    const visibleWorldHeight = height / zoom;

    const backgroundScale = Math.max(
      visibleWorldWidth / this.background.width,
      visibleWorldHeight / this.background.height,
    );

    this.background.setPosition(640, 360).setScale(backgroundScale);
  }

  private createBackground() {
    this.background = this.add.image(640, 360, "rhythm-decor");

    // Ombre douce sous les objets.
    this.add.ellipse(202, 598, 150, 30, 0x243f26, 0.18);
    this.add.ellipse(540, 567, 255, 40, 0x243f26, 0.2);
    this.add.ellipse(975, 570, 220, 35, 0x243f26, 0.18);

    this.avatar = this.add
      .image(200, 605, this.avatarTextureKey)
      .setOrigin(0.5, 1);

    this.fitImage(this.avatar, 230, 330);
    this.avatarScale = this.avatar.scaleX;
  }

  private createInstruments() {
    this.drum = this.add.image(540, 580, "rhythm-drum").setOrigin(0.5, 1);

    this.fitImage(this.drum, 340, 320);
    this.drumScale = this.drum.scaleX;

    this.cymbal = this.add.image(975, 580, "rhythm-cymbal").setOrigin(0.5, 1);

    this.fitImage(this.cymbal, 310, 350);
    this.cymbalScale = this.cymbal.scaleX;

    // Zones tactiles indépendantes des marges transparentes des PNG.
    const drumZone = this.add
      .zone(540, 435, 355, 330)
      .setInteractive({ useHandCursor: true });

    const cymbalZone = this.add
      .zone(975, 420, 330, 360)
      .setInteractive({ useHandCursor: true });

    drumZone.on("pointerdown", () => this.handlePad(0));
    cymbalZone.on("pointerdown", () => this.handlePad(1));

    this.createLabel(540, 602, "GRAVE");
    this.createLabel(975, 602, "AIGU");
  }

  private createInterface() {
    const panel = this.add.graphics();

    panel.fillStyle(0x103c37, 0.88);
    panel.fillRoundedRect(300, 18, 680, 145, 28);

    panel.lineStyle(3, 0xffe2a0, 0.9);
    panel.strokeRoundedRect(300, 18, 680, 145, 28);

    this.add
      .text(640, 48, "Tambour des sons", {
        fontFamily: "Arial",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#fff2c5",
      })
      .setOrigin(0.5);

    this.instructionText = this.add
      .text(640, 94, "Prépare-toi…", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    for (let index = 0; index < this.rounds.length; index += 1) {
      const dot = this.add
        .circle(572 + index * 34, 137, 8, 0xffffff, 0.35)
        .setStrokeStyle(2, 0xffe2a0);

      this.roundDots.push(dot);
    }

    this.roundText = this.add
      .text(102, 47, "Round 1 / 5", {
        fontFamily: "Arial",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#174339",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const rewardPanel = this.add.graphics();

    rewardPanel.fillStyle(0x103c37, 0.9);
    rewardPanel.fillRoundedRect(990, 20, 275, 100, 20);

    rewardPanel.lineStyle(2, 0xffe2a0, 0.9);
    rewardPanel.strokeRoundedRect(990, 20, 275, 100, 20);

    this.scoreText = this.add
      .text(1010, 45, "0 / 5 réussis", {
        fontFamily: "Arial",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#fff2c5",
      })
      .setOrigin(0, 0.5);

    this.starsIcon = this.add
      .star(1028, 87, 5, 9, 19, 0xffd34f)
      .setStrokeStyle(2, 0xfff4bd);

    this.starsText = this.add
      .text(1060, 87, `${this.starBalance}`, {
        fontFamily: "Arial",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffe278",
        stroke: "#71401c",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5);

    this.answerText = this.add
      .text(640, 205, "", {
        fontFamily: "Arial",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#174339",
        padding: { x: 18, y: 9 },
      })
      .setOrigin(0.5);

    this.replayBackground = this.add.graphics();
    this.replayBackground.fillStyle(0x754024, 1);
    this.replayBackground.fillRoundedRect(-123, -29, 246, 64, 20);
    this.replayBackground.fillStyle(0xffd36a, 1);
    this.replayBackground.fillRoundedRect(-123, -35, 246, 64, 20);
    this.replayBackground.lineStyle(3, 0xfff1bc, 1);
    this.replayBackground.strokeRoundedRect(-123, -35, 246, 64, 20);

    const replayText = this.add
      .text(0, -3, "↻  Réécouter", {
        fontFamily: "Arial",
        fontSize: "27px",
        fontStyle: "bold",
        color: "#55351e",
      })
      .setOrigin(0.5);

    this.replayButton = this.add
      .container(640, 672, [this.replayBackground, replayText])
      .setSize(246, 70)
      .setInteractive({ useHandCursor: true });

    this.replayButton.on("pointerdown", () => {
      if (this.phase !== "answering") return;

      // Après une erreur de sauvegarde, la réponse complète
      // est conservée et le bouton réessaie son enregistrement.
      if (this.studentSequence.length === this.currentSequence.length) {
        this.phase = "feedback";
        this.replayButton.setAlpha(0.5);
        void this.validateRound();
        return;
      }

      this.hintsUsed += 1;
      this.playSequence();
    });

    this.replayButton.setAlpha(0.5);
  }

  private createLabel(x: number, y: number, label: string) {
    const plaque = this.add.graphics();

    plaque.fillStyle(0x704125, 0.95);
    plaque.fillRoundedRect(x - 85, y - 20, 170, 44, 13);

    plaque.lineStyle(2, 0xffdb8c, 1);
    plaque.strokeRoundedRect(x - 85, y - 20, 170, 44, 13);

    this.add
      .text(x, y + 2, label, {
        fontFamily: "Arial",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#fff0bf",
      })
      .setOrigin(0.5);
  }

  private fitImage(
    image: Phaser.GameObjects.Image,
    maxWidth: number,
    maxHeight: number,
  ) {
    image.setScale(Math.min(maxWidth / image.width, maxHeight / image.height));
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

    // En mode chronométré, les modèles se répètent.
    // La difficulté adaptative sera ajoutée dans le lot 2.
    const modelIndex = this.trainingClock
      ? this.currentRound % this.rounds.length
      : this.currentRound;

    const round = this.rounds[modelIndex];

    this.currentSequence = [...round.sequence];

    this.roundText.setText(
      this.trainingClock
        ? `Séquence ${this.currentRound + 1}`
        : `Round ${this.currentRound + 1} / ${this.rounds.length}`,
    );

    this.roundDots.forEach((dot, index) => {
      dot.setFillStyle(
        index < modelIndex
          ? 0x8fe094
          : index === modelIndex
            ? 0xffd36a
            : 0xffffff,
        index <= modelIndex ? 1 : 0.35,
      );
    });

    this.playSequence();
  }

  private playSequence() {
    this.phase = "listening";
    this.studentSequence = [];
    this.responseTimeMs = 0;

    this.instructionText.setText("Écoute les sons !");
    this.instructionText.setColor("#ffffff");

    this.answerText.setText(`${this.currentSequence.length} sons à mémoriser`);

    this.replayButton.setAlpha(0.5);

    // Petit temps de préparation, y compris lors d'une réécoute.
    this.time.delayedCall(350, () => {
      this.playNextSound(0);
    });
  }

  private playNextSound(index: number) {
    if (this.phase !== "listening") return;

    const pad = this.currentSequence[index];

    this.playAudio(pad === 0 ? "drum-low" : "drum-high");
    this.animateInstrument(pad);

    if (index < this.currentSequence.length - 1) {
      this.time.delayedCall(this.soundSpacingMs, () => {
        this.playNextSound(index + 1);
      });
      return;
    }

    this.time.delayedCall(this.soundSpacingMs + this.answerDelayMs, () => {
      this.phase = "answering";
      this.roundStartTime = this.trainingClock?.activityNow() ?? Date.now();

      this.instructionText.setText("À toi de jouer !");
      this.instructionText.setColor("#baffbf");
      this.answerText.setText(`0 / ${this.currentSequence.length} sons`);
      this.replayButton.setAlpha(1);
    });
  }

  private handlePad(pad: number) {
    if (this.phase !== "answering") return;

    if (this.studentSequence.length >= this.currentSequence.length) {
      return;
    }

    this.playAudio(pad === 0 ? "drum-low" : "drum-high");
    this.animateInstrument(pad);

    this.studentSequence.push(pad);

    this.answerText.setText(
      `${this.studentSequence.length} / ${this.currentSequence.length} sons`,
    );

    if (this.studentSequence.length === this.currentSequence.length) {
      this.responseTimeMs =
        (this.trainingClock?.activityNow() ?? Date.now()) - this.roundStartTime;

      this.phase = "feedback";
      this.replayButton.setAlpha(0.5);
      this.instructionText.setText("Voyons ta réponse…");

      this.time.delayedCall(400, () => {
        void this.validateRound();
      });
    }
  }

  private animateInstrument(pad: number) {
    const instrument = pad === 0 ? this.drum : this.cymbal;
    const baseScale = pad === 0 ? this.drumScale : this.cymbalScale;

    this.tweens.killTweensOf(instrument);
    instrument.setScale(baseScale);
    instrument.setAngle(0);
    instrument.setTint(0xffedaa);

    this.tweens.add({
      targets: instrument,
      scaleX: baseScale * 1.06,
      scaleY: baseScale * 0.95,
      angle: pad === 1 ? 4 : 0,
      duration: 110,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        instrument.setScale(baseScale);
        instrument.setAngle(0);
        instrument.clearTint();
      },
    });
  }

  private async validateRound(): Promise<void> {
    if (this.stoppingForLimit || this.phase === "finished") {
      return;
    }

    const correct =
      this.studentSequence.length === this.currentSequence.length &&
      this.studentSequence.every(
        (pad, index) => pad === this.currentSequence[index],
      );

    const answer: RhythmResult["answers"][number] = {
      sequence: [...this.currentSequence],
      studentSequence: [...this.studentSequence],
      correct,
      responseTimeMs: this.responseTimeMs,
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
        this.awardStars(balance);
      }

      this.rhythmHistory.push(answer);
      this.currentRound += 1;
    } catch (error) {
      console.error("Sauvegarde du round impossible :", error);

      if (!this.sys.isActive() || this.stoppingForLimit) {
        return;
      }

      this.phase = "answering";
      this.replayButton.setAlpha(1);

      this.instructionText
        .setText("La réponse n’a pas pu être enregistrée")
        .setColor("#ffe2a0");

      this.answerText.setText(
        "Appuie sur Réécouter pour réessayer la sauvegarde",
      );

      return;
    } finally {
      this.pendingSave = null;
    }

    if (this.stoppingForLimit) return;

    this.playAudio(correct ? "success" : "error");

    this.scoreText.setText(
      this.trainingClock
        ? `${this.score} / ${this.rhythmHistory.length} réussis`
        : `${this.score} / ${this.rounds.length} réussis`,
    );

    this.instructionText
      .setText(correct ? "Bravo, bien joué !" : "On continue, courage !")
      .setColor(correct ? "#baffbf" : "#ffe2a0");

    this.answerText.setText(
      correct ? "Séquence réussie !" : "Une nouvelle séquence arrive",
    );

    this.animateAvatar(correct);

    if (correct) {
      this.showReward();
    }

    this.time.delayedCall(this.feedbackDelayMs, () => {
      if (!this.trainingClock && this.currentRound >= this.rounds.length) {
        void this.finish();
      } else {
        this.startRound();
      }
    });
  }

  private animateAvatar(correct: boolean) {
    this.tweens.killTweensOf(this.avatar);

    this.avatar.setY(605);
    this.avatar.setScale(this.avatarScale);
    this.avatar.setAngle(0);

    if (correct) {
      this.tweens.add({
        targets: this.avatar,
        y: 565,
        duration: 220,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeOut",
      });
    } else {
      this.tweens.add({
        targets: this.avatar,
        angle: -4,
        duration: 140,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          this.avatar.setAngle(0);
        },
      });
    }
  }

  private awardStars(newBalance: number) {
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

    // Un gain déjà enregistré ne doit pas afficher un nouveau +5.
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
      .text(1130, 155, `+${this.starsPerCorrectAnswer} étoiles !`, {
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
      y: 128,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => bonusText.destroy(),
    });
  }

  private showReward() {
    for (let index = 0; index < 7; index += 1) {
      const star = this.add
        .star(640, 350, 5, 9, 20, 0xffd34f)
        .setStrokeStyle(2, 0xfff4bd);

      const angle = (index / 7) * Math.PI * 2;

      this.tweens.add({
        targets: star,
        x: 640 + Math.cos(angle) * 170,
        y: 350 + Math.sin(angle) * 110,
        alpha: 0,
        rotation: Math.PI,
        duration: 900,
        ease: "Cubic.easeOut",
        onComplete: () => star.destroy(),
      });
    }
  }

  private playAudio(key: string) {
    // Évite qu'un son absent du cache bloque la partie.
    if (!this.cache.audio.exists(key)) {
      console.warn(`Son indisponible : ${key}`);
      return;
    }

    this.sound.play(key);
  }

  public async stopForSessionLimit(): Promise<void> {
    if (this.stoppingForLimit || this.finishing) {
      return;
    }

    this.stoppingForLimit = true;
    this.input.enabled = false;

    this.time.removeAllEvents();
    this.sound.stopAll();

    // Attend la sauvegarde engagée avant la clôture.
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
    this.replayButton.setAlpha(0.5);

    const maxScore = this.trainingClock
      ? this.rhythmHistory.length
      : this.rounds.length;

    const stars = this.trainingClock
      ? getRatingStars(this.score, maxScore)
      : this.score === this.rounds.length
        ? 3
        : this.score >= 3
          ? 2
          : 1;

    const durationSeconds = this.trainingClock
      ? this.trainingClock.activityNow() / 1000
      : Math.round((Date.now() - this.startTime) / 1000);

    await this.onFinish?.({
      score: this.score,
      maxScore,
      stars,
      durationSeconds,
      hintsUsed: this.hintsUsed,
      answers: this.rhythmHistory,
      endReason,
    });

    if (this.sys.isActive()) {
      this.scene.stop();
    }
  }
}
