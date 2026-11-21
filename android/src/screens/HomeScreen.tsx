import { useEffect, useState } from "react";
import { getAvatar } from "../data/avatars";
import { GAMES, type GameId } from "../data/games";
import { getLevel } from "../profiles/profileStore";
import type { Profile } from "../profiles/types";
import { hasFrenchVoice } from "../services/speech";

type HomeScreenProps = {
  profile: Profile;
  onPlay: (gameId: GameId) => void;
  onChangePlayer: () => void;
};

export default function HomeScreen({
  profile,
  onPlay,
  onChangePlayer,
}: HomeScreenProps) {
  const [voiceMissing, setVoiceMissing] = useState(false);

  useEffect(() => {
    let active = true;

    void hasFrenchVoice().then((ok) => {
      if (active) setVoiceMissing(!ok);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className='screen'>
      <div className='topbar'>
        <button
          className='btn btn--ghost btn--small'
          type='button'
          onClick={onChangePlayer}
        >
          ← Changer de joueur
        </button>

        <span className='badge'>
          {getAvatar(profile.avatarId).emoji} {profile.name} · ⭐ {profile.stars}
        </span>
      </div>

      <h1 className='screen__title'>À quoi on joue, {profile.name} ?</h1>

      {voiceMissing && (
        <p className='warn'>
          Aucune voix française n’est installée sur cet appareil : les mots ne
          pourront pas être dits. Un adulte peut en ajouter une dans les
          réglages Android (synthèse vocale).
        </p>
      )}

      <div className='tiles'>
        {GAMES.map((game) => (
          <button
            key={game.id}
            className={game.available ? "tile" : "tile tile--locked"}
            type='button'
            disabled={!game.available}
            onClick={() => onPlay(game.id)}
          >
            <span className='tile__emoji'>{game.emoji}</span>
            <span className='tile__name'>{game.title}</span>
            <span className='tile__meta'>
              {game.available
                ? `Niveau ${getLevel(profile, game.id)}`
                : "Bientôt"}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
