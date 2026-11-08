import { useState, type FormEvent } from "react";
import { AVATAR_CHOICES, getAvatarImageUrl } from "../data/avatars";
import { createStudent, type StudentCard } from "../services/teacherApi";

type NewStudentFormProps = {
  onCreated: (card: StudentCard) => void;
};

export default function NewStudentForm({ onCreated }: NewStudentFormProps) {
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [firstNameEdited, setFirstNameEdited] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFullNameChange(value: string) {
    setFullName(value);

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

    try {
      const card = await createStudent({
        fullName: fullName.trim(),
        firstName: firstName.trim(),
        avatarKey: avatar.avatarKey,
        avatarVariant: avatar.avatarVariant,
      });

      setFullName("");
      setFirstName("");
      setFirstNameEdited(false);
      setAvatarIndex((current) => (current + 1) % AVATAR_CHOICES.length);

      onCreated(card);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className='teacher-form teacher-new-student' onSubmit={handleSubmit}>
      <h2 className='teacher-section-title'>Ajouter un élève</h2>

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
              onClick={() => setAvatarIndex(index)}
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

      <button
        className='teacher-button teacher-button--primary'
        type='submit'
        disabled={isSaving}
      >
        {isSaving ? "Création…" : "Ajouter l’élève"}
      </button>
    </form>
  );
}
