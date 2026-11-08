import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  logoutTeacher,
  fetchStudents,
  deleteStudent,
  type Student,
} from "../services/teacherApi.js";
import type { TeacherProfile } from "../services/teacherApi";
import NewStudentForm from "../components/NewStudentForm";
import { getAvatarImageUrl } from "../data/avatars";
import "./TeacherPages.css";

type TeacherContext = {
  teacher: TeacherProfile;
};

export default function TeacherStudentsPage() {
  const { teacher } = useOutletContext<TeacherContext>();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const navigate = useNavigate();

  async function reloadStudents() {
    try {
      setStudents(await fetchStudents());
    } catch {
      setActionError("La liste des élèves n’a pas pu être actualisée.");
    }
  }

  async function handleDelete(student: Student) {
    const confirmed = window.confirm(
      `Supprimer ${student.displayName} ? Cette action est définitive.`,
    );

    if (!confirmed) return;

    setActionError(null);

    try {
      await deleteStudent(student.studentId);
      await reloadStudents();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Suppression impossible.",
      );
    }
  }

  async function handleLogout() {
    await logoutTeacher();
    navigate("/adulte/connexion");
  }

  useEffect(() => {
    let isActive = true;

    async function loadStudents() {
      try {
        const result = await fetchStudents();

        if (isActive) {
          setStudents(result);
        }
      } catch {
        if (isActive) {
          setError(
            "Le serveur est inaccessible ou l’accès enseignant est refusé.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return <p>Chargement des élèves…</p>;
  }

  if (error) {
    return (
      <main>
        <p>{error}</p>
        <Link to='/adulte/connexion'>Aller à la connexion</Link>
      </main>
    );
  }

  return (
    <main className='teacher-app'>
      <div className='teacher-app__container'>
        <header className='teacher-header'>
          <div className='teacher-header__brand'>
            <p className='teacher-header__eyebrow'>Atelier Lecture</p>
            <p className='teacher-header__title'>Espace enseignant</p>
          </div>

          <div className='teacher-header__user'>
            <p className='teacher-header__name'>
              Connectée : {teacher.displayName}
            </p>

            <button
              className='teacher-button teacher-button--danger'
              type='button'
              onClick={handleLogout}
            >
              Se déconnecter
            </button>
          </div>
        </header>

        <div className='teacher-toolbar'>
          <div>
            <h1 className='teacher-page-title'>Suivi des élèves</h1>
            <p className='teacher-page-subtitle'>
              Ajoute tes élèves, imprime leurs cartes QR, puis consulte leurs
              séances et leurs résultats.
            </p>
          </div>

          <Link
            className='teacher-button teacher-button--secondary'
            to='/adulte/cartes'
          >
            Imprimer les cartes
          </Link>
        </div>

        <NewStudentForm onCreated={() => void reloadStudents()} />

        {actionError && <p className='teacher-alert'>{actionError}</p>}

        {students.length === 0 ? (
          <div className='teacher-empty'>
            Aucun élève pour le moment : ajoute le premier ci-dessus.
          </div>
        ) : (
          <div className='teacher-students__grid'>
            {students.map((student) => (
              <article className='teacher-student-card' key={student.studentId}>
                <div className='teacher-student-card__top'>
                  {student.avatarKey && student.avatarVariant && (
                    <img
                      className='teacher-student-card__avatar'
                      src={getAvatarImageUrl(
                        student.avatarKey,
                        student.avatarVariant,
                      )}
                      alt=''
                    />
                  )}

                  <h2 className='teacher-student-card__name'>
                    {student.displayName}
                  </h2>
                </div>

                <p className='teacher-student-card__meta'>
                  Consulte les séances, réussites et difficultés.
                </p>

                <div className='teacher-student-card__actions'>
                  <Link
                    className='teacher-button teacher-button--secondary teacher-student-card__link'
                    to={`/adulte/eleves/${student.studentId}`}
                  >
                    Voir le suivi
                  </Link>

                  <button
                    className='teacher-button teacher-button--danger'
                    type='button'
                    onClick={() => void handleDelete(student)}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
