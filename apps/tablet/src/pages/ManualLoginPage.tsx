import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db/db";
import "./ManualLoginPage.css";
import { getAvatarImageUrl } from "../data/avatars";

type StudentCard = {
  id: string;
  firstName: string;
  avatarKey: string;
  avatarVariant: string;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ManualLoginPage() {
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentCard[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadStudents = async () => {
      setLoading(true);
      setError(null);

      try {
        const allStudents = await db.students.toArray();

        if (!active) return;

        const cards = allStudents
          .map((student) => ({
            id: student.id,
            firstName: student.firstName,
            avatarKey: student.avatarKey,
            avatarVariant: student.avatarVariant,
          }))
          .sort((a, b) =>
            a.firstName.localeCompare(b.firstName, "fr", {
              sensitivity: "base",
              numeric: true,
            }),
          );

        setStudents(cards);
      } catch (err) {
        console.error("Chargement des élèves impossible :", err);

        if (active) {
          setError("Impossible de charger les profils. Tu peux réessayer.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStudents();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredStudents = useMemo(() => {
    const query = normalize(search);

    if (!query) return students;

    return students.filter((student) =>
      normalize(student.firstName).includes(query),
    );
  }, [students, search]);

  return (
    <main className='manual-adventure'>
      <div className='manual-adventure__shade' />

      <header className='manual-adventure__header'>
        <button
          type='button'
          className='manual-adventure__back'
          onClick={() => navigate("/scan")}
        >
          <span aria-hidden='true'>←</span>
          Accueil
        </button>

        <div className='manual-adventure__heading'>
          <p>Atelier Lecture</p>
          <h1>Choisis ton explorateur</h1>
        </div>
      </header>

      <section
        className='manual-adventure__panel'
        aria-label='Sélection de ton profil'
      >
        <div className='manual-adventure__toolbar'>
          <div className='manual-adventure__intro'>
            <h2>Quel est ton prénom ?</h2>
            <p>Touche ta carte pour rejoindre l’aventure.</p>
          </div>

          <div className='manual-adventure__search'>
            <label
              htmlFor='student-search'
              className='manual-adventure__sr-only'
            >
              Rechercher ton prénom
            </label>

            <span className='manual-adventure__search-icon' aria-hidden='true'>
              ⌕
            </span>

            <input
              id='student-search'
              type='search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Écris ton prénom…'
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='words'
              spellCheck={false}
              enterKeyHint='search'
            />

            {search && (
              <button
                type='button'
                className='manual-adventure__clear'
                onClick={() => setSearch("")}
                aria-label='Effacer la recherche'
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className='manual-adventure__list' aria-busy={loading}>
          {loading ? (
            <div className='manual-adventure__message' role='status'>
              <span aria-hidden='true'>✦</span>
              <h2>Préparation des explorateurs…</h2>
            </div>
          ) : error ? (
            <div className='manual-adventure__message' role='alert'>
              <h2>Un petit contretemps !</h2>
              <p>{error}</p>

              <button
                type='button'
                className='manual-adventure__retry'
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Réessayer
              </button>
            </div>
          ) : students.length === 0 ? (
            <div className='manual-adventure__message'>
              <span aria-hidden='true'>🧭</span>
              <h2>Aucun profil sur cette tablette</h2>
              <p>Demande à ton enseignant de préparer les élèves.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className='manual-adventure__message' role='status'>
              <span aria-hidden='true'>⌕</span>
              <h2>Aucun prénom trouvé</h2>
              <p>Essaie avec les premières lettres de ton prénom.</p>

              <button
                type='button'
                className='manual-adventure__retry'
                onClick={() => setSearch("")}
              >
                Voir tous les explorateurs
              </button>
            </div>
          ) : (
            <div className='manual-adventure__grid'>
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type='button'
                  className='explorer-card'
                  onClick={() =>
                    navigate(`/confirm/${encodeURIComponent(student.id)}`)
                  }
                >
                  <span className='explorer-card__portrait' aria-hidden='true'>
                    <img
                      key={`${student.avatarKey}-${student.avatarVariant}`}
                      src={getAvatarImageUrl(
                        student.avatarKey,
                        student.avatarVariant,
                      )}
                      alt=''
                      draggable={false}
                      className='explorer-card__avatar'
                      onError={(event) => {
                        const image = event.currentTarget;

                        console.warn(
                          `Avatar introuvable pour ${student.firstName} :`,
                          image.src,
                        );

                        image.style.display = "none";
                      }}
                    />
                  </span>

                  <span className='explorer-card__name'>
                    {student.firstName}
                  </span>

                  <span className='explorer-card__description'>
                    {student.avatarKey} {student.avatarVariant}
                  </span>

                  <span className='explorer-card__action' aria-hidden='true'>
                    C’est moi !
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className='manual-adventure__footer'>
          <span role='status'>
            {!loading &&
              !error &&
              `${filteredStudents.length} explorateur${
                filteredStudents.length > 1 ? "s" : ""
              }`}
          </span>

          <span>Vérifie ton prénom et ton avatar.</span>
        </footer>
      </section>
    </main>
  );
}
