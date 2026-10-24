import { useEffect, useRef } from "react";
import Phaser from "phaser";

class PhaserTestScene extends Phaser.Scene {
  private counter = 0;
  private counterText?: Phaser.GameObjects.Text;

  constructor() {
    super("PhaserTestScene");
  }

  preload() {
    this.load.audio("drum-low", "/audio/drum-low.mp3");
    this.load.audio("drum-high", "/audio/drum-high.mp3");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    this.add
      .text(width / 2, 60, "Test Phaser", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const leftPad = this.add
      .rectangle(width / 4, height / 2, 220, 220, 0x38bdf8)
      .setStrokeStyle(6, 0x0ea5e9)
      .setInteractive({ useHandCursor: true });

    const rightPad = this.add
      .rectangle((width / 4) * 3, height / 2, 220, 220, 0xf472b6)
      .setStrokeStyle(6, 0xdb2777)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 4, height / 2, "GRAVE", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#0f172a",
      })
      .setOrigin(0.5);

    this.add
      .text((width / 4) * 3, height / 2, "AIGU", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#0f172a",
      })
      .setOrigin(0.5);

    this.counterText = this.add
      .text(width / 2, height - 80, "Touches : 0", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    leftPad.on("pointerdown", () => {
      this.playPad("drum-low", leftPad, 0x38bdf8);
    });

    rightPad.on("pointerdown", () => {
      this.playPad("drum-high", rightPad, 0xf472b6);
    });
  }

  private playPad(
    soundKey: string,
    pad: Phaser.GameObjects.Rectangle,
    baseColor: number,
  ) {
    this.sound.play(soundKey);

    this.counter += 1;

    if (this.counterText) {
      this.counterText.setText(`Touches : ${this.counter}`);
    }

    this.tweens.add({
      targets: pad,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

    pad.setFillStyle(0xffffff);

    this.time.delayedCall(120, () => {
      pad.setFillStyle(baseColor);
    });
  }
}

export default function PhaserTestPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 600,
      backgroundColor: "#0f172a",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      audio: {
        disableWebAudio: false,
      },
      scene: [PhaserTestScene],
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4'>
      <h1 className='text-2xl font-bold mb-4'>Test Phaser</h1>

      <div
        ref={containerRef}
        className='w-full max-w-3xl aspect-[4/3] rounded-xl overflow-hidden border-4 border-slate-700'
      />
    </div>
  );
}
