import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TeacherPages.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/adulte/eleves";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/enseignant/connexion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Connexion impossible.");
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className='teacher-app teacher-login'>
      <section className='teacher-login__card'>
        <p className='teacher-login__eyebrow'>Atelier Lecture</p>
        <h1 className='teacher-login__title'>Espace enseignant</h1>
        <p className='teacher-login__subtitle'>
          Connecte-toi pour consulter le suivi des élèves.
        </p>

        <form className='teacher-form' onSubmit={handleSubmit}>
          <label className='teacher-field'>
            <span className='teacher-field__label'>Identifiant</span>
            <input
              className='teacher-input'
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete='username'
            />
          </label>

          <label className='teacher-field'>
            <span className='teacher-field__label'>Mot de passe</span>
            <input
              className='teacher-input'
              type='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='current-password'
            />
          </label>

          {error && (
            <p className='teacher-alert' role='alert'>
              {error}
            </p>
          )}

          <button
            className='teacher-button teacher-button--primary'
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}
