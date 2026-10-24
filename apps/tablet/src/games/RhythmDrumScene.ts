import Phaser from "phaser";

export type RhythmRound = {
  sequence: number[];
  tempoMs: number;
};

export type RhythmResult = {
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
  initialStarBalance: number;
  onCorrectRound: (roundIndex: number) => Promise<number>;
  onFinish?: (result: RhythmResult) => void;
};

type GamePhase = "listening" | "answering" | "feedback" | "finished";

export class RhythmDrumScene extends Phaser.Scene {
  private rounds: RhythmRound[] = [
    { sequence: [0, 0], tempoMs: 900 },
    { sequence: [0, 1], tempoMs: 900 },
    { sequence: [0, 1, 0], tempoMs: 800 },
    { sequence: [1, 1, 0], tempoMs: 800 },
    { sequence: [0, 1, 1, 0], tempoMs: 700 },
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

  private onCorrectRound?: (roundIndex: number) => Promise<number>;
  private hintsUsed = 0;
  private startTime = 0;
  private roundStartTime = 0;
  private responseTimeMs = 0;

  private currentSequence: number[] = [];
  private studentSequence: number[] = [];
  private rhythmHistory: RhythmResult["answers"] = [];

  private phase: GamePhase = "listening";
  private onFinish?: (result: RhythmResult) => void;

  private drum!: Phaser.GameObjects.Image;
  private cymbal!: Phaser.GameObjects.Image;
  private avatar!: Phaser.GameObjects.Image;

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

  constructor() {
    super("RhythmDrumScene");
  }

  init(data: Partial<SceneData> = {}) {
    this.onFinish = data.onFinish;
    this.onCorrectRound = data.onCorrectRound;

    this.starBalance = data.initialStarBalance ?? 0;
    this.displayedStars = this.starBalance;

    this.currentRound = 0;
    this.score = 0;
    this.hintsUsed = 0;
    this.startTime = Date.now();

    this.roundStartTime = 0;
    this.responseTimeMs = 0;
    this.currentSequence = [];
    this.studentSequence = [];
    this.rhythmHistory = [];
    this.roundDots = [];

    this.phase = "listening";
  }

  preload() {
    const path = "/tambour-des-sons/images";

    this.load.image("rhythm-decor", `${path}/decor.png`);
    this.load.image("rhythm-avatar", `${path}/avatar.png`);
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

    this.time.delayedCall(700, () => {
      this.startRound();
    });
  }

  private createBackground() {
    const width = this.scale.width;
    const height = this.scale.height;

    const background = this.add.image(width / 2, height / 2, "rhythm-decor");

    // Remplit l'écran sans déformer l'image.
    const scale = Math.max(
      width / background.width,
      height / background.height,
    );

    background.setScale(scale);

    // Ombre douce sous les objets.
    this.add.ellipse(202, 598, 150, 30, 0x243f26, 0.18);
    this.add.ellipse(540, 567, 255, 40, 0x243f26, 0.2);
    this.add.ellipse(975, 570, 220, 35, 0x243f26, 0.18);

    this.avatar = this.add.image(200, 605, "rhythm-avatar").setOrigin(0.5, 1);

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
    if (this.phase === "finished") return;

    const round = this.rounds[this.currentRound];

    this.currentSequence = [...round.sequence];

    this.roundText.setText(
      `Round ${this.currentRound + 1} / ${this.rounds.length}`,
    );

    this.roundDots.forEach((dot, index) => {
      dot.setFillStyle(
        index < this.currentRound
          ? 0x8fe094
          : index === this.currentRound
            ? 0xffd36a
            : 0xffffff,
        index <= this.currentRound ? 1 : 0.35,
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
      this.roundStartTime = Date.now();

      this.instructionText.setText("À toi de jouer !");
      this.instructionText.setColor("#baffbf");
      this.answerText.setText(`0 / ${this.currentSequence.length} sons`);
      this.replayButton.setAlpha(1);
    });
  }

  private handlePad(pad: number) {
    if (this.phase !== "answering") return;

    this.playAudio(pad === 0 ? "drum-low" : "drum-high");
    this.animateInstrument(pad);

    this.studentSequence.push(pad);

    this.answerText.setText(
      `${this.studentSequence.length} / ${this.currentSequence.length} sons`,
    );

    if (this.studentSequence.length === this.currentSequence.length) {
      this.responseTimeMs = Date.now() - this.roundStartTime;

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
    const correct =
      this.studentSequence.length === this.currentSequence.length &&
      this.studentSequence.every(
        (pad, index) => pad === this.currentSequence[index],
      );

    if (correct) {
      try {
        if (!this.onCorrectRound) {
          throw new Error("La sauvegarde des étoiles n'est pas configurée.");
        }

        const confirmedBalance = await this.onCorrectRound(this.currentRound);

        if (!this.sys.isActive()) return;

        this.score += 1;
        this.awardStars(confirmedBalance);
      } catch (error) {
        console.error(
          "Impossible d'enregistrer ou d'afficher les étoiles :",
          error,
        );

        if (!this.sys.isActive()) return;

        this.instructionText.setText("Un problème est survenu");
        this.instructionText.setColor("#ffe2a0");
        this.answerText.setText(
          "Vérifie le message dans la console avant de continuer",
        );

        return;
      }
    }

    this.rhythmHistory.push({
      sequence: [...this.currentSequence],
      studentSequence: [...this.studentSequence],
      correct,
      responseTimeMs: this.responseTimeMs,
    });

    this.playAudio(correct ? "success" : "error");

    this.scoreText.setText(`${this.score} / ${this.rounds.length} réussis`);

    this.instructionText.setText(
      correct ? "Bravo, bien joué !" : "On continue, courage !",
    );

    this.instructionText.setColor(correct ? "#baffbf" : "#ffe2a0");

    this.answerText.setText(
      correct ? "Séquence réussie !" : "Une nouvelle séquence arrive",
    );

    this.animateAvatar(correct);

    if (correct) {
      this.showReward();
    }

    this.currentRound += 1;

    this.time.delayedCall(this.feedbackDelayMs, () => {
      if (this.currentRound >= this.rounds.length) {
        this.finish();
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

  private finish() {
    if (this.phase === "finished") return;

    this.phase = "finished";
    this.replayButton.setAlpha(0.5);

    const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

    let stars = 1;

    if (this.score >= 3 && this.score <= 4) {
      stars = 2;
    } else if (this.score === this.rounds.length) {
      stars = 3;
    }

    this.onFinish?.({
      score: this.score,
      maxScore: this.rounds.length,
      stars,
      durationSeconds,
      hintsUsed: this.hintsUsed,
      answers: this.rhythmHistory,
    });

    this.scene.stop();
  }
}
