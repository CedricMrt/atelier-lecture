import { useState } from "react";
import AdultGate from "../components/AdultGate";
import { AVATARS, getAvatar } from "../data/avatars";
import {
  canCreateProfile,
  createProfile,
  deleteProfile,
  useStore,
} from "../profiles/profileStore";
import type { Profile } from "../profiles/types";

type WhoPlaysScreenProps = {
  onSelect: (profile: Profile) => void;
};

export default function WhoPlaysScreen({ onSelect }: WhoPlaysScreenProps) {
  const { profiles } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);

  function handleCreate() {
    const profile = createProfile(name, avatarId);

    if (!profile) return;

    setName("");
    setIsCreating(false);
    onSelect(profile);
  }

  return (
    <main className='screen'>
      <div className='topbar'>
        <span />
        {profiles.length > 0 && (
          <button
            className='btn btn--ghost btn--small'
            type='button'
            onClick={() => {
              if (isManaging) {
                setIsManaging(false);
              } else {
                setGateOpen(true);
              }
            }}
          >
            {isManaging ? "Terminé" : "Gérer"}
          </button>
        )}
      </div>

      <h1 className='screen__title'>Qui joue ?</h1>
      <p className='screen__subtitle'>Touche ton avatar pour retrouver ta partie.</p>

      <div className='tiles'>
        {profiles.map((profile) => (
          <button
            key={profile.id}
            className='tile'
            type='button'
            onClick={() => {
              if (isManaging) {
                setToDelete(profile);
              } else {
                onSelect(profile);
              }
            }}
          >
            <span className='tile__emoji'>{getAvatar(profile.avatarId).emoji}</span>
            <span className='tile__name'>{profile.name}</span>
            <span className='tile__meta'>
              {isManaging ? "Supprimer" : `⭐ ${profile.stars}`}
            </span>
          </button>
        ))}

        {canCreateProfile() && (
          <button
            className='tile tile--add'
            type='button'
            onClick={() => setIsCreating(true)}
          >
            <span className='tile__emoji'>＋</span>
            <span className='tile__name'>Nouveau joueur</span>
          </button>
        )}
      </div>

      {isCreating && (
        <div className='overlay'>
          <div className='dialog'>
            <h2>Nouveau joueur</h2>

            <input
              className='field'
              value={name}
              maxLength={14}
              placeholder='Ton prénom'
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />

            <div className='avatars' role='radiogroup' aria-label='Avatar'>
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type='button'
                  role='radio'
                  aria-checked={avatar.id === avatarId}
                  aria-label={avatar.label}
                  className={
                    avatar.id === avatarId
                      ? "avatars__item avatars__item--selected"
                      : "avatars__item"
                  }
                  onClick={() => setAvatarId(avatar.id)}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>

            <div className='dialog__actions'>
              <button
                className='btn btn--ghost'
                type='button'
                onClick={() => setIsCreating(false)}
              >
                Annuler
              </button>
              <button
                className='btn'
                type='button'
                disabled={!name.trim()}
                onClick={handleCreate}
              >
                C’est parti !
              </button>
            </div>
          </div>
        </div>
      )}

      {gateOpen && (
        <AdultGate
          title='Gérer les joueurs'
          onCancel={() => setGateOpen(false)}
          onSuccess={() => {
            setGateOpen(false);
            setIsManaging(true);
          }}
        />
      )}

      {toDelete && (
        <div className='overlay'>
          <div className='dialog'>
            <h2>Supprimer {toDelete.name} ?</h2>
            <p style={{ textAlign: "center" }}>
              Sa progression sera effacée définitivement.
            </p>

            <div className='dialog__actions'>
              <button
                className='btn btn--ghost'
                type='button'
                onClick={() => setToDelete(null)}
              >
                Garder
              </button>
              <button
                className='btn'
                type='button'
                onClick={() => {
                  deleteProfile(toDelete.id);
                  setToDelete(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
