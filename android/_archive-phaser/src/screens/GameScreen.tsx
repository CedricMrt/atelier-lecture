import Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import AdPlaceholder from "../components/AdPlaceholder";
import { getAvatar } from "../data/avatars";
import type { GameId } from "../data/games";
import {
  VolcanoBridgeScene,
  type VolcanoResult,
} from "../games/volcano/VolcanoBridgeScene";
import { getLevel, recordGameResult } from "../profiles/profileStore";
import type { Profile } from "../profiles/types";
import { shouldShowAdBeforeGame } from "../services/ads";
import { cancelSpeech } from "../services/speech";

type GameScreenProps = {
  profile: Profile;
  gameId: GameId;
  onExit: () => void;
};

const ROUNDS_PER_GAME = 5;

export default function GameScreen({
  profile,
  gameId,
  onExit,
}: GameScreenProps) {
  // La pub éventuelle passe avant le jeu, jamais pendant.
  const [showAd, setShowAd] = useState(() => shouldShowAdBeforeGame());
  const [result, setResult] = useState<VolcanoResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Le niveau est lu une seule fois par partie : il change à la fin, pas pendant.
  const levelRef = useRef(getLevel(profile, gameId));

  useEffect(() => {
    if (showAd || result || !containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: "#2b0f0a",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720,
      },
    });

    game.scene.add("VolcanoBridgeScene", VolcanoBridgeScene, true, {
      level: levelRef.current,
      rounds: ROUNDS_PER_GAME,
      avatarEmoji: getAvatar(profile.avatarId).emoji,
      onFinish: (finished: VolcanoResult) => {
        recordGameResult(profile.id, {
          gameId,
          stars: finished.stars,
          accuracy: finished.accuracy,
        });

        setResult(finished);
      },
    });

    return () => {
      cancelSpeech();
      game.destroy(true);
    };
  }, [showAd, result, attempt, profile.id, profile.avatarId, gameId]);

  function replay() {
    levelRef.current = getLevel(profile, gameId);
    setResult(null);
    setAttempt((value) => value + 1);
    setShowAd(shouldShowAdBeforeGame());
  }

  return (
    <>
      <div className='game-host' ref={containerRef} />

      {!showAd && !result && (
        <button
          className='btn btn--ghost btn--small game-back'
          type='button'
          onClick={onExit}
        >
          ✕ Quitter
        </button>
      )}

      {showAd && <AdPlaceholder onClose={() => setShowAd(false)} />}

      {result && (
        <div className='overlay'>
          <div className='dialog'>
            <h2>Bravo {profile.name} !</h2>

            <div className='stars'>
              {"⭐".repeat(result.stars)}
              {"☆".repeat(3 - result.stars)}
            </div>

            <div className='dialog__actions'>
              <button className='btn btn--ghost' type='button' onClick={onExit}>
                Retour aux jeux
              </button>
              <button className='btn' type='button' onClick={replay}>
                Rejouer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
