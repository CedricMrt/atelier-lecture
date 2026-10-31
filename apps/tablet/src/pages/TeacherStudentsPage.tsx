import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStudents, type Student } from "../services/teacherApi.js";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return <p>{error}</p>;
  }

  return (
    <main>
      <h1>Espace enseignant</h1>
      <p>Sélectionne un élève pour consulter son suivi.</p>

      <ul>
        {students.map((student) => (
          <li key={student.studentId}>
            <Link to={`/adulte/eleves/${student.studentId}`}>
              {student.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
