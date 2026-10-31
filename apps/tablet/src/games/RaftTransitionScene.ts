import Phaser from "phaser";

type RaftTransitionData = {
  avatarUrl?: string;
  avatarTextureKey?: string;
  onFinished?: () => void;
};

export default class RaftTransitionScene extends Phaser.Scene {
  private avatarUrl = "";
  private avatarTextureKey = "";
  private onFinished?: () => void;

  constructor() {
    super("RaftTransition");
  }

  init(data: RaftTransitionData) {
    this.avatarUrl = data.avatarUrl ?? "";
    this.avatarTextureKey = data.avatarTextureKey ?? "raft-avatar-fallback";
    this.onFinished = data.onFinished;
  }

  preload() {
    if (this.avatarUrl && !this.textures.exists(this.avatarTextureKey)) {
      this.load.image(this.avatarTextureKey, this.avatarUrl);
    }
  }

  create() {
    const { width, height } = this.scale;

    this.createSky(width, height);
    this.createSun(width);
    this.createClouds();
    this.createBirds(width);
    this.createDistantIslands(height);
    this.createSea(width, height);
    this.createRaft(width, height);
    this.createTitle(width);
  }

  private createSky(width: number, height: number) {
    const sky = this.add.graphics();

    sky.fillGradientStyle(0x8fd8ff, 0x8fd8ff, 0xd8f3ff, 0xffe9c2, 1);

    sky.fillRect(0, 0, width, height);
  }

  private createSun(width: number) {
    const sun = this.add.circle(width - 170, 130, 62, 0xffd977);

    this.add.circle(width - 170, 130, 88, 0xffd977, 0.22);

    this.tweens.add({
      targets: sun,
      scale: 1.06,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createClouds() {
    const cloudPositions = [
      { x: 180, y: 110, scale: 1 },
      { x: 520, y: 70, scale: 0.75 },
      { x: 880, y: 140, scale: 0.9 },
      { x: 1150, y: 85, scale: 0.65 },
    ];

    cloudPositions.forEach((position, index) => {
      const cloud = this.add.container(position.x, position.y);

      const body = this.add.ellipse(0, 0, 150, 58, 0xffffff, 0.92);
      const left = this.add.ellipse(-48, 10, 90, 44, 0xffffff, 0.88);
      const right = this.add.ellipse(48, 12, 100, 46, 0xffffff, 0.88);

      cloud.add([left, right, body]);
      cloud.setScale(position.scale);

      this.tweens.add({
        targets: cloud,
        x: position.x - 45,
        duration: 7000 + index * 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }

  private createBirds(width: number) {
    for (let i = 0; i < 3; i++) {
      const bird = this.add.text(width + 60, 110 + i * 45, "🕊️", {
        fontSize: "30px",
      });

      this.tweens.add({
        targets: bird,
        x: -80,
        y: bird.y + Phaser.Math.Between(-25, 25),
        duration: 6500 + i * 800,
        delay: i * 500,
        ease: "Sine.easeInOut",
      });
    }
  }

  private createDistantIslands(height: number) {
    const islands = this.add.graphics();

    islands.fillStyle(0x2f8f7a, 0.75);
    islands.fillEllipse(190, height * 0.52, 260, 55);
    islands.fillEllipse(1080, height * 0.5, 320, 62);

    islands.fillStyle(0x3fae8c, 0.85);
    islands.fillEllipse(190, height * 0.5, 210, 38);
    islands.fillEllipse(1080, height * 0.48, 250, 42);

    islands.fillStyle(0x74c69d, 0.9);
    islands.fillEllipse(190, height * 0.48, 130, 24);
    islands.fillEllipse(1080, height * 0.46, 160, 26);
  }

  private createSea(width: number, height: number) {
    const sea = this.add.graphics();

    sea.fillGradientStyle(0x4cc3e8, 0x4cc3e8, 0x1273a3, 0x0b5a83, 1);

    sea.fillRect(0, height * 0.52, width, height * 0.48);

    for (let i = 0; i < 16; i++) {
      const wave = this.add.ellipse(
        Phaser.Math.Between(80, width - 80),
        Phaser.Math.Between(height * 0.58, height - 35),
        Phaser.Math.Between(140, 260),
        Phaser.Math.Between(16, 30),
        0xffffff,
        Phaser.Math.FloatBetween(0.12, 0.28),
      );

      this.tweens.add({
        targets: wave,
        x: wave.x + Phaser.Math.Between(-55, 55),
        alpha: 0.05,
        scaleX: 1.15,
        duration: Phaser.Math.Between(1500, 2600),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private createRaft(width: number, height: number) {
    const raft = this.add.container(width + 280, height * 0.72);

    // Ombre sous le radeau
    const shadow = this.add.ellipse(0, 48, 250, 34, 0x083344, 0.28);

    // Radeau
    const plankBack = this.add.rectangle(0, 8, 250, 30, 0x8a5426);
    const plankFront = this.add.rectangle(0, -14, 250, 32, 0xa9713a);
    const plankDetail = this.add.rectangle(0, -14, 250, 6, 0xc08a4d);
    // Mât vertical
    const mast = this.add.rectangle(75, -70, 10, 115, 0x6b4423);

    const sail = this.add.triangle(
      35,
      -80,
      90,
      -45, // sommet haut, côté mât
      90,
      45, // sommet bas, côté mât
      0,
      0, // pointe de la voile, vers la gauche
      0xfff3cf,
    );

    const sailStripe = this.add.triangle(
      55,
      -80,
      45,
      -20,
      45,
      20,
      0,
      0,
      0xf9c66b,
    );

    const ropeLeft = this.add.rectangle(-78, -3, 12, 72, 0x6b4423);
    const ropeRight = this.add.rectangle(78, -3, 12, 72, 0x6b4423);

    raft.add([
      shadow,
      plankBack,
      plankFront,
      plankDetail,
      ropeLeft,
      ropeRight,
      mast,
      sail,
      sailStripe,
    ]);

    // Avatar
    if (this.textures.exists(this.avatarTextureKey)) {
      const avatar = this.add
        .image(-35, -13, this.avatarTextureKey)
        .setOrigin(0.5, 1)
        .setScale(0.16);

      raft.add(avatar);

      this.tweens.add({
        targets: avatar,
        angle: { from: -3, to: 3 },
        y: "-=6",
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Balancement du radeau
    this.tweens.add({
      targets: raft,
      angle: { from: -2.5, to: 2.5 },
      y: "-=12",
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Écume derrière le radeau
    const foam = this.add.particles(
      0,
      0,
      "white-square" in this.textures ? "white-square" : "__DEFAULT",
      {
        speedY: { min: 20, max: 55 },
        speedX: { min: -30, max: 30 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.55, end: 0 },
        lifespan: 900,
        frequency: 45,
      },
    );

    foam.startFollow(raft, -110, 35);

    // Traversée
    this.tweens.add({
      targets: raft,
      x: -300,
      duration: 4200,
      ease: "Sine.easeInOut",
      onComplete: () => {
        foam.destroy();
        this.scene.stop();
        this.onFinished?.();
      },
    });
  }

  private createTitle(width: number) {
    this.add
      .text(width / 2, 68, "En route vers la prochaine mission…", {
        fontFamily: "Arial",
        fontSize: "32px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#0b4f63",
        strokeThickness: 7,
        shadow: {
          offsetX: 0,
          offsetY: 5,
          color: "rgba(0,0,0,0.25)",
          blur: 8,
          fill: true,
        },
      })
      .setOrigin(0.5);
  }
}
