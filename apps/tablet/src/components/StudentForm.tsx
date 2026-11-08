import { useState, type FormEvent } from "react";
import { AVATAR_CHOICES, getAvatarImageUrl } from "../data/avatars";
import type { NewStudentInput } from "../services/teacherApi";

type StudentFormProps = {
  title: string;
  submitLabel: string;
  initial?: NewStudentInput;
  /** Remet le formulaire à zéro après un enregistrement réussi (création). */
  clearOnSuccess?: boolean;
  onSubmit: (input: NewStudentInput) => Promise<void>;
};

function findAvatarIndex(initial?: NewStudentInput): number {
  if (!initial) return 0;

  const index = AVATAR_CHOICES.findIndex(
    (choice) =>
      choice.avatarKey === initial.avatarKey &&
      choice.avatarVariant === initial.avatarVariant,
  );

  return index >= 0 ? index : 0;
}

export default function StudentForm({
  title,
  submitLabel,
  initial,
  clearOnSuccess = false,
  onSubmit,
}: StudentFormProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  // En modification, le prénom existant ne doit pas être écrasé automatiquement.
  const [firstNameEdited, setFirstNameEdited] = useState(Boolean(initial));
  const [avatarIndex, setAvatarIndex] = useState(() =>
    findAvatarIndex(initial),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleFullNameChange(value: string) {
    setFullName(value);
    setSaved(false);

    // Le prénom se remplit tout seul (premier mot) tant qu'on ne l'a pas modifié.
    if (!firstNameEdited) {
      setFirstName(value.trim().split(/\s+/)[0] ?? "");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const avatar = AVATAR_CHOICES[avatarIndex];

    if (!fullName.trim() || !firstName.trim()) {
      setError("Renseigne le nom complet et le prénom affiché.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      await onSubmit({
        fullName: fullName.trim(),
        firstName: firstName.trim(),
        avatarKey: avatar.avatarKey,
        avatarVariant: avatar.avatarVariant,
      });

      if (clearOnSuccess) {
        setFullName("");
        setFirstName("");
        setFirstNameEdited(false);
        setAvatarIndex((current) => (current + 1) % AVATAR_CHOICES.length);
      } else {
        setSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className='teacher-form teacher-new-student' onSubmit={handleSubmit}>
      <h2 className='teacher-section-title'>{title}</h2>

      <div className='teacher-new-student__fields'>
        <label className='teacher-field'>
          <span className='teacher-field__label'>
            Nom complet (visible seulement ici)
          </span>
          <input
            className='teacher-input'
            value={fullName}
            maxLength={60}
            onChange={(event) => handleFullNameChange(event.target.value)}
            placeholder='Ex. Léa Martin'
          />
        </label>

        <label className='teacher-field'>
          <span className='teacher-field__label'>
            Prénom affiché sur la tablette
          </span>
          <input
            className='teacher-input'
            value={firstName}
            maxLength={60}
            onChange={(event) => {
              setFirstNameEdited(true);
              setSaved(false);
              setFirstName(event.target.value);
            }}
            placeholder='Ex. Léa'
          />
        </label>
      </div>

      <div className='teacher-field'>
        <span className='teacher-field__label'>Avatar</span>

        <div className='teacher-avatars' role='radiogroup' aria-label='Avatar'>
          {AVATAR_CHOICES.map((choice, index) => (
            <button
              key={`${choice.avatarKey}-${choice.avatarVariant}`}
              type='button'
              role='radio'
              aria-checked={index === avatarIndex}
              aria-label={choice.label}
              title={choice.label}
              className={
                index === avatarIndex
                  ? "teacher-avatars__item teacher-avatars__item--selected"
                  : "teacher-avatars__item"
              }
              onClick={() => {
                setSaved(false);
                setAvatarIndex(index);
              }}
            >
              <img
                src={getAvatarImageUrl(choice.avatarKey, choice.avatarVariant)}
                alt=''
              />
            </button>
          ))}
        </div>
      </div>

      {error && <p className='teacher-alert'>{error}</p>}
      {saved && <p className='teacher-success'>Modifications enregistrées.</p>}

      <button
        className='teacher-button teacher-button--primary'
        type='submit'
        disabled={isSaving}
      >
        {isSaving ? "Enregistrement…" : submitLabel}
      </button>
    </form>
  );
}
