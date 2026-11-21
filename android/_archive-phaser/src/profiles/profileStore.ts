import { useSyncExternalStore } from "react";
import type { GameId } from "../data/games";
import { applyResult } from "./progression";
import type { GameResult, Profile, StoreData } from "./types";

// Tout reste sur l'appareil : aucun compte, aucun serveur.
const STORAGE_KEY = "lecture-jeux:v1";
const MAX_PROFILES = 12;

let data: StoreData = load();
const listeners = new Set<() => void>();

function newId(): string {
  // randomUUID n'existe qu'en contexte sécurisé (https) : repli pour les tests en http.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyStore(): StoreData {
  return { version: 1, profiles: [] };
}

function load(): StoreData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return emptyStore();

    const parsed = JSON.parse(raw) as Partial<StoreData>;

    if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
      return emptyStore();
    }

    return { version: 1, profiles: parsed.profiles };
  } catch {
    return emptyStore();
  }
}

function commit(next: StoreData) {
  data = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible : la partie en cours continue, sans sauvegarde.
  }

  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return data;
}

export function useStore(): StoreData {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function canCreateProfile(): boolean {
  return data.profiles.length < MAX_PROFILES;
}

export function createProfile(name: string, avatarId: string): Profile | null {
  const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 14);

  if (!cleanName || !canCreateProfile()) return null;

  const profile: Profile = {
    id: newId(),
    name: cleanName,
    avatarId,
    createdAt: Date.now(),
    stars: 0,
    progress: {},
  };

  commit({ ...data, profiles: [...data.profiles, profile] });

  return profile;
}

export function deleteProfile(profileId: string) {
  commit({
    ...data,
    profiles: data.profiles.filter((profile) => profile.id !== profileId),
  });
}

export function recordGameResult(profileId: string, result: GameResult) {
  commit({
    ...data,
    profiles: data.profiles.map((profile) => {
      if (profile.id !== profileId) return profile;

      return {
        ...profile,
        stars: profile.stars + result.stars,
        progress: {
          ...profile.progress,
          [result.gameId]: applyResult(
            profile.progress[result.gameId],
            result,
            Date.now(),
          ),
        },
      };
    }),
  });
}

export function getLevel(profile: Profile, gameId: GameId): number {
  return profile.progress[gameId]?.level ?? 1;
}
