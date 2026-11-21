// Avatars provisoires (emoji). Ils seront remplacés par les vrais personnages
// dessinés : seul `emoji` changera (en image), pas les identifiants `id`,
// qui sont enregistrés dans les profils.
export type Avatar = {
  id: string;
  label: string;
  emoji: string;
};

export const AVATARS: Avatar[] = [
  { id: "renard", label: "Renard", emoji: "🦊" },
  { id: "panda", label: "Panda", emoji: "🐼" },
  { id: "lion", label: "Lion", emoji: "🦁" },
  { id: "grenouille", label: "Grenouille", emoji: "🐸" },
  { id: "pieuvre", label: "Pieuvre", emoji: "🐙" },
  { id: "licorne", label: "Licorne", emoji: "🦄" },
  { id: "hibou", label: "Hibou", emoji: "🦉" },
  { id: "dragon", label: "Dragon", emoji: "🐲" },
  { id: "robot", label: "Robot", emoji: "🤖" },
  { id: "chat", label: "Chat", emoji: "🐱" },
  { id: "dino", label: "Dinosaure", emoji: "🦖" },
  { id: "pingouin", label: "Pingouin", emoji: "🐧" },
];

export function getAvatar(id: string): Avatar {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}
