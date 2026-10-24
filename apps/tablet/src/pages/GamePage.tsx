/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from "react";
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
import { saveRhythmResult } from "../db/results";
import { getStarBalance, creditRhythmRoundStars } from "../db/stars";

export default function GamePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let isMounted = true;

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

      const activities = await db.sessionActivities
        .where("sessionId")
        .equals(sessionId)
        .sortBy("position");
      if (!isMounted) return;

      const currentActivity = activities.find(
        (activity) => activity.status !== "completed",
      );

      if (!currentActivity) {
        await endSession(sessionId);
        navigate(`/session-end/${sessionId}`);
        return;
      }

      await db.sessionActivities.update(currentActivity.id, {
        status: "in_progress",
        startedAt: Date.now(),
      });
      if (!isMounted) return;

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
          mode: Phaser.Scale.FIT,
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

      if (currentActivity.type === "syllables") {
        game.scene.add("SyllablePathScene", SyllablePathScene, true, {
          onFinish: async (result: SyllableResult) => {
            for (const answer of result.answers) {
              await saveRhythmResult({
                sessionId,
                sessionActivityId: currentActivity.id,
                studentId: session.studentId,
                sequence: [answer.expectedSyllables],
                studentSequence: [answer.studentSyllables],
                correct: answer.correct,
                responseTimeMs: answer.responseTimeMs,
                hintsUsed: result.hintsUsed,
              });
            }

            await completeSessionActivity(
              currentActivity.id,
              result.score,
              result.stars,
              result.durationSeconds,
            );

            if (isMounted) {
              navigate(`/activity-end/${sessionId}/${currentActivity.id}`);
            }
          },
        });
      } else {
        game.scene.add("RhythmDrumScene", RhythmDrumScene, true, {
          initialStarBalance,

          onCorrectRound: (roundIndex: number) =>
            creditRhythmRoundStars(currentActivity.id, roundIndex),

          onFinish: async (result: RhythmResult) => {
            for (let i = 0; i < result.answers.length; i += 1) {
              const answer = result.answers[i];

              await saveRhythmResult({
                sessionId,
                sessionActivityId: currentActivity.id,
                studentId: session.studentId,
                sequence: answer.sequence,
                studentSequence: answer.studentSequence,
                correct: answer.correct,
                responseTimeMs: answer.responseTimeMs,
                hintsUsed: i === 0 ? result.hintsUsed : 0,
              });
            }

            await completeSessionActivity(
              currentActivity.id,
              result.score,
              result.stars,
              result.durationSeconds,
            );

            if (isMounted) {
              navigate(`/activity-end/${sessionId}/${currentActivity.id}`);
            }
          },
        });
      }
    };

    load();

    return () => {
      isMounted = false;

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
    <div className='h-screen w-screen overflow-hidden bg-slate-900 flex items-center justify-center p-2'>
      <div
        ref={containerRef}
        className='w-full h-full max-w-[1200px] aspect-video rounded-2xl overflow-hidden border-4 border-slate-700'
      />
    </div>
  );
}
