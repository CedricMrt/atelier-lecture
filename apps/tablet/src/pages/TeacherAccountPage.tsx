import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { changePassword } from "../services/teacherApi";
import "./TeacherPages.css";

export default function TeacherAccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setDone(false);

    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmation) {
      setError("Les deux nouveaux mots de passe ne sont pas identiques.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await changePassword(currentPassword, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Changement impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className='teacher-app'>
      <div className='teacher-app__container'>
        <Link className='teacher-back' to='/adulte/eleves'>
          ← Retour aux élèves
        </Link>

        <h1 className='teacher-page-title'>Mon mot de passe</h1>
        <p className='teacher-page-subtitle'>
          Choisis un mot de passe d’au moins 8 caractères.
        </p>

        <form
          className='teacher-form teacher-new-student'
          onSubmit={handleSubmit}
        >
          <label className='teacher-field'>
            <span className='teacher-field__label'>Mot de passe actuel</span>
            <input
              className='teacher-input'
              type='password'
              autoComplete='current-password'
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>

          <label className='teacher-field'>
            <span className='teacher-field__label'>Nouveau mot de passe</span>
            <input
              className='teacher-input'
              type='password'
              autoComplete='new-password'
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>

          <label className='teacher-field'>
            <span className='teacher-field__label'>
              Nouveau mot de passe (encore une fois)
            </span>
            <input
              className='teacher-input'
              type='password'
              autoComplete='new-password'
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>

          {error && <p className='teacher-alert'>{error}</p>}
          {done && (
            <p className='teacher-success'>Mot de passe modifié.</p>
          )}

          <button
            className='teacher-button teacher-button--primary'
            type='submit'
            disabled={isSaving}
          >
            {isSaving ? "Enregistrement…" : "Changer le mot de passe"}
          </button>
        </form>
      </div>
    </main>
  );
}
