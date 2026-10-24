import Phaser from "phaser";

export type SyllableRound = {
  word: string;
  expectedSyllables: number;
};

export type SyllableResult = {
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

export class SyllablePathScene extends Phaser.Scene {
  private rounds: SyllableRound[] = [
    { word: "chat", expectedSyllables: 1 },
    { word: "lapin", expectedSyllables: 2 },
    { word: "banane", expectedSyllables: 3 },
    { word: "tomate", expectedSyllables: 3 },
    { word: "papillon", expectedSyllables: 3 },
  ];

  private currentRound = 0;
  private score = 0;
  private hintsUsed = 0;
  private startTime = 0;

  private studentSyllables = 0;
  private roundStartTime = 0;
  private awaitingInput = false;

  private rhythmHistory: SyllableResult["answers"] = [];

  private wordText!: Phaser.GameObjects.Text;
  private counterText!: Phaser.GameObjects.Text;

  private onFinish?: (result: SyllableResult) => void;

  constructor() {
    super("SyllablePathScene");
  }

  init(data: { onFinish?: (result: SyllableResult) => void }) {
    this.onFinish = data.onFinish;

    this.currentRound = 0;
    this.score = 0;
    this.hintsUsed = 0;
    this.startTime = Date.now();
    this.rhythmHistory = [];
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    this.add
      .text(width / 2, 60, "Écoute le mot et tape les syllabes !", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.wordText = this.add
      .text(width / 2, 150, "", {
        fontFamily: "Arial",
        fontSize: "40px",
        color: "#facc15",
      })
      .setOrigin(0.5);

    this.counterText = this.add
      .text(width / 2, 230, "Syllabes : 0", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const drum = this.add
      .rectangle(width / 2, height / 2 + 40, 260, 260, 0x38bdf8)
      .setStrokeStyle(6, 0x0ea5e9)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height / 2 + 40, "TAPE", {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#0f172a",
      })
      .setOrigin(0.5);

    drum.on("pointerdown", () => {
      this.handleTap(drum);
    });

    const doneButton = this.add
      .text(width / 2, height - 100, "J’ai fini !", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#22c55e",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    doneButton.on("pointerdown", () => {
      this.validateRound();
    });

    const replayButton = this.add
      .text(width / 2, height - 160, "Réécouter", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#facc15",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    replayButton.on("pointerdown", () => {
      if (this.awaitingInput) {
        this.hintsUsed += 1;
        this.speakWord();
      }
    });

    this.startRound();
  }

  private startRound() {
    const round = this.rounds[this.currentRound];

    this.studentSyllables = 0;
    this.awaitingInput = false;

    this.wordText.setText(round.word);
    this.counterText.setText("Syllabes : 0");

    this.time.delayedCall(600, () => {
      this.speakWord();

      this.time.delayedCall(1800, () => {
        this.awaitingInput = true;
        this.roundStartTime = Date.now();
      });
    });
  }

  private speakWord() {
    const round = this.rounds[this.currentRound];

    if (!("speechSynthesis" in window)) {
      console.warn("speechSynthesis n’est pas disponible.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(round.word);
    utterance.lang = "fr-FR";
    utterance.rate = 0.8;

    window.speechSynthesis.speak(utterance);
  }

  private handleTap(drum: Phaser.GameObjects.Rectangle) {
    if (!this.awaitingInput) return;

    this.studentSyllables += 1;

    this.counterText.setText(`Syllabes : ${this.studentSyllables}`);

    this.tweens.add({
      targets: drum,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

    drum.setFillStyle(0xffffff);

    this.time.delayedCall(120, () => {
      drum.setFillStyle(0x38bdf8);
    });
  }

  private validateRound() {
    if (!this.awaitingInput) return;

    this.awaitingInput = false;

    const round = this.rounds[this.currentRound];

    const responseTimeMs = Date.now() - this.roundStartTime;

    const correct = this.studentSyllables === round.expectedSyllables;

    if (correct) {
      this.score += 1;
    }

    this.rhythmHistory.push({
      word: round.word,
      expectedSyllables: round.expectedSyllables,
      studentSyllables: this.studentSyllables,
      correct,
      responseTimeMs,
    });

    this.currentRound += 1;

    if (this.currentRound >= this.rounds.length) {
      this.finish();
    } else {
      this.time.delayedCall(1200, () => {
        this.startRound();
      });
    }
  }

  private finish() {
    const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

    let stars = 1;

    if (this.score >= 2 && this.score <= 3) {
      stars = 2;
    } else if (this.score >= 4) {
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
