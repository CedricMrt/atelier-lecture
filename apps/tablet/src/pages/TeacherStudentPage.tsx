import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchStudentDetail, type StudentDetail } from "../services/teacherApi";

export default function TeacherStudentPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <main>
        <p>Élève introuvable.</p>
        <Link to='/adulte/eleves'>Retour à la liste des élèves</Link>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <p>{error}</p>
        <Link to='/adulte/eleves'>Retour à la liste des élèves</Link>
      </main>
    );
  }

  if (!student) {
    return <p>Chargement de la fiche élève…</p>;
  }

  return (
    <main>
      <p>
        <Link to='/adulte/eleves'>← Retour à la liste des élèves</Link>
      </p>

      <h1>{student.student.displayName}</h1>

      {student.sessions.length === 0 ? (
        <p>Aucune séance enregistrée pour cet élève.</p>
      ) : (
        student.sessions.map((session) => (
          <section key={session.sessionId}>
            <h2>
              Séance du{" "}
              {new Date(session.startedAt).toLocaleDateString("fr-FR")}
            </h2>

            <ul>
              {session.activities.map((activity) => (
                <li key={activity.activityCode}>
                  <strong>{activity.activityCode}</strong> —{" "}
                  {activity.correctCount}/{activity.roundsTotal} réussites,{" "}
                  {activity.hintsUsed} aide(s)
                </li>
              ))}
            </ul>

            <p>
              <Link
                to={`/adulte/eleves/${student.student.studentId}/seances/${session.sessionId}`}
              >
                Voir le détail de la séance
              </Link>
            </p>
          </section>
        ))
      )}
    </main>
  );
}
