/* eslint-disable react-hooks/exhaustive-deps */
import "./GamePage.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Phaser from "phaser";
import { RhythmDrumScene, type RhythmResult } from "../games/RhythmDrumScene";
import {
  SyllablePathScene,
  type SyllableResult,
} from "../games/SyllablePathScene";
import { db } from "../db/db";
import {
  completeSessionActivity,
  endSession,
  isSessionExpired,
} from "../db/sessions";
import { getStarBalance } from "../db/stars";
import { saveRhythmRound, saveSyllableRound } from "../db/rounds";

import { getActivityResume } from "../db/activityResume";
import { getAvatarImageUrl } from "../data/avatars";
import { beginTrainingClock } from "../db/trainingTime";
import { TrainingClock, type ClockDisplay } from "../games/TrainingClock";
import { formatRemainingTime } from "../games/trainingRules";

export default function GamePage() {
  const { sessionId } = useParams();

  if (!sessionId) {
    return (
      <main className='game-screen'>
        <div role='alert'>Aucune séance n’a été sélectionnée.</div>
      </main>
    );
  }

  return <GameSession key={sessionId} sessionId={sessionId} />;
}

type GameSessionProps = {
  sessionId: string;
};

function GameSession({ sessionId }: GameSessionProps) {
  const navigate = useNavigate();

  const clockRef = useRef<TrainingClock | null>(null);
  const [clockDisplay, setClockDisplay] = useState<ClockDisplay | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const showGameError = (error: unknown) => {
      console.error("Erreur pendant l’activité :", error);

      if (!isMounted) return;
      const clock = clockRef.current;

      if (clock) {
        void clock.close().catch((clockError) => {
          console.error(
            "Arrêt du compteur après erreur impossible :",
            clockError,
          );
        });
      }

      const scene = gameRef.current?.scene.getScenes(true)[0];

      if (scene) {
        scene.input.enabled = false;
        scene.time.paused = true;
        scene.sound.stopAll();
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : "L’activité a rencontré un problème.",
      );
    };
    const load = async () => {
      if (!sessionId || !containerRef.current) return;

      const expired = await isSessionExpired(sessionId);
      if (!isMounted) return;

      if (expired) {
        await endSession(sessionId);
        navigate(`/session-end/${sessionId}`);
        return;
      }

      const session = await db.sessions.get(sessionId);
      if (!isMounted) return;

      if (!session) {
        navigate("/scan");
        return;
      }

      if (session.status !== "in_progress") {
        navigate(`/session-end/${sessionId}`, {
          replace: true,
        });
        return;
      }

      const student = await db.students.get(session.studentId);

      if (!isMounted) return;

      if (!student) {
        navigate("/scan");
        return;
      }

      const avatarUrl = getAvatarImageUrl(
        student.avatarKey,
        student.avatarVariant,
      );

      const avatarTextureKey = `student-avatar:${student.avatarKey}:${student.avatarVariant}`;

      const activities = await db.sessionActivities
        .where("sessionId")
        .equals(sessionId)
        .sortBy("position");
      if (!isMounted) return;

      const currentActivity = activities.find(
        (activity) =>
          activity.status === "pending" || activity.status === "in_progress",
      );

      if (!currentActivity) {
        await endSession(sessionId);
        navigate(`/session-end/${sessionId}`);
        return;
      }

      const activityStartedAt = currentActivity.startedAt ?? Date.now();

      await db.sessionActivities.update(currentActivity.id, {
        status: "in_progress",
        startedAt: activityStartedAt,
      });

      if (!isMounted) return;

      const resume = await getActivityResume(
        currentActivity.id,
        currentActivity.activityCode,
      );

      if (!isMounted) return;

      // Nombre total d’aides déjà persistées.
      // Chaque nouveau round enregistrera seulement la différence.
      let persistedHints = resume.hintsUsed;

      function getNewHints(totalHints: number) {
        if (!Number.isInteger(totalHints) || totalHints < persistedHints) {
          throw new Error("Compteur d’aides incohérent.");
        }

        return totalHints - persistedHints;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      const initialStarBalance = await getStarBalance(session.studentId);

      if (!isMounted || !containerRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: "#0f172a",
        scale: {
          mode: Phaser.Scale.EXPAND,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 1280,
          height: 720,
          expandParent: false,
        },
        scene: [],
      });

      if (!isMounted) {
        game.destroy(true);
        return;
      }

      gameRef.current = game;

      const isTimed =
        session.timingMode === "active_time" &&
        currentActivity.timingMode === "active_time";

      const sceneKey =
        currentActivity.type === "syllables"
          ? "SyllablePathScene"
          : currentActivity.type === "rhythm"
            ? "RhythmDrumScene"
            : null;

      if (!sceneKey) {
        throw new Error("Type d’activité non pris en charge.");
      }

      // Une instance réelle est créée ici.
      // Le compteur et Phaser utiliseront le même objet.
      const activityScene: RhythmDrumScene | SyllablePathScene =
        currentActivity.type === "syllables"
          ? new SyllablePathScene()
          : new RhythmDrumScene();

      let trainingClock: TrainingClock | undefined;

      if (isTimed) {
        if (currentActivity.timeBudgetSeconds === undefined) {
          throw new Error("Le budget de cette mission est manquant.");
        }

        const runId = await beginTrainingClock(sessionId, currentActivity.id);

        trainingClock = new TrainingClock({
          scene: activityScene,

          sessionId,
          sessionActivityId: currentActivity.id,
          runId,

          initialSessionMs: session.activeDurationMs ?? 0,

          initialActivityMs: currentActivity.activeDurationMs ?? 0,

          sessionLimitMs: session.durationLimitSeconds * 1000,

          activityBudgetMs: currentActivity.timeBudgetSeconds * 1000,

          onDisplay: (display) => {
            if (isMounted) {
              setClockDisplay(display);
            }
          },

          onSessionLimit: async () => {
            await activityScene.stopForSessionLimit();
          },

          onError: showGameError,
        });

        clockRef.current = trainingClock;

        if (!isMounted) {
          await trainingClock.close();
          return;
        }
      }

      if (currentActivity.type === "syllables") {
        game.scene.add("SyllablePathScene", activityScene, true, {
          trainingClock,
          avatarUrl,
          avatarTextureKey,
          initialStarBalance,

          initialAnswers: resume.syllableAnswers,
          initialHintsUsed: resume.hintsUsed,
          activityStartedAt,

          onRoundValidated: async (
            roundIndex: number,
            answer: SyllableResult["answers"][number],
            totalHints: number,
          ) => {
            const saved = await saveSyllableRound({
              sessionId,
              sessionActivityId: currentActivity.id,
              studentId: session.studentId,
              roundIndex,

              ...answer,

              hintsUsed: getNewHints(totalHints),
            });

            persistedHints = totalHints;

            return saved.starBalance;
          },

          onFinish: async (result: SyllableResult) => {
            try {
              // Le compteur est persisté avant de clôturer
              // l’activité ou la séance.
              await trainingClock?.close();

              await completeSessionActivity(
                currentActivity.id,
                result.score,
                result.stars,
                result.durationSeconds,
                result.endReason,
              );

              if (result.endReason === "session_time_limit") {
                await endSession(sessionId);

                if (isMounted) {
                  navigate(`/session-end/${sessionId}`, {
                    replace: true,
                  });
                }

                return;
              }

              if (isMounted) {
                navigate(`/activity-end/${sessionId}/${currentActivity.id}`);
              }
            } catch (error) {
              showGameError(error);
            }
          },
        });
      } else if (currentActivity.type === "rhythm") {
        game.scene.add("RhythmDrumScene", activityScene, true, {
          trainingClock,
          avatarUrl,
          avatarTextureKey,
          initialStarBalance,

          initialAnswers: resume.rhythmAnswers,
          initialHintsUsed: resume.hintsUsed,
          activityStartedAt,

          onRoundValidated: async (
            roundIndex: number,
            answer: RhythmResult["answers"][number],
            totalHints: number,
          ) => {
            const saved = await saveRhythmRound({
              sessionId,
              sessionActivityId: currentActivity.id,
              studentId: session.studentId,
              roundIndex,

              ...answer,

              hintsUsed: getNewHints(totalHints),
            });

            persistedHints = totalHints;

            return saved.starBalance;
          },

          onFinish: async (result: RhythmResult) => {
            try {
              // Le compteur est persisté avant de clôturer
              // l’activité ou la séance.
              await trainingClock?.close();

              await completeSessionActivity(
                currentActivity.id,
                result.score,
                result.stars,
                result.durationSeconds,
                result.endReason,
              );

              if (result.endReason === "session_time_limit") {
                await endSession(sessionId);

                if (isMounted) {
                  navigate(`/session-end/${sessionId}`, {
                    replace: true,
                  });
                }

                return;
              }

              if (isMounted) {
                navigate(`/activity-end/${sessionId}/${currentActivity.id}`);
              }
            } catch (error) {
              showGameError(error);
            }
          },
        });
      } else {
        throw new Error("Type d’activité non pris en charge.");
      }
    };

    void load().catch((error) => {
      console.error("Chargement du jeu impossible :", error);

      if (!isMounted) return;

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de préparer cette activité.",
      );
    });

    return () => {
      isMounted = false;

      const clock = clockRef.current;
      clockRef.current = null;

      if (clock) {
        void clock.close().catch((error) => {
          console.error("Dernière sauvegarde du compteur impossible :", error);
        });
      }

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [sessionId, navigate]);

  return (
    <main className='game-screen'>
      {clockDisplay && !loadError && (
        <div
          style={{
            position: "fixed",
            left: 16,
            bottom: 12,
            zIndex: 50,

            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,

            padding: "10px 14px",
            border: "2px solid #ffdb91",
            borderRadius: 16,

            background: "#103c37",
            color: "#fff2c5",
            fontFamily: "Arial",
          }}
        >
          <span>
            Séance : {formatRemainingTime(clockDisplay.sessionRemainingMs)}
          </span>

          <span>
            Mission : {formatRemainingTime(clockDisplay.activityRemainingMs)}
          </span>

          <button
            type='button'
            onClick={() => {
              const clock = clockRef.current;

              if (clock) {
                clock.setPaused(!clock.isPaused());
              }
            }}
            style={{
              padding: "8px 12px",
              border: 0,
              borderRadius: 10,
              background: "#f7cf72",
              color: "#62401e",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {clockDisplay.paused ? "Reprendre" : "Pause"}
          </button>

          {clockDisplay.paused && <span role='status'>En pause</span>}
        </div>
      )}
      {loadError ? (
        <div
          role='alert'
          style={{
            maxWidth: 600,
            margin: "40px auto",
            padding: 24,
            color: "#fff8df",
            background: "#164e43",
            borderRadius: 20,
            textAlign: "center",
          }}
        >
          <h1>Le jeu n’a pas pu démarrer</h1>
          <p>{loadError}</p>

          <button
            type='button'
            onClick={() =>
              navigate(`/island/${sessionId}`, {
                replace: true,
              })
            }
          >
            Retour à mon archipel
          </button>
        </div>
      ) : (
        <div ref={containerRef} className='game-screen__canvas' />
      )}
    </main>
  );
}
