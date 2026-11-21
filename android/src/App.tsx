import { useState } from "react";
import type { GameId } from "./data/games";
import { useStore } from "./profiles/profileStore";
import GameScreen from "./screens/GameScreen";
import HomeScreen from "./screens/HomeScreen";
import WhoPlaysScreen from "./screens/WhoPlaysScreen";

type Screen =
  | { name: "who" }
  | { name: "home"; profileId: string }
  | { name: "game"; profileId: string; gameId: GameId };

export default function App() {
  const { profiles } = useStore();
  const [screen, setScreen] = useState<Screen>({ name: "who" });

  if (screen.name === "who") {
    return (
      <WhoPlaysScreen
        onSelect={(profile) => setScreen({ name: "home", profileId: profile.id })}
      />
    );
  }

  // Le profil est relu à chaque affichage : étoiles et niveaux restent à jour.
  const profile = profiles.find((item) => item.id === screen.profileId);

  if (!profile) {
    return (
      <WhoPlaysScreen
        onSelect={(selected) =>
          setScreen({ name: "home", profileId: selected.id })
        }
      />
    );
  }

  if (screen.name === "game") {
    return (
      <GameScreen
        profile={profile}
        gameId={screen.gameId}
        onExit={() => setScreen({ name: "home", profileId: profile.id })}
      />
    );
  }

  return (
    <HomeScreen
      profile={profile}
      onPlay={(gameId) =>
        setScreen({ name: "game", profileId: profile.id, gameId })
      }
      onChangePlayer={() => setScreen({ name: "who" })}
    />
  );
}
