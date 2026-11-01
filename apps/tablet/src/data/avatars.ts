export type AvatarChoice = {
  avatarKey: string;
  avatarVariant: string;
  label: string;
};

export const AVATAR_CHOICES: AvatarChoice[] = [
  {
    avatarKey: "chat",
    avatarVariant: "orange",
    label: "Chat orange",
  },
  {
    avatarKey: "chatte",
    avatarVariant: "bleu",
    label: "Chatte bleu",
  },
  {
    avatarKey: "chatte",
    avatarVariant: "rose",
    label: "Chatte rose",
  },
  {
    avatarKey: "ours",
    avatarVariant: "bleu",
    label: "Ours bleu",
  },
  {
    avatarKey: "ours",
    avatarVariant: "orange",
    label: "Ours orange",
  },
  {
    avatarKey: "ourse",
    avatarVariant: "rose",
    label: "Ourse rose",
  },
  {
    avatarKey: "ourse",
    avatarVariant: "violette",
    label: "Ourse violette",
  },
  {
    avatarKey: "panda",
    avatarVariant: "orange",
    label: "Panda orange",
  },
  {
    avatarKey: "panda",
    avatarVariant: "rose",
    label: "Panda rose",
  },
  {
    avatarKey: "panda",
    avatarVariant: "violette",
    label: "Panda violette",
  },
  {
    avatarKey: "renard",
    avatarVariant: "bleu",
    label: "Renard bleu",
  },
  {
    avatarKey: "renard",
    avatarVariant: "orange",
    label: "Renard orange",
  },
  {
    avatarKey: "renarde",
    avatarVariant: "bleu",
    label: "Renarde bleu",
  },
  {
    avatarKey: "renarde",
    avatarVariant: "rose",
    label: "Renarde rose",
  },
];

export function getAvatarImageUrl(
  avatarKey: string,
  avatarVariant: string,
): string {
  return (
    `${import.meta.env.BASE_URL}avatar/` +
    `${encodeURIComponent(avatarKey)}-` +
    `${encodeURIComponent(avatarVariant)}.png`
  );
}
