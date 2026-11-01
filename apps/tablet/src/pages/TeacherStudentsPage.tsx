import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  logoutTeacher,
  fetchStudents,
  type Student,
} from "../services/teacherApi.js";
import type { TeacherProfile } from "../services/teacherApi";
import "./TeacherPages.css";

type TeacherContext = {
  teacher: TeacherProfile;
};

export default function TeacherStudentsPage() {
  const { teacher } = useOutletContext<TeacherContext>();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

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

        <h1 className='teacher-page-title'>Suivi des élèves</h1>
        <p className='teacher-page-subtitle'>
          Sélectionne un élève pour consulter ses séances et ses résultats.
        </p>

        {students.length === 0 ? (
          <div className='teacher-empty'>
            Aucun élève synchronisé pour le moment.
          </div>
        ) : (
          <div className='teacher-students__grid'>
            {students.map((student) => (
              <article className='teacher-student-card' key={student.studentId}>
                <h2 className='teacher-student-card__name'>
                  {student.displayName}
                </h2>

                <p className='teacher-student-card__meta'>
                  Consulte les séances, réussites et difficultés.
                </p>

                <Link
                  className='teacher-button teacher-button--secondary teacher-student-card__link'
                  to={`/adulte/eleves/${student.studentId}`}
                >
                  Voir le suivi
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
