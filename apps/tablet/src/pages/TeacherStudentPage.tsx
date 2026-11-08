import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StudentForm from "../components/StudentForm";
import {
  fetchStudentDetail,
  regenerateStudentCard,
  updateStudent,
  type StudentDetail,
} from "../services/teacherApi";
import "./TeacherPages.css";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TeacherStudentPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleRegenerateCard() {
    const confirmed = window.confirm(
      "Créer une nouvelle carte pour cet élève ? L’ancienne carte ne fonctionnera plus.",
    );

    if (!confirmed || !studentId) return;

    setCardError(null);

    try {
      await regenerateStudentCard(studentId);
      navigate(`/adulte/cartes?eleve=${encodeURIComponent(studentId)}`);
    } catch (err) {
      setCardError(
        err instanceof Error ? err.message : "Régénération impossible.",
      );
    }
  }

  useEffect(() => {
    if (!studentId) {
      return;
    }

    let isActive = true;

    async function loadStudent() {
      try {
        const result = await fetchStudentDetail(studentId!);

        if (isActive) {
          setStudent(result);
        }
      } catch {
        if (isActive) {
          setError("Impossible de charger la fiche de cet élève.");
        }
      }
    }

    loadStudent();

    return () => {
      isActive = false;
    };
  }, [studentId]);

  if (!studentId) {
    return (
      <main className='teacher-app'>
        <div className='teacher-app__container'>
          <div className='teacher-empty'>
            <p>Élève introuvable.</p>

            <Link className='teacher-back' to='/adulte/eleves'>
              ← Retour à la liste des élèves
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='teacher-app'>
        <div className='teacher-app__container'>
          <div className='teacher-empty'>
            <p>{error}</p>

            <Link className='teacher-back' to='/adulte/eleves'>
              ← Retour à la liste des élèves
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className='teacher-app'>
        <div className='teacher-app__container'>
          <p>Chargement de la fiche élève…</p>
        </div>
      </main>
    );
  }

  const sessions = student.sessions;

  const totalRounds = sessions.reduce(
    (total, session) =>
      total +
      session.activities.reduce(
        (activityTotal, activity) => activityTotal + activity.roundsTotal,
        0,
      ),
    0,
  );

  const totalCorrect = sessions.reduce(
    (total, session) =>
      total +
      session.activities.reduce(
        (activityTotal, activity) => activityTotal + activity.correctCount,
        0,
      ),
    0,
  );

  const totalHints = sessions.reduce(
    (total, session) =>
      total +
      session.activities.reduce(
        (activityTotal, activity) => activityTotal + activity.hintsUsed,
        0,
      ),
    0,
  );

  const globalSuccessRate =
    totalRounds > 0 ? Math.round((totalCorrect / totalRounds) * 100) : 0;

  return (
    <main className='teacher-app'>
      <div className='teacher-app__container'>
        <Link className='teacher-back' to='/adulte/eleves'>
          ← Retour à la liste des élèves
        </Link>

        <h1 className='teacher-page-title'>{student.student.displayName}</h1>
        <p className='teacher-page-subtitle'>
          Suivi des séances, réussites et difficultés.
        </p>

        <details className='teacher-manage'>
          <summary className='teacher-manage__summary'>
            Gérer l’élève (nom, avatar, carte)
          </summary>

          <StudentForm
            title='Modifier l’élève'
            submitLabel='Enregistrer'
            initial={{
              fullName: student.student.displayName,
              firstName: student.student.firstName ?? "",
              avatarKey: student.student.avatarKey ?? "",
              avatarVariant: student.student.avatarVariant ?? "",
            }}
            onSubmit={async (input) => {
              const card = await updateStudent(studentId, input);

              setStudent((current) =>
                current
                  ? {
                      ...current,
                      student: {
                        ...current.student,
                        displayName: card.fullName,
                        firstName: card.firstName,
                        avatarKey: card.avatarKey,
                        avatarVariant: card.avatarVariant,
                      },
                    }
                  : current,
              );
            }}
          />

          <div className='teacher-manage__cards'>
            <Link
              className='teacher-button teacher-button--secondary'
              to={`/adulte/cartes?eleve=${encodeURIComponent(studentId)}`}
            >
              Imprimer sa carte
            </Link>

            <button
              className='teacher-button teacher-button--danger'
              type='button'
              onClick={() => void handleRegenerateCard()}
            >
              Carte perdue : en créer une nouvelle
            </button>
          </div>

          {cardError && <p className='teacher-alert'>{cardError}</p>}
        </details>

        <div className='teacher-summary'>
          <article className='teacher-stat'>
            <p className='teacher-stat__label'>Séances</p>
            <p className='teacher-stat__value'>{sessions.length}</p>
          </article>

          <article className='teacher-stat'>
            <p className='teacher-stat__label'>Réussite globale</p>
            <p className='teacher-stat__value'>{globalSuccessRate} %</p>
            <p className='teacher-stat__detail'>
              {totalCorrect} réussites sur {totalRounds} réponses
            </p>
          </article>

          <article className='teacher-stat'>
            <p className='teacher-stat__label'>Aides utilisées</p>
            <p className='teacher-stat__value'>{totalHints}</p>
          </article>
        </div>

        {sessions.length === 0 ? (
          <div className='teacher-empty'>
            Aucune séance enregistrée pour cet élève.
          </div>
        ) : (
          <div className='teacher-students__grid'>
            {sessions.map((session) => {
              const sessionRounds = session.activities.reduce(
                (total, activity) => total + activity.roundsTotal,
                0,
              );

              const sessionCorrect = session.activities.reduce(
                (total, activity) => total + activity.correctCount,
                0,
              );

              const sessionSuccessRate =
                sessionRounds > 0
                  ? Math.round((sessionCorrect / sessionRounds) * 100)
                  : 0;

              return (
                <article
                  className='teacher-student-card'
                  key={session.sessionId}
                >
                  <h2 className='teacher-student-card__name'>
                    Séance du {formatDate(session.startedAt)}
                  </h2>

                  <p className='teacher-student-card__meta'>
                    {sessionCorrect}/{sessionRounds} réussites ·{" "}
                    {sessionSuccessRate} % de réussite
                  </p>

                  <ul className='teacher-session-activities'>
                    {session.activities.map((activity) => (
                      <li key={activity.activityCode}>
                        <strong>{activity.activityCode}</strong>
                        <br />
                        {activity.correctCount}/{activity.roundsTotal} réussites
                        · {activity.hintsUsed} aide(s)
                      </li>
                    ))}
                  </ul>

                  <Link
                    className='teacher-button teacher-button--secondary teacher-student-card__link'
                    to={`/adulte/eleves/${student.student.studentId}/seances/${session.sessionId}`}
                  >
                    Voir le détail
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
