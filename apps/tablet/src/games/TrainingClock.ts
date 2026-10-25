import type Phaser from "phaser";

import {
  checkpointTrainingTime,
  releaseTrainingClock,
} from "../db/trainingTime";

export type ClockDisplay = {
  sessionRemainingMs: number;
  activityRemainingMs: number;
  paused: boolean;
};

type ClockOptions = {
  scene: Phaser.Scene;

  sessionId: string;
  sessionActivityId: string;
  runId: string;

  initialSessionMs: number;
  initialActivityMs: number;

  sessionLimitMs: number;
  activityBudgetMs: number;

  onDisplay: (display: ClockDisplay) => void;
  onSessionLimit: () => Promise<void>;
  onError: (error: unknown) => void;
};

export class TrainingClock {
  private readonly options: ClockOptions;

  private cumulativeMs = 0;
  private lastSample = 0;

  private started = false;
  private paused = false;
  private closing = false;
  private limitRequested = false;

  private interval: ReturnType<typeof setInterval> | null = null;

  private queue: Promise<void> = Promise.resolve();
  private closePromise: Promise<void> | null = null;

  private lastCheckpointAt = 0;

  constructor(options: ClockOptions) {
    this.options = options;
  }

  private sample() {
    const now = performance.now();

    if (this.started && !this.paused && !this.closing) {
      const delta = Math.max(0, now - this.lastSample);

      const remaining = Math.max(
        0,
        this.options.sessionLimitMs -
          this.options.initialSessionMs -
          this.cumulativeMs,
      );

      this.cumulativeMs += Math.min(delta, remaining);
    }

    this.lastSample = now;
  }

  private publish() {
    this.options.onDisplay({
      sessionRemainingMs: Math.max(
        0,
        this.options.sessionLimitMs -
          this.options.initialSessionMs -
          this.cumulativeMs,
      ),

      activityRemainingMs: Math.max(
        0,
        this.options.activityBudgetMs -
          this.options.initialActivityMs -
          this.cumulativeMs,
      ),

      paused: this.paused,
    });
  }

  private applyPause() {
    const scene = this.options.scene;

    scene.time.paused = this.paused;
    scene.input.enabled = !this.paused;

    if (this.paused) {
      scene.tweens.pauseAll();
      scene.sound.pauseAll();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.pause();
      }
    } else {
      scene.tweens.resumeAll();
      scene.sound.resumeAll();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
    }
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.setPaused(true);
    }
  };

  start() {
    if (this.started || this.closing) return;

    this.started = true;
    this.lastSample = performance.now();
    this.lastCheckpointAt = this.lastSample;
    this.paused = document.hidden;

    this.applyPause();
    this.publish();

    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.interval = setInterval(() => {
      if (this.closing) return;

      this.sample();
      this.publish();

      const expired =
        this.options.initialSessionMs + this.cumulativeMs >=
        this.options.sessionLimitMs;

      if (expired && !this.limitRequested) {
        this.limitRequested = true;

        // N’attend pas le prochain checkpoint pour
        // demander l’arrêt des interactions.
        void this.options.onSessionLimit().catch(this.options.onError);

        return;
      }

      if (performance.now() - this.lastCheckpointAt >= 1000) {
        this.lastCheckpointAt = performance.now();

        void this.flush().catch(this.options.onError);
      }
    }, 100);
  }

  setPaused(paused: boolean) {
    if (!this.started || this.closing || (document.hidden && !paused)) {
      return;
    }

    this.sample();
    this.paused = paused;
    this.lastSample = performance.now();

    this.applyPause();
    this.publish();

    void this.flush().catch(this.options.onError);
  }

  isPaused() {
    return this.paused;
  }

  activityNow() {
    this.sample();

    return this.options.initialActivityMs + this.cumulativeMs;
  }

  budgetReached() {
    return this.activityNow() >= this.options.activityBudgetMs;
  }

  sessionExpired() {
    this.sample();

    return (
      this.options.initialSessionMs + this.cumulativeMs >=
      this.options.sessionLimitMs
    );
  }

  flush(): Promise<void> {
    this.sample();

    const cumulativeActiveMs = this.cumulativeMs;

    this.queue = this.queue.then(async () => {
      await checkpointTrainingTime({
        sessionId: this.options.sessionId,
        sessionActivityId: this.options.sessionActivityId,
        runId: this.options.runId,
        cumulativeActiveMs,
      });
    });

    return this.queue;
  }

  close(): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }

    this.sample();
    this.closing = true;

    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }

    document.removeEventListener("visibilitychange", this.onVisibilityChange);

    this.closePromise = (async () => {
      await this.flush();

      await releaseTrainingClock(this.options.sessionId, this.options.runId);
    })();

    return this.closePromise;
  }
}
